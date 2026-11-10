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

// ListCampaigns lista las campañas de auditoría
func (h *AppHandler) ListCampaigns(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT c.id, c.name, c.target_location, c.status, c.created_at, c.closed_at,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id) AS total_scans,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id AND discrepancy_type != 'MATCH') AS discrepancies_count,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id AND resolved = 1) AS resolved_count
		FROM audit_campaigns c
		ORDER BY c.created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar campañas: "+err.Error())
		return
	}
	defer rows.Close()

	campaigns := []models.AuditCampaign{}
	for rows.Next() {
		var c models.AuditCampaign
		var closedAtStr *string
		if err := rows.Scan(&c.ID, &c.Name, &c.TargetLocation, &c.Status, &c.CreatedAt, &closedAtStr,
			&c.TotalScans, &c.DiscrepanciesCount, &c.ResolvedCount); err == nil {
			c.ClosedAt = ParseNullTime(closedAtStr)
			campaigns = append(campaigns, c)
		}
	}

	JSONResponse(w, http.StatusOK, campaigns)
}

// CreateCampaign crea una nueva campaña de auditoría física vs lógica
func (h *AppHandler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name           string `json:"name"`
		TargetLocation string `json:"target_location"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if payload.Name == "" || payload.TargetLocation == "" {
		ErrorResponse(w, http.StatusBadRequest, "Nombre y ubicación objetivo son obligatorios")
		return
	}

	id := "cmp-" + uuid.New().String()[:8]
	_, err := h.DB.Exec(`
		INSERT INTO audit_campaigns (id, name, target_location, status)
		VALUES (?, ?, ?, 'OPEN')
	`, id, payload.Name, payload.TargetLocation)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al crear campaña: "+err.Error())
		return
	}

	h.GetCampaignByID(w, id)
}

// GetCampaign obtiene detalles de la campaña y sus escaneos
func (h *AppHandler) GetCampaign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	h.GetCampaignByID(w, id)
}

func (h *AppHandler) GetCampaignByID(w http.ResponseWriter, id string) {
	var c models.AuditCampaign
	var closedAtStr *string
	err := h.DB.QueryRow(`
		SELECT c.id, c.name, c.target_location, c.status, c.created_at, c.closed_at,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id) AS total_scans,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id AND discrepancy_type != 'MATCH') AS discrepancies_count,
		       (SELECT COUNT(*) FROM audit_scans WHERE campaign_id = c.id AND resolved = 1) AS resolved_count
		FROM audit_campaigns c
		WHERE c.id = ?
	`, id).Scan(&c.ID, &c.Name, &c.TargetLocation, &c.Status, &c.CreatedAt, &closedAtStr,
		&c.TotalScans, &c.DiscrepanciesCount, &c.ResolvedCount)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Campaña no encontrada")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	c.ClosedAt = ParseNullTime(closedAtStr)

	JSONResponse(w, http.StatusOK, c)
}

// CloseCampaign cierra una campaña de auditoría
func (h *AppHandler) CloseCampaign(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	now := time.Now()

	_, err := h.DB.Exec(`
		UPDATE audit_campaigns
		SET status = 'CLOSED', closed_at = ?
		WHERE id = ?
	`, now, id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al cerrar campaña: "+err.Error())
		return
	}

	h.GetCampaignByID(w, id)
}

// ScanAsset procesa una lectura física con la cámara o pistola de código de barras
// y ejecuta el motor de conciliación lógica vs. física
func (h *AppHandler) ScanAsset(w http.ResponseWriter, r *http.Request) {
	campaignID := chi.URLParam(r, "id")

	var req models.ScanAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if req.AssetTag == "" {
		ErrorResponse(w, http.StatusBadRequest, "El asset_tag es obligatorio")
		return
	}

	// 1. Verificar campaña abierta
	var campaignStatus, campaignLocation string
	err := h.DB.QueryRow("SELECT status, target_location FROM audit_campaigns WHERE id = ?", campaignID).Scan(&campaignStatus, &campaignLocation)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Campaña no encontrada")
		return
	}
	if campaignStatus != "OPEN" {
		ErrorResponse(w, http.StatusBadRequest, "No se pueden registrar escaneos en una campaña cerrada")
		return
	}

	if req.FoundLocation == "" {
		req.FoundLocation = campaignLocation
	}

	// 2. Consultar inventario lógico actual del activo
	var assetID, assetTag, brand, model, category, status, expectedLocation string
	var expectedUserID *string
	err = h.DB.QueryRow(`
		SELECT id, asset_tag, brand, model, category, status, location, assigned_to_user_id
		FROM assets
		WHERE asset_tag = ? OR id = ?
	`, req.AssetTag, req.AssetTag).Scan(&assetID, &assetTag, &brand, &model, &category, &status, &expectedLocation, &expectedUserID)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, fmt.Sprintf("Activo con tag '%s' no existe en el sistema lógico", req.AssetTag))
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al buscar activo: "+err.Error())
		return
	}

	// 3. Motor de Discrepancias
	discrepancyType := models.DiscrepancyMatch
	resolved := true

	// Comparar usuario
	expectedUserStr := ""
	if expectedUserID != nil {
		expectedUserStr = *expectedUserID
	}
	foundUserStr := ""
	if req.FoundWithUserID != nil {
		foundUserStr = *req.FoundWithUserID
	}

	if expectedUserStr != foundUserStr {
		discrepancyType = models.DiscrepancyWrongUser
		resolved = false
	} else if strings.TrimSpace(strings.ToLower(expectedLocation)) != strings.TrimSpace(strings.ToLower(req.FoundLocation)) {
		discrepancyType = models.DiscrepancyWrongLocation
		resolved = false
	} else if status == models.StatusRetired || status == models.StatusLost {
		discrepancyType = models.DiscrepancyUnexpectedStatus
		resolved = false
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al iniciar transacción: "+err.Error())
		return
	}
	defer tx.Rollback()

	// 4. Actualizar fecha de última auditoría física en el activo
	now := time.Now()
	_, err = tx.Exec("UPDATE assets SET last_audited_at = ? WHERE id = ?", now, assetID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al actualizar fecha de auditoría: "+err.Error())
		return
	}

	// 5. Registrar scan en audit_scans
	scanID := "scn-" + uuid.New().String()[:8]
	resolvedInt := 0
	if resolved {
		resolvedInt = 1
	}

	_, err = tx.Exec(`
		INSERT INTO audit_scans (
			id, campaign_id, asset_id, expected_user_id, found_with_user_id,
			expected_location, found_location, discrepancy_type, resolved, scanned_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, scanID, campaignID, assetID, expectedUserID, req.FoundWithUserID,
		expectedLocation, req.FoundLocation, discrepancyType, resolvedInt, now)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar escaneo: "+err.Error())
		return
	}

	// 6. Registrar en el historial inmutable de activos
	histID := "his-" + uuid.New().String()[:8]
	actionType := models.ActionAuditMatch
	histNotes := fmt.Sprintf("Auditado en campaña: MATCH físico vs. lógico en %s", req.FoundLocation)
	if discrepancyType != models.DiscrepancyMatch {
		actionType = models.ActionAuditDiscrepancy
		histNotes = fmt.Sprintf("Discrepancia detectada [%s]: Ubicación esp=%s/enc=%s, Usuario esp=%s/enc=%s",
			discrepancyType, expectedLocation, req.FoundLocation, expectedUserStr, foundUserStr)
	}

	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, notes, responsiva_status)
		VALUES (?, ?, ?, ?, 'NOT_REQUIRED')
	`, histID, assetID, actionType, histNotes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial de auditoría: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al confirmar escaneo: "+err.Error())
		return
	}

	// Respuesta enriquecida
	var expUserName, fndUserName *string
	if expectedUserID != nil {
		var name string
		if err := h.DB.QueryRow("SELECT full_name FROM users WHERE id = ?", *expectedUserID).Scan(&name); err == nil {
			expUserName = &name
		}
	}
	if req.FoundWithUserID != nil {
		var name string
		if err := h.DB.QueryRow("SELECT full_name FROM users WHERE id = ?", *req.FoundWithUserID).Scan(&name); err == nil {
			fndUserName = &name
		}
	}

	scanResult := models.AuditScan{
		ID:                scanID,
		CampaignID:        campaignID,
		AssetID:           assetID,
		AssetTag:          assetTag,
		AssetBrand:        brand,
		AssetModel:        model,
		AssetCategory:     category,
		ExpectedUserID:    expectedUserID,
		ExpectedUserName:  expUserName,
		FoundWithUserID:   req.FoundWithUserID,
		FoundWithUserName: fndUserName,
		ExpectedLocation:  expectedLocation,
		FoundLocation:     req.FoundLocation,
		DiscrepancyType:   discrepancyType,
		Resolved:          resolved,
		ScannedAt:         now,
	}

	JSONResponse(w, http.StatusOK, scanResult)
}

// ListDiscrepancies lista todas las discrepancias de una campaña, incluyendo los MISSING
func (h *AppHandler) ListDiscrepancies(w http.ResponseWriter, r *http.Request) {
	campaignID := chi.URLParam(r, "id")

	// Obtener target_location de la campaña
	var targetLocation string
	err := h.DB.QueryRow("SELECT target_location FROM audit_campaigns WHERE id = ?", campaignID).Scan(&targetLocation)
	if err != nil {
		ErrorResponse(w, http.StatusNotFound, "Campaña no encontrada")
		return
	}

	// 1. Obtener discrepancias registradas por escaneo
	query := `
		SELECT s.id, s.campaign_id, s.asset_id, a.asset_tag, a.brand, a.model, a.category,
		       s.expected_user_id, u_exp.full_name AS expected_user_name,
		       s.found_with_user_id, u_fnd.full_name AS found_with_user_name,
		       s.expected_location, s.found_location, s.discrepancy_type, s.resolved, s.scanned_at
		FROM audit_scans s
		JOIN assets a ON s.asset_id = a.id
		LEFT JOIN users u_exp ON s.expected_user_id = u_exp.id
		LEFT JOIN users u_fnd ON s.found_with_user_id = u_fnd.id
		WHERE s.campaign_id = ? AND s.discrepancy_type != 'MATCH'
		ORDER BY s.resolved ASC, s.scanned_at DESC
	`

	rows, err := h.DB.Query(query, campaignID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar discrepancias: "+err.Error())
		return
	}
	defer rows.Close()

	scans := []models.AuditScan{}
	for rows.Next() {
		var s models.AuditScan
		var resInt int
		if err := rows.Scan(
			&s.ID, &s.CampaignID, &s.AssetID, &s.AssetTag, &s.AssetBrand, &s.AssetModel, &s.AssetCategory,
			&s.ExpectedUserID, &s.ExpectedUserName,
			&s.FoundWithUserID, &s.FoundWithUserName,
			&s.ExpectedLocation, &s.FoundLocation, &s.DiscrepancyType, &resInt, &s.ScannedAt,
		); err == nil {
			s.Resolved = resInt == 1
			scans = append(scans, s)
		}
	}

	// 2. Calcular FALTANTES (MISSING): Activos que están en el inventario lógico para la ubicación objetivo pero no fueron escaneados
	missingRows, err := h.DB.Query(`
		SELECT a.id, a.asset_tag, a.brand, a.model, a.category, a.location, a.assigned_to_user_id, u.full_name
		FROM assets a
		LEFT JOIN users u ON a.assigned_to_user_id = u.id
		WHERE (a.location = ? OR a.location LIKE ?)
		  AND a.status IN ('ASSIGNED', 'AVAILABLE')
		  AND a.id NOT IN (SELECT asset_id FROM audit_scans WHERE campaign_id = ?)
	`, targetLocation, "%"+targetLocation+"%", campaignID)

	if err == nil {
		defer missingRows.Close()
		for missingRows.Next() {
			var m models.AuditScan
			var expName *string
			if err := missingRows.Scan(&m.AssetID, &m.AssetTag, &m.AssetBrand, &m.AssetModel, &m.AssetCategory, &m.ExpectedLocation, &m.ExpectedUserID, &expName); err == nil {
				m.ID = fmt.Sprintf("missing-%s", m.AssetID)
				m.CampaignID = campaignID
				m.ExpectedUserName = expName
				m.FoundLocation = "NO ESCANEADO"
				m.DiscrepancyType = models.DiscrepancyMissing
				m.Resolved = false
				m.ScannedAt = time.Now()
				scans = append(scans, m)
			}
		}
	}

	JSONResponse(w, http.StatusOK, scans)
}

// ResolveDiscrepancy resuelve una discrepancia en 1 clic
// Acción ACCEPT_PHYSICAL: sincroniza el inventario lógico con la realidad física encontrada.
// Acción MARK_LOST: marca el activo como extraviado (LOST).
func (h *AppHandler) ResolveDiscrepancy(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "id")

	var req models.ResolveDiscrepancyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if req.Action == "" {
		req.Action = "ACCEPT_PHYSICAL"
	}

	// Si es un scan missing temporal
	if len(scanID) > 8 && scanID[:8] == "missing-" {
		assetID := scanID[8:]
		if req.Action == "MARK_LOST" {
			_, err := h.DB.Exec("UPDATE assets SET status = 'LOST', assigned_to_user_id = NULL, parent_asset_id = NULL WHERE id = ?", assetID)
			if err != nil {
				ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
				return
			}
			histID := "his-" + uuid.New().String()[:8]
			h.DB.Exec("INSERT INTO asset_history (id, asset_id, action_type, notes, responsiva_status) VALUES (?, ?, 'STATUS_CHANGE', 'Activo faltante marcado como LOST en auditoría', 'NOT_REQUIRED')", histID, assetID)
		}
		JSONResponse(w, http.StatusOK, map[string]string{
			"status":  "resolved",
			"message": "Activo faltante resuelto con éxito",
		})
		return
	}

	// Obtener datos del escaneo
	var s models.AuditScan
	var resInt int
	err := h.DB.QueryRow(`
		SELECT id, campaign_id, asset_id, expected_user_id, found_with_user_id,
		       expected_location, found_location, discrepancy_type, resolved
		FROM audit_scans
		WHERE id = ?
	`, scanID).Scan(
		&s.ID, &s.CampaignID, &s.AssetID, &s.ExpectedUserID, &s.FoundWithUserID,
		&s.ExpectedLocation, &s.FoundLocation, &s.DiscrepancyType, &resInt,
	)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Registro de escaneo no encontrado")
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

	histNotes := ""

	switch req.Action {
	case "ACCEPT_PHYSICAL":
		// Actualizar el inventario lógico con la realidad física encontrada
		newStatus := models.StatusAssigned
		if s.FoundWithUserID == nil {
			newStatus = models.StatusAvailable
		}

		_, err = tx.Exec(`
			UPDATE assets
			SET assigned_to_user_id = ?, location = ?, status = ?
			WHERE id = ?
		`, s.FoundWithUserID, s.FoundLocation, newStatus, s.AssetID)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al conciliar activo: "+err.Error())
			return
		}

		histNotes = fmt.Sprintf("Conciliación en 1 clic: Inventario lógico actualizado con realidad física (Ubicación: %s, Custodia: %v). %s",
			s.FoundLocation, s.FoundWithUserID, req.Notes)

	case "MARK_LOST":
		_, err = tx.Exec(`
			UPDATE assets
			SET status = 'LOST', assigned_to_user_id = NULL, parent_asset_id = NULL
			WHERE id = ?
		`, s.AssetID)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al marcar como extraviado: "+err.Error())
			return
		}

		histNotes = fmt.Sprintf("Conciliación de auditoría: Activo marcado como extraviado (LOST). %s", req.Notes)

	case "KEEP_LOGICAL":
		histNotes = fmt.Sprintf("Conciliación de auditoría: Se mantuvo inventario lógico tras revisión manual. %s", req.Notes)

	default:
		ErrorResponse(w, http.StatusBadRequest, "Acción de resolución desconocida: "+req.Action)
		return
	}

	// Marcar escaneo como resuelto
	_, err = tx.Exec("UPDATE audit_scans SET resolved = 1 WHERE id = ?", scanID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al marcar scan como resuelto: "+err.Error())
		return
	}

	// Historial de trazabilidad
	histID := "his-" + uuid.New().String()[:8]
	_, err = tx.Exec(`
		INSERT INTO asset_history (id, asset_id, action_type, notes, responsiva_status)
		VALUES (?, ?, 'AUDIT_MATCH', ?, 'NOT_REQUIRED')
	`, histID, s.AssetID, histNotes)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al registrar historial: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error commit: "+err.Error())
		return
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":  "resolved",
		"message": "Discrepancia resuelta y conciliada con éxito",
		"scan_id": scanID,
		"action":  req.Action,
	})
}
