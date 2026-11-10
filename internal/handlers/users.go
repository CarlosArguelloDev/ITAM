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
		SELECT u.id, u.employee_code, u.full_name, u.email, u.department, u.location, u.is_active, u.created_at
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
	for rows.Next() {
		var u models.User
		var isActiveInt int
		if err := rows.Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al escanear usuario: "+err.Error())
			return
		}
		u.IsActive = isActiveInt == 1
		users = append(users, u)
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
		SELECT id, asset_tag, serial_number, category, brand, model, status,
		       assigned_to_user_id, parent_asset_id, location, specs, warranty_expiry, last_audited_at, created_at
		FROM assets
		WHERE assigned_to_user_id = ?
		ORDER BY category ASC
	`, id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al leer activos: "+err.Error())
		return
	}
	defer rows.Close()

	assignedAssets := []models.Asset{}
	var primaryLaptop *models.Asset
	satelliteAssets := []models.Asset{}

	for rows.Next() {
		var a models.Asset
		var specsStr string
		var lastAuditedStr *string
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
			&a.AssignedToUserID, &a.ParentAssetID, &a.Location, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
		); err == nil {
			a.LastAuditedAt = ParseNullTime(lastAuditedStr)
			a.Specs = json.RawMessage(specsStr)
			assignedAssets = append(assignedAssets, a)
			if a.Category == models.CategoryLaptop && primaryLaptop == nil {
				laptopCopy := a
				primaryLaptop = &laptopCopy
			} else {
				satelliteAssets = append(satelliteAssets, a)
			}
		}
	}

	nodes := []models.DiagramNode{}
	edges := []models.DiagramEdge{}
	summary := map[string]int{
		"total":       len(assignedAssets),
		"laptops":     0,
		"dockings":    0,
		"monitors":    0,
		"peripherals": 0,
		"others":      0,
	}

	for _, a := range assignedAssets {
		switch a.Category {
		case models.CategoryLaptop:
			summary["laptops"]++
		case models.CategoryDocking:
			summary["dockings"]++
		case models.CategoryMonitor:
			summary["monitors"]++
		case models.CategoryPeripheral:
			summary["peripherals"]++
		default:
			summary["others"]++
		}
	}

	// Nodo Raíz de Usuario
	userNodeID := fmt.Sprintf("node-usr-%s", u.ID)
	nodes = append(nodes, models.DiagramNode{
		ID:   userNodeID,
		Type: "userNode",
		Position: models.NodePosition{
			X: 300,
			Y: 30,
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

	var rootAssetNodeID string

	// Si hay Laptop primaria, es el nodo central de equipamiento
	if primaryLaptop != nil {
		rootAssetNodeID = fmt.Sprintf("node-ast-%s", primaryLaptop.ID)
		nodes = append(nodes, models.DiagramNode{
			ID:   rootAssetNodeID,
			Type: "laptopNode",
			Position: models.NodePosition{
				X: 300,
				Y: 180,
			},
			Data: map[string]interface{}{
				"id":            primaryLaptop.ID,
				"asset_tag":     primaryLaptop.AssetTag,
				"serial_number": primaryLaptop.SerialNumber,
				"category":      primaryLaptop.Category,
				"brand":         primaryLaptop.Brand,
				"model":         primaryLaptop.Model,
				"status":        primaryLaptop.Status,
				"location":      primaryLaptop.Location,
				"specs":         primaryLaptop.Specs,
			},
		})

		// Edge Usuario -> Laptop
		edges = append(edges, models.DiagramEdge{
			ID:       fmt.Sprintf("edge-usr-%s-laptop", u.ID),
			Source:   userNodeID,
			Target:   rootAssetNodeID,
			Label:    "Custodia Primaria",
			Animated: true,
		})
	}

	// Distribuir nodos satélite (Dockings, Monitores, Periféricos)
	numSatellites := len(satelliteAssets)
	if numSatellites > 0 {
		spacingX := 240.0
		startX := 300.0 - (float64(numSatellites-1)*spacingX)/2.0
		if startX < 20 {
			startX = 20
		}

		for i, sat := range satelliteAssets {
			nodeType := "peripheralNode"
			switch sat.Category {
			case models.CategoryDocking:
				nodeType = "dockingNode"
			case models.CategoryMonitor:
				nodeType = "monitorNode"
			case models.CategoryLaptop:
				nodeType = "laptopNode"
			}

			satNodeID := fmt.Sprintf("node-ast-%s", sat.ID)
			satY := 360.0
			// Escalonar un poco si hay muchos
			if i%2 == 1 {
				satY = 400.0
			}

			nodes = append(nodes, models.DiagramNode{
				ID:   satNodeID,
				Type: nodeType,
				Position: models.NodePosition{
					X: startX + float64(i)*spacingX,
					Y: satY,
				},
				Data: map[string]interface{}{
					"id":            sat.ID,
					"asset_tag":     sat.AssetTag,
					"serial_number": sat.SerialNumber,
					"category":      sat.Category,
					"brand":         sat.Brand,
					"model":         sat.Model,
					"status":        sat.Status,
					"location":      sat.Location,
					"specs":         sat.Specs,
				},
			})

			// Conectar al nodo Laptop o al Usuario si no hay laptop
			sourceID := rootAssetNodeID
			edgeLabel := "Conectado a Laptop"
			if sourceID == "" {
				sourceID = userNodeID
				edgeLabel = "Asignado directo"
			}

			edges = append(edges, models.DiagramEdge{
				ID:       fmt.Sprintf("edge-%s-%s", sourceID, satNodeID),
				Source:   sourceID,
				Target:   satNodeID,
				Label:    edgeLabel,
				Animated: false,
			})
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
