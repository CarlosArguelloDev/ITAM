package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"opti-itam/internal/models"
)

type DepartmentSummary struct {
	Name         string `json:"name"`
	TotalAssets  int    `json:"total_assets"`
	DirectAssets int    `json:"direct_assets"`
	UserAssets   int    `json:"user_assets"`
	UsersCount   int    `json:"users_count"`
	IsSite       bool   `json:"is_site"`
}

type DepartmentUserGroup struct {
	User   models.User    `json:"user"`
	Assets []models.Asset `json:"assets"`
}

type DepartmentDiagramResponse struct {
	Department   string                `json:"department"`
	DirectAssets []models.Asset        `json:"direct_assets"`
	UserGroups   []DepartmentUserGroup `json:"user_groups"`
	Nodes        []models.DiagramNode  `json:"nodes"`
	Edges        []models.DiagramEdge  `json:"edges"`
	Summary      map[string]int        `json:"summary"`
}

type AssignDepartmentRequest struct {
	AssetID    string `json:"asset_id"`
	Department string `json:"department"`
	Location   string `json:"location"`
	Status     string `json:"status"`
	Notes      string `json:"notes"`
}

type CreateDepartmentRequest struct {
	Name string `json:"name"`
}

func isSiteDepartment(name string) bool {
	u := strings.ToUpper(strings.TrimSpace(name))
	return strings.Contains(u, "SITE") || strings.Contains(u, "BODEGA") || strings.Contains(u, "STOCK") || strings.Contains(u, "RACK") || u == "IT"
}

// ListDepartmentSummaries devuelve departamentos y sitios/bodegas con conteos de activos directos vs en colaboradores
func (h *AppHandler) ListDepartmentSummaries(w http.ResponseWriter, r *http.Request) {
	deptSet := make(map[string]*DepartmentSummary)

	ensureDept := func(name string) *DepartmentSummary {
		clean := strings.TrimSpace(name)
		if clean == "" {
			clean = "GENERAL"
		}
		if d, ok := deptSet[clean]; ok {
			return d
		}
		d := &DepartmentSummary{
			Name:   clean,
			IsSite: isSiteDepartment(clean),
		}
		deptSet[clean] = d
		return d
	}

	if rows, err := h.DB.Query(`SELECT name FROM departments ORDER BY name ASC`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var name string
			if err := rows.Scan(&name); err == nil {
				ensureDept(name)
			}
		}
	}

	if rows, err := h.DB.Query(`
		SELECT COALESCE(NULLIF(TRIM(department), ''), 'GENERAL') AS dept,
		       COUNT(*) AS total,
		       SUM(CASE WHEN assigned_to_user_id IS NULL OR assigned_to_user_id = '' THEN 1 ELSE 0 END) AS direct_cnt,
		       SUM(CASE WHEN assigned_to_user_id IS NOT NULL AND assigned_to_user_id != '' THEN 1 ELSE 0 END) AS user_cnt
		FROM assets
		WHERE status != 'RETIRED'
		GROUP BY dept
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var dept string
			var total, directCnt, userCnt int
			if err := rows.Scan(&dept, &total, &directCnt, &userCnt); err == nil {
				d := ensureDept(dept)
				d.TotalAssets = total
				d.DirectAssets = directCnt
				d.UserAssets = userCnt
			}
		}
	}

	if rows, err := h.DB.Query(`
		SELECT COALESCE(NULLIF(TRIM(department), ''), 'GENERAL') AS dept, COUNT(*)
		FROM users
		WHERE is_active = 1
		GROUP BY dept
	`); err == nil {
		defer rows.Close()
		for rows.Next() {
			var dept string
			var cnt int
			if err := rows.Scan(&dept, &cnt); err == nil {
				d := ensureDept(dept)
				d.UsersCount = cnt
			}
		}
	}

	result := make([]DepartmentSummary, 0, len(deptSet))
	for _, d := range deptSet {
		result = append(result, *d)
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Name < result[j].Name
	})

	JSONResponse(w, http.StatusOK, result)
}

// CreateDepartment registra un nuevo departamento o bodega/site
func (h *AppHandler) CreateDepartment(w http.ResponseWriter, r *http.Request) {
	var req CreateDepartmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}
	name := strings.ToUpper(strings.TrimSpace(req.Name))
	if name == "" {
		ErrorResponse(w, http.StatusBadRequest, "El nombre del departamento o site es obligatorio")
		return
	}

	id := "dep-" + uuid.New().String()[:8]
	_, err := h.DB.Exec(`INSERT INTO departments (id, name) VALUES (?, ?)`, id, name)
	if err != nil {
		ErrorResponse(w, http.StatusConflict, "El departamento o site ya existe")
		return
	}

	JSONResponse(w, http.StatusCreated, map[string]string{"id": id, "name": name})
}

// AssignAssetToDepartment asigna un activo directamente a un departamento o bodega/site (desvinculando usuario)
func (h *AppHandler) AssignAssetToDepartment(w http.ResponseWriter, r *http.Request) {
	var req AssignDepartmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}
	dept := strings.TrimSpace(req.Department)
	if req.AssetID == "" || dept == "" {
		ErrorResponse(w, http.StatusBadRequest, "asset_id y department son obligatorios")
		return
	}

	var prevUserID *string
	var currentLoc string
	err := h.DB.QueryRow(`SELECT assigned_to_user_id, location FROM assets WHERE id = ?`, req.AssetID).Scan(&prevUserID, &currentLoc)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activo: "+err.Error())
		return
	}

	loc := strings.TrimSpace(req.Location)
	if loc != "OPM" && loc != "OMEX" {
		if currentLoc == "OPM" || currentLoc == "OMEX" {
			loc = currentLoc
		} else {
			loc = "OPM"
		}
	}

	status := strings.TrimSpace(req.Status)
	if status == "" {
		if isSiteDepartment(dept) {
			status = models.StatusAvailable
		} else {
			status = models.StatusAssigned
		}
	}

	// Asegurar que exista en departments
	_, _ = h.DB.Exec(`INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)`, "dep-"+uuid.New().String()[:8], dept)

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE assets
		SET department = ?, location = ?, status = ?, assigned_to_user_id = NULL, parent_asset_id = NULL
		WHERE id = ?
	`, dept, loc, status, req.AssetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al asignar a departamento: "+err.Error())
		return
	}

	notes := strings.TrimSpace(req.Notes)
	if notes == "" {
		notes = fmt.Sprintf("Asignado a departamento/sitio: %s (%s)", dept, status)
	}
	histID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status)
		VALUES (?, ?, 'UPDATE', ?, NULL, ?, 'NOT_REQUIRED')
	`, histID, req.AssetID, prevUserID, notes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error commit: "+err.Error())
		return
	}

	h.getAssetByIDOrTag(w, "a.id = ?", req.AssetID)
}

// GetDepartmentDiagram devuelve activos directos del departamento/site y los diagramas separados de sus colaboradores
func (h *AppHandler) GetDepartmentDiagram(w http.ResponseWriter, r *http.Request) {
	rawName := chi.URLParam(r, "name")
	deptName, err := url.PathUnescape(rawName)
	if err != nil {
		deptName = rawName
	}
	deptName = strings.TrimSpace(deptName)
	if deptName == "" {
		ErrorResponse(w, http.StatusBadRequest, "Nombre de departamento requerido")
		return
	}

	rows, err := h.DB.Query(`
		SELECT a.id, a.asset_tag, a.serial_number, a.category, a.brand, a.model, a.status,
		       a.assigned_to_user_id, a.parent_asset_id, pa.asset_tag AS parent_asset_tag,
		       a.location, a.department, a.specs, a.warranty_expiry, a.last_audited_at, a.created_at
		FROM assets a
		LEFT JOIN assets pa ON a.parent_asset_id = pa.id
		WHERE a.department = ? AND a.status != 'RETIRED'
		ORDER BY a.category ASC, a.asset_tag ASC
	`, deptName)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activos del departamento: "+err.Error())
		return
	}
	defer rows.Close()

	directAssets := []models.Asset{}
	userAssetsMap := make(map[string][]models.Asset)

	for rows.Next() {
		var a models.Asset
		var specsStr string
		var lastAuditedStr *string
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
			&a.AssignedToUserID, &a.ParentAssetID, &a.ParentAssetTag,
			&a.Location, &a.Department, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
		); err != nil {
			continue
		}
		a.LastAuditedAt = ParseNullTime(lastAuditedStr)
		a.Specs = json.RawMessage(specsStr)

		if a.AssignedToUserID == nil || *a.AssignedToUserID == "" {
			directAssets = append(directAssets, a)
		} else {
			uid := *a.AssignedToUserID
			userAssetsMap[uid] = append(userAssetsMap[uid], a)
		}
	}

	// Cargar usuarios que tienen activos en este departamento
	userGroups := []DepartmentUserGroup{}
	for uid, uAssets := range userAssetsMap {
		var u models.User
		var isActiveInt int
		err := h.DB.QueryRow(`
			SELECT id, employee_code, full_name, email, department, COALESCE(position, ''), location, is_active, created_at
			FROM users WHERE id = ?
		`, uid).Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Position, &u.Location, &isActiveInt, &u.CreatedAt)
		if err != nil {
			continue
		}
		u.IsActive = isActiveInt == 1
		userGroups = append(userGroups, DepartmentUserGroup{
			User:   u,
			Assets: uAssets,
		})
	}
	sort.Slice(userGroups, func(i, j int) bool {
		return userGroups[i].User.FullName < userGroups[j].User.FullName
	})

	// Construir tablero React Flow:
	// Bloque izquierdo: Nodo raíz del Departamento/Site -> Activos asignados directamente al Depto/Site
	// Bloques separados a la derecha (en carriles verticales): Diagrama individual de cada colaborador del departamento
	nodes := []models.DiagramNode{}
	edges := []models.DiagramEdge{}

	deptNodeID := fmt.Sprintf("node-dept-%s", deptName)
	directCols := 3
	if len(directAssets) <= 2 {
		directCols = 2
	}
	deptCenterX := 280.0
	nodes = append(nodes, models.DiagramNode{
		ID:       deptNodeID,
		Type:     "deptNode",
		Position: models.NodePosition{X: deptCenterX, Y: 40},
		Data: map[string]interface{}{
			"name":         deptName,
			"is_site":      isSiteDepartment(deptName),
			"direct_count": len(directAssets),
			"users_count":  len(userGroups),
		},
	})

	for idx, a := range directAssets {
		col := idx % directCols
		row := idx / directCols
		x := 40.0 + float64(col)*260.0
		y := 220.0 + float64(row)*160.0

		nodeType := "peripheralNode"
		if a.Category == "LAPTOP" || a.Category == "WORKSTATION" {
			nodeType = "laptopNode"
		} else if a.Category == "TELEFONO" || a.Category == "IPAD" || a.Category == "SCANNER" || a.Category == "TELEFONO FIJO" || a.Category == "GOPRO" {
			nodeType = "phoneNode"
		}

		assetNodeID := fmt.Sprintf("node-dept-ast-%s", a.ID)
		nodes = append(nodes, models.DiagramNode{
			ID:       assetNodeID,
			Type:     nodeType,
			Position: models.NodePosition{X: x, Y: y},
			Data: map[string]interface{}{
				"asset":      a,
				"asset_id":   a.ID,
				"asset_tag":  a.AssetTag,
				"category":   a.Category,
				"brand":      a.Brand,
				"model":      a.Model,
				"serial":     a.SerialNumber,
				"status":     a.Status,
				"is_audited": a.LastAuditedAt != nil,
			},
		})
		edges = append(edges, models.DiagramEdge{
			ID:       fmt.Sprintf("edge-%s-%s", deptNodeID, assetNodeID),
			Source:   deptNodeID,
			Target:   assetNodeID,
			Animated: true,
		})
	}

	// Bloques separados por cada colaborador del departamento
	isCompPeripheral := func(cat string) bool {
		switch cat {
		case "MONITOR", "DOCKING", "AUDIFONOS", "TECLADO", "MOUSE", "ADAPTADOR DE RED", "QUEMADOR DE CD":
			return true
		default:
			return false
		}
	}
	isDirectDevice := func(a models.Asset) bool {
		if a.ParentAssetID != nil && *a.ParentAssetID != "" {
			return false
		}
		switch a.Category {
		case "LAPTOP", "WORKSTATION", "TELEFONO", "IPAD", "SCANNER", "TELEFONO FIJO", "GOPRO":
			return true
		case "SIM-CARD":
			return false
		default:
			return !isCompPeripheral(a.Category)
		}
	}

	laneStartX := 880.0
	currentY := 40.0

	for _, grp := range userGroups {
		u := grp.User
		uAssets := grp.Assets

		directDevices := []models.Asset{}
		peripherals := []models.Asset{}
		for _, a := range uAssets {
			if isDirectDevice(a) {
				directDevices = append(directDevices, a)
			} else {
				peripherals = append(peripherals, a)
			}
		}

		var primaryCompID, primaryPhoneID string
		for _, d := range directDevices {
			if (d.Category == "LAPTOP" || d.Category == "WORKSTATION") && primaryCompID == "" {
				primaryCompID = d.ID
			}
			if d.Category == "TELEFONO" && primaryPhoneID == "" {
				primaryPhoneID = d.ID
			}
		}

		deviceChildren := make(map[string][]models.Asset)
		orphanPeripherals := []models.Asset{}
		for _, p := range peripherals {
			targetParentID := ""
			if p.ParentAssetID != nil && *p.ParentAssetID != "" {
				targetParentID = *p.ParentAssetID
			} else if p.Category == "SIM-CARD" && primaryPhoneID != "" {
				targetParentID = primaryPhoneID
			} else if isCompPeripheral(p.Category) && primaryCompID != "" {
				targetParentID = primaryCompID
			}
			if targetParentID != "" {
				deviceChildren[targetParentID] = append(deviceChildren[targetParentID], p)
			} else {
				orphanPeripherals = append(orphanPeripherals, p)
			}
		}
		directDevices = append(directDevices, orphanPeripherals...)

		devCount := len(directDevices)
		if devCount == 0 {
			devCount = 1
		}
		blockWidth := float64(devCount) * 280.0
		userNodeID := fmt.Sprintf("node-usr-%s", u.ID)
		userX := laneStartX + blockWidth/2.0 - 110.0

		nodes = append(nodes, models.DiagramNode{
			ID:       userNodeID,
			Type:     "userNode",
			Position: models.NodePosition{X: userX, Y: currentY},
			Data: map[string]interface{}{
				"full_name":     u.FullName,
				"employee_code": u.EmployeeCode,
				"department":    u.Department,
				"location":      u.Location,
				"email":         u.Email,
			},
		})

		maxChildren := 0
		for i, dev := range directDevices {
			devX := laneStartX + float64(i)*280.0
			devY := currentY + 170.0
			devNodeID := fmt.Sprintf("node-ast-%s", dev.ID)

			nType := "peripheralNode"
			if dev.Category == "LAPTOP" || dev.Category == "WORKSTATION" {
				nType = "laptopNode"
			} else if dev.Category == "TELEFONO" || dev.Category == "IPAD" || dev.Category == "SCANNER" || dev.Category == "TELEFONO FIJO" || dev.Category == "GOPRO" {
				nType = "phoneNode"
			}

			nodes = append(nodes, models.DiagramNode{
				ID:       devNodeID,
				Type:     nType,
				Position: models.NodePosition{X: devX, Y: devY},
				Data: map[string]interface{}{
					"asset":      dev,
					"asset_id":   dev.ID,
					"asset_tag":  dev.AssetTag,
					"category":   dev.Category,
					"brand":      dev.Brand,
					"model":      dev.Model,
					"serial":     dev.SerialNumber,
					"status":     dev.Status,
					"is_audited": dev.LastAuditedAt != nil,
				},
			})
			edges = append(edges, models.DiagramEdge{
				ID:       fmt.Sprintf("edge-%s-%s", userNodeID, devNodeID),
				Source:   userNodeID,
				Target:   devNodeID,
				Animated: true,
			})

			children := deviceChildren[dev.ID]
			if len(children) > maxChildren {
				maxChildren = len(children)
			}
			for j, ch := range children {
				chX := devX + float64(j%2)*210.0 - 30.0
				chY := devY + 165.0 + float64(j/2)*135.0
				chNodeID := fmt.Sprintf("node-ast-%s", ch.ID)
				nodes = append(nodes, models.DiagramNode{
					ID:       chNodeID,
					Type:     "peripheralNode",
					Position: models.NodePosition{X: chX, Y: chY},
					Data: map[string]interface{}{
						"asset":      ch,
						"asset_id":   ch.ID,
						"asset_tag":  ch.AssetTag,
						"category":   ch.Category,
						"brand":      ch.Brand,
						"model":      ch.Model,
						"serial":     ch.SerialNumber,
						"status":     ch.Status,
						"is_audited": ch.LastAuditedAt != nil,
					},
				})
				edges = append(edges, models.DiagramEdge{
					ID:     fmt.Sprintf("edge-%s-%s", devNodeID, chNodeID),
					Source: devNodeID,
					Target: chNodeID,
				})
			}
		}

		// Avanzar Y para que el diagrama de la siguiente persona quede separado en el mismo tablero
		childRows := (maxChildren + 1) / 2
		currentY += 380.0 + float64(childRows)*140.0
	}

	userAssetCount := 0
	for _, g := range userGroups {
		userAssetCount += len(g.Assets)
	}

	JSONResponse(w, http.StatusOK, DepartmentDiagramResponse{
		Department:   deptName,
		DirectAssets: directAssets,
		UserGroups:   userGroups,
		Nodes:        nodes,
		Edges:        edges,
		Summary: map[string]int{
			"total":             len(directAssets) + userAssetCount,
			"direct":            len(directAssets),
			"assigned_to_users": userAssetCount,
			"users_count":       len(userGroups),
		},
	})
}
