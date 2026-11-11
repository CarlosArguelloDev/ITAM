package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"opti-itam/internal/models"
)

// ListAssets lista activos con filtros
func (h *AppHandler) ListAssets(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	category := r.URL.Query().Get("category")
	status := r.URL.Query().Get("status")
	location := r.URL.Query().Get("location")
	department := r.URL.Query().Get("department")
	userID := r.URL.Query().Get("user_id")

	query := `
		SELECT a.id, a.asset_tag, a.serial_number, a.category, a.brand, a.model, a.status,
		       a.assigned_to_user_id, u.full_name AS assigned_to_name,
		       a.parent_asset_id, p.asset_tag AS parent_asset_tag,
		       a.location, COALESCE(a.department, '') AS department, a.specs, a.warranty_expiry, a.last_audited_at, a.created_at
		FROM assets a
		LEFT JOIN users u ON a.assigned_to_user_id = u.id
		LEFT JOIN assets p ON a.parent_asset_id = p.id
		WHERE 1=1
	`
	args := []interface{}{}

	if search != "" {
		query += " AND (a.asset_tag LIKE ? OR a.serial_number LIKE ? OR a.brand LIKE ? OR a.model LIKE ?)"
		pattern := "%" + search + "%"
		args = append(args, pattern, pattern, pattern, pattern)
	}

	if category != "" {
		query += " AND a.category = ?"
		args = append(args, category)
	}

	if status != "" {
		query += " AND a.status = ?"
		args = append(args, status)
	}

	if location != "" {
		query += " AND a.location = ?"
		args = append(args, location)
	}

	if department != "" {
		query += " AND a.department = ?"
		args = append(args, department)
	}

	if userID != "" {
		query += " AND a.assigned_to_user_id = ?"
		args = append(args, userID)
	}

	query += " ORDER BY a.created_at DESC"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activos: "+err.Error())
		return
	}
	defer rows.Close()

	assets := []models.Asset{}
	for rows.Next() {
		var a models.Asset
		var specsStr string
		var lastAuditedStr *string
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
			&a.AssignedToUserID, &a.AssignedToName,
			&a.ParentAssetID, &a.ParentAssetTag,
			&a.Location, &a.Department, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
		); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al escanear activo: "+err.Error())
			return
		}
		a.LastAuditedAt = ParseNullTime(lastAuditedStr)
		a.Specs = json.RawMessage(specsStr)
		assets = append(assets, a)
	}

	JSONResponse(w, http.StatusOK, assets)
}

// GetAsset obtiene detalle completo de un activo, incluyendo hijos y trazabilidad
func (h *AppHandler) GetAsset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.getAssetByIDOrTag(w, "a.id = ?", id)
}

// GetAssetByTag busca activo por su código/etiqueta QR o número de serie
func (h *AppHandler) GetAssetByTag(w http.ResponseWriter, r *http.Request) {
	tag := strings.TrimSpace(chi.URLParam(r, "tag"))
	h.getAssetByIDOrTag(w, "(a.asset_tag = ? OR a.serial_number = ?)", tag, tag)
}

func (h *AppHandler) getAssetByIDOrTag(w http.ResponseWriter, whereClause string, params ...interface{}) {
	query := fmt.Sprintf(`
		SELECT a.id, a.asset_tag, a.serial_number, a.category, a.brand, a.model, a.status,
		       a.assigned_to_user_id, u.full_name AS assigned_to_name,
		       a.parent_asset_id, p.asset_tag AS parent_asset_tag,
		       a.location, COALESCE(a.department, '') AS department, a.specs, a.warranty_expiry, a.last_audited_at, a.created_at
		FROM assets a
		LEFT JOIN users u ON a.assigned_to_user_id = u.id
		LEFT JOIN assets p ON a.parent_asset_id = p.id
		WHERE %s
	`, whereClause)

	var a models.Asset
	var specsStr string
	var lastAuditedStr *string
	err := h.DB.QueryRow(query, params...).Scan(
		&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
		&a.AssignedToUserID, &a.AssignedToName,
		&a.ParentAssetID, &a.ParentAssetTag,
		&a.Location, &a.Department, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
	)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activo: "+err.Error())
		return
	}
	a.LastAuditedAt = ParseNullTime(lastAuditedStr)
	a.Specs = json.RawMessage(specsStr)

	// Obtener activos hijos (satélites conectados a este activo)
	childRows, err := h.DB.Query(`
		SELECT id, asset_tag, serial_number, category, brand, model, status, location, COALESCE(department, ''), specs
		FROM assets
		WHERE parent_asset_id = ?
	`, a.ID)
	if err == nil {
		defer childRows.Close()
		a.Children = []models.Asset{}
		for childRows.Next() {
			var ch models.Asset
			var chSpecs string
			if err := childRows.Scan(&ch.ID, &ch.AssetTag, &ch.SerialNumber, &ch.Category, &ch.Brand, &ch.Model, &ch.Status, &ch.Location, &ch.Department, &chSpecs); err == nil {
				ch.Specs = json.RawMessage(chSpecs)
				a.Children = append(a.Children, ch)
			}
		}
	}

	JSONResponse(w, http.StatusOK, a)
}

// CreateAsset da de alta un activo e inserta en el historial
func (h *AppHandler) CreateAsset(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if strings.TrimSpace(req.AssetTag) == "" || strings.TrimSpace(req.SerialNumber) == "" {
		ErrorResponse(w, http.StatusBadRequest, "Asset Tag y Número de Serie son obligatorios")
		return
	}

	if req.Status == "" {
		req.Status = models.StatusAvailable
	}
	if len(req.Specs) == 0 {
		req.Specs = json.RawMessage("{}")
	}

	newID := "ast-" + uuid.New().String()[:8]

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error de transacción: "+err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO assets (id, asset_tag, serial_number, category, brand, model, status,
		                    assigned_to_user_id, parent_asset_id, location, department, specs, warranty_expiry)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, newID, req.AssetTag, req.SerialNumber, req.Category, req.Brand, req.Model, req.Status,
		req.AssignedToUserID, req.ParentAssetID, req.Location, req.Department, string(req.Specs), req.WarrantyExpiry)

	if err != nil {
		ErrorResponse(w, http.StatusConflict, "Error al crear activo (verifique tags o series duplicadas): "+err.Error())
		return
	}

	// Historial de creación
	historyID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, new_user_id, notes, responsiva_status)
		VALUES (?, ?, ?, ?, ?, ?)
	`, historyID, newID, models.ActionCreate, req.AssignedToUserID, "Alta inicial del activo en el sistema", models.ResponsivaNotRequired)

	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial de alta: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al confirmar transacción: "+err.Error())
		return
	}

	h.getAssetByIDOrTag(w, "a.id = ?", newID)
}

// UpdateAsset actualiza un activo existente y registra cambios relevantes en historial
func (h *AppHandler) UpdateAsset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	var req models.UpdateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	var currentStatus string
	var currentUserID *string
	err := h.DB.QueryRow("SELECT status, assigned_to_user_id FROM assets WHERE id = ?", id).Scan(&currentStatus, &currentUserID)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error DB: "+err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		UPDATE assets
		SET asset_tag = ?, serial_number = ?, category = ?, brand = ?, model = ?,
		    status = ?, assigned_to_user_id = ?, parent_asset_id = ?, location = ?,
		    department = ?, specs = ?, warranty_expiry = ?
		WHERE id = ?
	`, req.AssetTag, req.SerialNumber, req.Category, req.Brand, req.Model,
		req.Status, req.AssignedToUserID, req.ParentAssetID, req.Location,
		req.Department, string(req.Specs), req.WarrantyExpiry, id)

	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al actualizar activo: "+err.Error())
		return
	}

	// Registrar en historial si cambió de estado
	if currentStatus != req.Status {
		histID := "his-" + uuid.New().String()[:8]
		notes := fmt.Sprintf("Cambio de estado: %s -> %s", currentStatus, req.Status)
		tx.Exec(`
			INSERT INTO asset_history (id, asset_id, action_type, notes, responsiva_status)
			VALUES (?, ?, ?, ?, ?)
		`, histID, id, models.ActionStatusChange, notes, models.ResponsivaNotRequired)
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error commit: "+err.Error())
		return
	}

	h.getAssetByIDOrTag(w, "a.id = ?", id)
}

// DeleteAsset retira o elimina un activo
func (h *AppHandler) DeleteAsset(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	// Verificar si tiene historial o si se puede eliminar
	var historyCount int
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM asset_history WHERE asset_id = ?", id).Scan(&historyCount)

	if historyCount > 1 {
		// Marcar como RETIRED
		_, err := h.DB.Exec("UPDATE assets SET status = 'RETIRED', assigned_to_user_id = NULL, parent_asset_id = NULL WHERE id = ?", id)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al retirar activo: "+err.Error())
			return
		}
		// Registrar historial
		histID := "his-" + uuid.New().String()[:8]
		h.DB.Exec(`
			INSERT INTO asset_history (id, asset_id, action_type, notes, responsiva_status)
			VALUES (?, ?, 'STATUS_CHANGE', 'Activo retirado definitivamente del inventario', 'NOT_REQUIRED')
		`, histID, id)

		JSONResponse(w, http.StatusOK, map[string]string{
			"message": "El activo posee historial de movimientos; fue marcado como RETIRED en lugar de borrado físico",
			"status":  "RETIRED",
		})
		return
	}

	_, err := h.DB.Exec("DELETE FROM assets WHERE id = ?", id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al eliminar activo: "+err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]string{"message": "Activo eliminado exitosamente"})
}

// GetAssetHistory obtiene el trazado de auditoría de un activo
func (h *AppHandler) GetAssetHistory(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	query := `
		SELECT h.id, h.asset_id, a.asset_tag, a.model, h.action_type,
		       h.previous_user_id, u_prev.full_name AS previous_user_name,
		       h.new_user_id, u_new.full_name AS new_user_name,
		       h.notes, h.responsiva_status, h.responsiva_doc_path, h.created_at
		FROM asset_history h
		LEFT JOIN assets a ON h.asset_id = a.id
		LEFT JOIN users u_prev ON h.previous_user_id = u_prev.id
		LEFT JOIN users u_new ON h.new_user_id = u_new.id
		WHERE h.asset_id = ?
		ORDER BY h.created_at DESC
	`

	rows, err := h.DB.Query(query, id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar historial: "+err.Error())
		return
	}
	defer rows.Close()

	history := []models.AssetHistory{}
	for rows.Next() {
		var item models.AssetHistory
		if err := rows.Scan(
			&item.ID, &item.AssetID, &item.AssetTag, &item.AssetModel, &item.ActionType,
			&item.PreviousUserID, &item.PreviousUserName,
			&item.NewUserID, &item.NewUserName,
			&item.Notes, &item.ResponsivaStatus, &item.ResponsivaDocPath, &item.CreatedAt,
		); err == nil {
			history = append(history, item)
		}
	}

	JSONResponse(w, http.StatusOK, history)
}

// AssignAsset asigna un activo a un usuario
func (h *AppHandler) AssignAsset(w http.ResponseWriter, r *http.Request) {
	var req models.AssignAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	var prevUserID *string
	var currentStatus, currentLoc, category string
	err := h.DB.QueryRow("SELECT assigned_to_user_id, status, location, category FROM assets WHERE id = ?", req.AssetID).Scan(&prevUserID, &currentStatus, &currentLoc, &category)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
		return
	}

	// Obtener ubicación del usuario si no se especifica
	if req.Location == "" || (req.Location != "OPM" && req.Location != "OMEX") {
		_ = h.DB.QueryRow("SELECT location FROM users WHERE id = ?", req.UserID).Scan(&req.Location)
		if req.Location != "OPM" && req.Location != "OMEX" {
			req.Location = currentLoc
			if req.Location != "OPM" && req.Location != "OMEX" {
				req.Location = "OPM"
			}
		}
	}

	isPC := category == "LAPTOP" || category == "WORKSTATION"
	isCompPeripheral := category == "MONITOR" || category == "DOCKING" || category == "AUDIFONOS" ||
		category == "TECLADO" || category == "MOUSE" || category == "ADAPTADOR DE RED" || category == "QUEMADOR DE CD"

	// Auto-vincular únicamente periféricos de cómputo a la laptop/workstation del usuario si no se especificó parent
	if req.ParentAssetID == nil && isCompPeripheral {
		var pcID string
		err := h.DB.QueryRow(`
			SELECT id FROM assets 
			WHERE assigned_to_user_id = ? AND category IN ('LAPTOP', 'WORKSTATION') AND status = 'ASSIGNED' 
			ORDER BY CASE WHEN category = 'LAPTOP' THEN 1 ELSE 2 END 
			LIMIT 1
		`, req.UserID).Scan(&pcID)
		if err == nil && pcID != "" {
			req.ParentAssetID = &pcID
		}
	} else if req.ParentAssetID == nil && category == "SIM-CARD" {
		// Auto-vincular SIM-CARD a un celular del usuario si lo tiene asignado
		var phoneID string
		err := h.DB.QueryRow(`
			SELECT id FROM assets 
			WHERE assigned_to_user_id = ? AND category = 'TELEFONO' AND status = 'ASSIGNED' 
			LIMIT 1
		`, req.UserID).Scan(&phoneID)
		if err == nil && phoneID != "" {
			req.ParentAssetID = &phoneID
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	defer tx.Rollback()

	// Actualizar activo
	_, err = tx.Exec(`
		UPDATE assets
		SET status = 'ASSIGNED', assigned_to_user_id = ?, parent_asset_id = ?, location = ?
		WHERE id = ?
	`, req.UserID, req.ParentAssetID, req.Location, req.AssetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al asignar activo: "+err.Error())
		return
	}

	// Si el activo asignado es una computadora (LAPTOP / WORKSTATION), vincular automáticamente sus periféricos que el usuario ya tenga sin padre
	if isPC {
		_, _ = tx.Exec(`
			UPDATE assets
			SET parent_asset_id = ?
			WHERE assigned_to_user_id = ? AND id != ? AND parent_asset_id IS NULL 
			  AND category IN ('MONITOR', 'DOCKING', 'AUDIFONOS', 'TECLADO', 'MOUSE', 'ADAPTADOR DE RED', 'QUEMADOR DE CD')
		`, req.AssetID, req.UserID, req.AssetID)
	} else if category == "TELEFONO" {
		// Si el activo es un teléfono celular, vincular tarjetas SIM que el usuario tenga sin padre
		_, _ = tx.Exec(`
			UPDATE assets
			SET parent_asset_id = ?
			WHERE assigned_to_user_id = ? AND id != ? AND parent_asset_id IS NULL AND category = 'SIM-CARD'
		`, req.AssetID, req.UserID, req.AssetID)
	}

	// Historial
	notes := req.Notes
	if notes == "" {
		notes = "Asignación de equipo"
	}
	histID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status)
		VALUES (?, ?, 'ASSIGN', ?, ?, ?, 'PENDING')
	`, histID, req.AssetID, prevUserID, req.UserID, notes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al confirmar asignación: "+err.Error())
		return
	}

	h.getAssetByIDOrTag(w, "a.id = ?", req.AssetID)
}

// UnassignAsset retira un activo de un usuario y lo devuelve a stock o mantenimiento
func (h *AppHandler) UnassignAsset(w http.ResponseWriter, r *http.Request) {
	var req models.UnassignAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if req.NextStatus == "" {
		req.NextStatus = models.StatusAvailable
	}

	var prevUserID *string
	var currentLoc string
	err := h.DB.QueryRow("SELECT assigned_to_user_id, location FROM assets WHERE id = ?", req.AssetID).Scan(&prevUserID, &currentLoc)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
		return
	}

	if req.Location == "" || (req.Location != "OPM" && req.Location != "OMEX") {
		req.Location = currentLoc
		if req.Location != "OPM" && req.Location != "OMEX" {
			req.Location = "OPM"
		}
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	defer tx.Rollback()

	// Desasignar activo y liberar hijos si tenía
	_, err = tx.Exec(`
		UPDATE assets
		SET status = ?, assigned_to_user_id = NULL, parent_asset_id = NULL, location = ?
		WHERE id = ?
	`, req.NextStatus, req.Location, req.AssetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al desasignar: "+err.Error())
		return
	}

	// Desenlazar hijos si este activo era padre
	_, _ = tx.Exec(`UPDATE assets SET parent_asset_id = NULL WHERE parent_asset_id = ?`, req.AssetID)

	// Historial
	notes := req.Notes
	if notes == "" {
		notes = "Desasignación de equipo y retorno a stock"
	}
	histID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status)
		VALUES (?, ?, 'UNASSIGN', ?, NULL, ?, 'NOT_REQUIRED')
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

// SwapAsset ejecuta un cambio atómico de equipo (Swap) en una sola transacción SQL
func (h *AppHandler) SwapAsset(w http.ResponseWriter, r *http.Request) {
	var req models.SwapAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if req.UserID == "" || req.OldAssetID == "" || req.NewAssetID == "" {
		ErrorResponse(w, http.StatusBadRequest, "user_id, old_asset_id y new_asset_id son obligatorios para el Swap")
		return
	}

	if req.OldAssetNextStatus == "" {
		req.OldAssetNextStatus = models.StatusMaintenance
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error de transacción: "+err.Error())
		return
	}
	defer tx.Rollback()

	// 1. Obtener datos del usuario
	var userLocation string
	var userName string
	err = tx.QueryRow("SELECT full_name, location FROM users WHERE id = ?", req.UserID).Scan(&userName, &userLocation)
	if err != nil {
		ErrorResponse(w, http.StatusNotFound, "Usuario de destino no encontrado")
		return
	}

	// 2. Obtener datos del equipo anterior
	var oldTag, oldModel string
	err = tx.QueryRow("SELECT asset_tag, model FROM assets WHERE id = ?", req.OldAssetID).Scan(&oldTag, &oldModel)
	if err != nil {
		ErrorResponse(w, http.StatusNotFound, "Equipo anterior (OldAsset) no encontrado")
		return
	}

	// 3. Obtener datos del equipo nuevo
	var newTag, newModel, newCategory string
	err = tx.QueryRow("SELECT asset_tag, model, category FROM assets WHERE id = ?", req.NewAssetID).Scan(&newTag, &newModel, &newCategory)
	if err != nil {
		ErrorResponse(w, http.StatusNotFound, "Equipo nuevo (NewAsset) no encontrado")
		return
	}

	// 4. Desasignar equipo viejo y cambiar su estado
	oldNotes := fmt.Sprintf("Retirado por SWAP para entregar %s (%s). %s", newTag, newModel, req.Notes)
	_, err = tx.Exec(`
		UPDATE assets
		SET status = ?, assigned_to_user_id = NULL, parent_asset_id = NULL
		WHERE id = ?
	`, req.OldAssetNextStatus, req.OldAssetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al actualizar equipo anterior: "+err.Error())
		return
	}

	oldHistID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status)
		VALUES (?, ?, 'SWAP', ?, NULL, ?, 'NOT_REQUIRED')
	`, oldHistID, req.OldAssetID, req.UserID, oldNotes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial equipo anterior: "+err.Error())
		return
	}

	// 5. Reasignar satélites (dockings, monitores) al nuevo equipo si aplica
	if req.MoveChildrenToNewAsset {
		_, err = tx.Exec(`
			UPDATE assets
			SET parent_asset_id = ?
			WHERE parent_asset_id = ?
		`, req.NewAssetID, req.OldAssetID)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al migrar periféricos asociados: "+err.Error())
			return
		}
	}

	// 6. Asignar nuevo equipo al usuario
	_, err = tx.Exec(`
		UPDATE assets
		SET status = 'ASSIGNED', assigned_to_user_id = ?, location = ?, parent_asset_id = NULL
		WHERE id = ?
	`, req.UserID, userLocation, req.NewAssetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al asignar equipo nuevo: "+err.Error())
		return
	}

	folio := fmt.Sprintf("SWAP-%s-%d", time.Now().Format("20060102"), time.Now().Unix()%10000)
	newNotes := fmt.Sprintf("Asignado mediante SWAP reemplazando a %s (%s). Folio: %s. %s", oldTag, oldModel, folio, req.Notes)
	newHistID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, previous_user_id, new_user_id, notes, responsiva_status)
		VALUES (?, ?, 'SWAP', NULL, ?, ?, 'PENDING')
	`, newHistID, req.NewAssetID, req.UserID, newNotes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial equipo nuevo: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al confirmar transacción de SWAP: "+err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":          "success",
		"message":         fmt.Sprintf("Swap completado con éxito. Se reemplazó %s por %s para el usuario %s", oldTag, newTag, userName),
		"folio":           folio,
		"history_id":      newHistID,
		"user_id":         req.UserID,
		"old_asset_id":    req.OldAssetID,
		"new_asset_id":    req.NewAssetID,
		"responsiva_url":  fmt.Sprintf("/api/users/%s/responsiva-data", req.UserID),
	})
}
