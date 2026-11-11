package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"opti-itam/internal/models"
)

// ListUsers lista los usuarios del sistema
func (h *AppHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	dept := r.URL.Query().Get("department")
	activeOnly := r.URL.Query().Get("active") == "true"

	query := `
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department, u.location, u.is_active, u.created_at,
		       (SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = u.id AND status != 'RETIRED') AS assets_count,
		       (SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = u.id AND category = 'LAPTOP' AND status != 'RETIRED') AS laptops_count,
		       (SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = u.id AND category = 'MONITOR' AND status != 'RETIRED') AS monitors_count,
		       (SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = u.id AND category = 'DOCKING' AND status != 'RETIRED') AS dockings_count,
		       (SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = u.id AND category = 'PERIPHERAL' AND status != 'RETIRED') AS peripherals_count
		FROM users u
		WHERE 1=1
	`
	args := []interface{}{}

	if search != "" {
		query += " AND (u.full_name LIKE ? OR u.employee_code LIKE ? OR u.email LIKE ?)"
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern, pattern)
	}

	if dept != "" {
		query += " AND u.department = ?"
		args = append(args, dept)
	}

	if activeOnly {
		query += " AND u.is_active = 1"
	}

	query += " ORDER BY u.full_name ASC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar usuarios: "+err.Error())
		return
	}
	defer rows.Close()

	users := []models.User{}
	userIndexMap := make(map[string]int)

	for rows.Next() {
		var u models.User
		var isActiveInt int
		if err := rows.Scan(
			&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt,
			&u.AssetsCount, &u.LaptopsCount, &u.MonitorsCount, &u.DockingsCount, &u.PeripheralsCount,
		); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al escanear usuario: "+err.Error())
			return
		}
		u.IsActive = isActiveInt == 1
		u.AssignedAssets = []models.Asset{}
		userIndexMap[u.ID] = len(users)
		users = append(users, u)
	}

	// Cargar resumen de activos asignados para cada usuario
	if len(users) > 0 {
		assetRows, err := h.DB.Query(`
			SELECT id, asset_tag, serial_number, category, brand, model, status, assigned_to_user_id, location
			FROM assets
			WHERE assigned_to_user_id IS NOT NULL AND status != 'RETIRED'
			ORDER BY CASE category 
				WHEN 'LAPTOP' THEN 1 
				WHEN 'DOCKING' THEN 2 
				WHEN 'MONITOR' THEN 3 
				ELSE 4 END, model ASC
		`)
		if err == nil {
			defer assetRows.Close()
			for assetRows.Next() {
				var ast models.Asset
				var assignedUID string
				if err := assetRows.Scan(&ast.ID, &ast.AssetTag, &ast.SerialNumber, &ast.Category, &ast.Brand, &ast.Model, &ast.Status, &assignedUID, &ast.Location); err == nil {
					ast.AssignedToUserID = &assignedUID
					if idx, ok := userIndexMap[assignedUID]; ok {
						users[idx].AssignedAssets = append(users[idx].AssignedAssets, ast)
					}
				}
			}
		}
	}

	JSONResponse(w, http.StatusOK, users)
}

// GetUser obtiene el detalle de un usuario junto con todos sus activos asignados
func (h *AppHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var u models.User
	var isActiveInt int
	err := h.DB.QueryRow(`
		SELECT id, employee_code, full_name, email, department, location, is_active, created_at
		FROM users
		WHERE id = ?
	`, id).Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Usuario no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al obtener usuario: "+err.Error())
		return
	}
	u.IsActive = isActiveInt == 1

	// Obtener activos asignados
	assetsRows, err := h.DB.Query(`
		SELECT id, asset_tag, serial_number, category, brand, model, status,
		       assigned_to_user_id, parent_asset_id, location, specs, warranty_expiry, last_audited_at, created_at
		FROM assets
		WHERE assigned_to_user_id = ?
		ORDER BY CASE category 
			WHEN 'LAPTOP' THEN 1 
			WHEN 'DOCKING' THEN 2 
			WHEN 'MONITOR' THEN 3 
			ELSE 4 END, model ASC
	`, id)

	if err == nil {
		defer assetsRows.Close()
		u.AssignedAssets = []models.Asset{}
		for assetsRows.Next() {
			var a models.Asset
			var specsStr string
			var lastAuditedStr *string
			if err := assetsRows.Scan(
				&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
				&a.AssignedToUserID, &a.ParentAssetID, &a.Location, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
			); err == nil {
				a.LastAuditedAt = ParseNullTime(lastAuditedStr)
				a.Specs = json.RawMessage(specsStr)
				u.AssignedAssets = append(u.AssignedAssets, a)
			}
		}
	}

	JSONResponse(w, http.StatusOK, u)
}

// CreateUser da de alta un nuevo usuario
func (h *AppHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req models.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if strings.TrimSpace(req.EmployeeCode) == "" || strings.TrimSpace(req.FullName) == "" {
		ErrorResponse(w, http.StatusBadRequest, "El código de empleado y nombre completo son obligatorios")
		return
	}

	newID := "usr-" + uuid.New().String()[:8]
	_, err := h.DB.Exec(`
		INSERT INTO users (id, employee_code, full_name, email, department, location, is_active)
		VALUES (?, ?, ?, ?, ?, ?, 1)
	`, newID, req.EmployeeCode, req.FullName, req.Email, req.Department, req.Location)

	if err != nil {
		ErrorResponse(w, http.StatusConflict, "Error al crear usuario (verifique que el código no esté duplicado): "+err.Error())
		return
	}

	h.GetUserByID(w, newID, http.StatusCreated)
}

// UpdateUser actualiza un usuario existente
func (h *AppHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	activeInt := 0
	if req.IsActive {
		activeInt = 1
	}

	res, err := h.DB.Exec(`
		UPDATE users
		SET employee_code = ?, full_name = ?, email = ?, department = ?, location = ?, is_active = ?
		WHERE id = ?
	`, req.EmployeeCode, req.FullName, req.Email, req.Department, req.Location, activeInt, id)

	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al actualizar usuario: "+err.Error())
		return
	}

	rowsAff, _ := res.RowsAffected()
	if rowsAff == 0 {
		ErrorResponse(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	h.GetUserByID(w, id, http.StatusOK)
}

// DeleteUser desactiva un usuario (soft delete si tiene activos, o borrado si está limpio)
func (h *AppHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var assignedCount int
	err := h.DB.QueryRow("SELECT COUNT(*) FROM assets WHERE assigned_to_user_id = ?", id).Scan(&assignedCount)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al comprobar asignaciones: "+err.Error())
		return
	}

	if assignedCount > 0 {
		// Desactivar usuario
		_, err = h.DB.Exec("UPDATE users SET is_active = 0 WHERE id = ?", id)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al desactivar usuario: "+err.Error())
			return
		}
		JSONResponse(w, http.StatusOK, map[string]interface{}{
			"message": "El usuario posee equipos asignados; ha sido desactivado en lugar de eliminado",
			"status":  "deactivated",
		})
		return
	}

	_, err = h.DB.Exec("DELETE FROM users WHERE id = ?", id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al eliminar usuario: "+err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]string{"message": "Usuario eliminado correctamente"})
}

// GetUserDiagram genera el grafo visual para @xyflow/react
func (h *AppHandler) GetUserDiagram(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Obtener usuario
	var u models.User
	var isActiveInt int
	err := h.DB.QueryRow(`
		SELECT id, employee_code, full_name, email, department, location, is_active, created_at
		FROM users
		WHERE id = ?
	`, id).Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Usuario no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	u.IsActive = isActiveInt == 1

	// Obtener todos los activos asignados al usuario
	rows, err := h.DB.Query(`
		SELECT a.id, a.asset_tag, a.serial_number, a.category, a.brand, a.model, a.status,
		       a.assigned_to_user_id, a.parent_asset_id, p.asset_tag AS parent_asset_tag,
		       a.location, a.specs, a.warranty_expiry, a.last_audited_at, a.created_at
		FROM assets a
		LEFT JOIN assets p ON a.parent_asset_id = p.id
		WHERE a.assigned_to_user_id = ?
		ORDER BY a.category ASC
	`, id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al leer activos: "+err.Error())
		return
	}
	defer rows.Close()

	assignedAssets := []models.Asset{}
	for rows.Next() {
		var a models.Asset
		var specsStr string
		var lastAuditedStr *string
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
			&a.AssignedToUserID, &a.ParentAssetID, &a.ParentAssetTag, &a.Location, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
		); err == nil {
			a.LastAuditedAt = ParseNullTime(lastAuditedStr)
			a.Specs = json.RawMessage(specsStr)
			assignedAssets = append(assignedAssets, a)
		}
	}
	u.AssignedAssets = assignedAssets

	nodes := []models.DiagramNode{}
	edges := []models.DiagramEdge{}
	summary := map[string]int{
		"total":       len(assignedAssets),
		"laptops":     0,
		"phones":      0,
		"dockings":    0,
		"monitors":    0,
		"peripherals": 0,
		"others":      0,
	}

	for _, a := range assignedAssets {
		switch a.Category {
		case models.CategoryLaptop, "WORKSTATION":
			summary["laptops"]++
		case "TELEFONO", "IPAD":
			summary["phones"]++
		case models.CategoryDocking:
			summary["dockings"]++
		case models.CategoryMonitor:
			summary["monitors"]++
		case models.CategoryPeripheral, "AUDIFONOS", "SIM-CARD":
			summary["peripherals"]++
		default:
			summary["others"]++
		}
	}

	// Clasificación inteligente de jerarquía
	isCompPeripheral := func(cat string) bool {
		switch cat {
		case "MONITOR", "DOCKING", "AUDIFONOS", "TECLADO", "MOUSE", "ADAPTADOR DE RED", "QUEMADOR DE CD":
			return true
		default:
			return false
		}
	}

	isDirectDevice := func(a models.Asset) bool {
		// Si tiene parent_asset_id explícito, es hijo de ese activo
		if a.ParentAssetID != nil && *a.ParentAssetID != "" {
			return false
		}
		// Celulares, Laptops, Workstations, iPads, Scanners son equipos directos del colaborador
		switch a.Category {
		case "LAPTOP", "WORKSTATION", "TELEFONO", "IPAD", "SCANNER", "TELEFONO FIJO", "GOPRO":
			return true
		case "SIM-CARD":
			return false
		default:
			return !isCompPeripheral(a.Category)
		}
	}

	// Separar activos directos del usuario vs periféricos
	directDevices := []models.Asset{}
	peripherals := []models.Asset{}

	for _, a := range assignedAssets {
		if isDirectDevice(a) {
			directDevices = append(directDevices, a)
		} else {
			peripherals = append(peripherals, a)
		}
	}

	// Buscar computadora principal y teléfono principal para asignar periféricos huérfanos
	var primaryCompID string
	var primaryPhoneID string
	for _, d := range directDevices {
		if (d.Category == "LAPTOP" || d.Category == "WORKSTATION") && primaryCompID == "" {
			primaryCompID = d.ID
		}
		if d.Category == "TELEFONO" && primaryPhoneID == "" {
			primaryPhoneID = d.ID
		}
	}

	// Mapear hijos por ID de dispositivo padre
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

	// Si hay periféricos huérfanos sin computadora, se muestran directos al usuario
	directDevices = append(directDevices, orphanPeripherals...)

	// Nodo Raíz de Usuario
	userNodeID := fmt.Sprintf("node-usr-%s", u.ID)
	userCenterX := 550.0
	nodes = append(nodes, models.DiagramNode{
		ID:   userNodeID,
		Type: "userNode",
		Position: models.NodePosition{
			X: userCenterX - 110.0,
			Y: 20,
		},
		Data: map[string]interface{}{
			"id":            u.ID,
			"employee_code": u.EmployeeCode,
			"full_name":     u.FullName,
			"department":    u.Department,
			"location":      u.Location,
			"email":         u.Email,
			"total_assets":  len(assignedAssets),
		},
	})

	// Posicionar Dispositivos Directos (Nivel 1)
	numDirect := len(directDevices)
	spacingDirect := 320.0
	startDirectX := userCenterX - (float64(numDirect-1)*spacingDirect)/2.0
	if startDirectX < 30 {
		startDirectX = 30
	}

	for i, dev := range directDevices {
		devNodeID := fmt.Sprintf("node-ast-%s", dev.ID)
		devX := startDirectX + float64(i)*spacingDirect
		devY := 190.0

		// Seleccionar tipo de nodo
		devNodeType := "peripheralNode"
		edgeLabel := "Custodia Directa"
		switch dev.Category {
		case "LAPTOP":
			devNodeType = "laptopNode"
			edgeLabel = "Laptop Principal"
		case "WORKSTATION":
			devNodeType = "laptopNode"
			edgeLabel = "Estación Desktop"
		case "TELEFONO":
			devNodeType = "phoneNode"
			edgeLabel = "Celular Asignado"
		case "IPAD":
			devNodeType = "phoneNode"
			edgeLabel = "Tablet / iPad"
		case "SCANNER":
			devNodeType = "peripheralNode"
			edgeLabel = "Terminal Zebra"
		}

		nodes = append(nodes, models.DiagramNode{
			ID:   devNodeID,
			Type: devNodeType,
			Position: models.NodePosition{
				X: devX - 110.0,
				Y: devY,
			},
			Data: map[string]interface{}{
				"id":            dev.ID,
				"asset_tag":     dev.AssetTag,
				"serial_number": dev.SerialNumber,
				"category":      dev.Category,
				"brand":         dev.Brand,
				"model":         dev.Model,
				"status":        dev.Status,
				"location":      dev.Location,
				"specs":         dev.Specs,
			},
		})

		// Edge Usuario -> Dispositivo Directo
		edges = append(edges, models.DiagramEdge{
			ID:       fmt.Sprintf("edge-usr-%s", dev.ID),
			Source:   userNodeID,
			Target:   devNodeID,
			Label:    edgeLabel,
			Animated: true,
		})

		// Periféricos conectados a este dispositivo (Nivel 2)
		children := deviceChildren[dev.ID]
		numChildren := len(children)
		if numChildren > 0 {
			spacingChild := 230.0
			startChildX := devX - (float64(numChildren-1)*spacingChild)/2.0

			for j, child := range children {
				childNodeID := fmt.Sprintf("node-ast-%s", child.ID)
				childX := startChildX + float64(j)*spacingChild
				childY := 370.0
				if j%2 == 1 {
					childY = 410.0
				}

				childNodeType := "peripheralNode"
				childEdgeLabel := "Conectado"
				switch child.Category {
				case "DOCKING":
					childNodeType = "dockingNode"
					childEdgeLabel = "Replicador Dock"
				case "MONITOR":
					childNodeType = "monitorNode"
					childEdgeLabel = "Pantalla Externa"
				case "AUDIFONOS":
					childNodeType = "peripheralNode"
					childEdgeLabel = "Audio / Headset"
				case "SIM-CARD":
					childNodeType = "peripheralNode"
					childEdgeLabel = "Línea / SIM 5G"
				}

				nodes = append(nodes, models.DiagramNode{
					ID:   childNodeID,
					Type: childNodeType,
					Position: models.NodePosition{
						X: childX - 100.0,
						Y: childY,
					},
					Data: map[string]interface{}{
						"id":            child.ID,
						"asset_tag":     child.AssetTag,
						"serial_number": child.SerialNumber,
						"category":      child.Category,
						"brand":         child.Brand,
						"model":         child.Model,
						"status":        child.Status,
						"location":      child.Location,
						"specs":         child.Specs,
					},
				})

				edges = append(edges, models.DiagramEdge{
					ID:       fmt.Sprintf("edge-%s-%s", dev.ID, child.ID),
					Source:   devNodeID,
					Target:   childNodeID,
					Label:    childEdgeLabel,
					Animated: false,
				})
			}
		}
	}

	JSONResponse(w, http.StatusOK, models.UserDiagramResponse{
		User:    u,
		Nodes:   nodes,
		Edges:   edges,
		Summary: summary,
	})
}

// Helper interno para devolver un usuario
func (h *AppHandler) GetUserByID(w http.ResponseWriter, id string, statusCode int) {
	var u models.User
	var isActiveInt int
	err := h.DB.QueryRow(`
		SELECT id, employee_code, full_name, email, department, location, is_active, created_at
		FROM users
		WHERE id = ?
	`, id).Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt)

	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	u.IsActive = isActiveInt == 1
	JSONResponse(w, statusCode, u)
}

// ListDepartments devuelve la lista de departamentos de la empresa
func (h *AppHandler) ListDepartments(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`SELECT id, name, created_at FROM departments ORDER BY name ASC`)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar departamentos: "+err.Error())
		return
	}
	defer rows.Close()

	depts := []models.Department{}
	for rows.Next() {
		var d models.Department
		if err := rows.Scan(&d.ID, &d.Name, &d.CreatedAt); err == nil {
			depts = append(depts, d)
		}
	}
	JSONResponse(w, http.StatusOK, depts)
}
