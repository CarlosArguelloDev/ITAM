package handlers

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"opti-itam/internal/models"
)

// GetResponsivaData devuelve el JSON limpio y estructurado con todos los datos
// necesarios para renderizar la Carta de Responsiva en pantalla o alimentar un motor PDF
func (h *AppHandler) GetResponsivaData(w http.ResponseWriter, r *http.Request) {
	userID := chi.URLParam(r, "id")

	// 1. Obtener datos del empleado
	var u models.User
	var isActiveInt int
	err := h.DB.QueryRow(`
		SELECT id, employee_code, full_name, email, department, location, is_active, created_at
		FROM users
		WHERE id = ?
	`, userID).Scan(&u.ID, &u.EmployeeCode, &u.FullName, &u.Email, &u.Department, &u.Location, &isActiveInt, &u.CreatedAt)

	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Usuario no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar usuario: "+err.Error())
		return
	}
	u.IsActive = isActiveInt == 1

	// 2. Obtener activos asignados actualmente
	rows, err := h.DB.Query(`
		SELECT id, asset_tag, serial_number, category, brand, model, status,
		       assigned_to_user_id, parent_asset_id, location, specs, warranty_expiry, last_audited_at, created_at
		FROM assets
		WHERE assigned_to_user_id = ?
		ORDER BY CASE category 
			WHEN 'LAPTOP' THEN 1 
			WHEN 'DOCKING' THEN 2 
			WHEN 'MONITOR' THEN 3 
			ELSE 4 END, model ASC
	`, userID)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activos asignados: "+err.Error())
		return
	}
	defer rows.Close()

	var primaryLaptop *models.Asset
	attachedAssets := []models.Asset{}

	for rows.Next() {
		var a models.Asset
		var specsStr string
		var lastAuditedStr *string
		if err := rows.Scan(
			&a.ID, &a.AssetTag, &a.SerialNumber, &a.Category, &a.Brand, &a.Model, &a.Status,
			&a.AssignedToUserID, &a.ParentAssetID, &a.Location, &specsStr, &a.WarrantyExpiry, &lastAuditedStr, &a.CreatedAt,
		); err == nil {
			a.LastAuditedAt = ParseNullTime(lastAuditedStr)
			a.Specs = []byte(specsStr)
			if a.Category == models.CategoryLaptop && primaryLaptop == nil {
				laptopCopy := a
				primaryLaptop = &laptopCopy
			} else {
				attachedAssets = append(attachedAssets, a)
			}
		}
	}

	// 3. Buscar si existe un historial con responsiva_status = 'PENDING'
	var pendingHistoryID string
	_ = h.DB.QueryRow(`
		SELECT id FROM asset_history
		WHERE (new_user_id = ? OR asset_id IN (SELECT id FROM assets WHERE assigned_to_user_id = ?))
		  AND responsiva_status = 'PENDING'
		ORDER BY created_at DESC LIMIT 1
	`, userID, userID).Scan(&pendingHistoryID)

	// 4. Construir Folio
	folio := fmt.Sprintf("RESP-%s-%s", u.EmployeeCode, time.Now().Format("20060102"))

	terms := "El empleado firmante declara haber recibido en perfecto estado funcional y físico las herramientas tecnológicas descritas en este documento, reconociendo que son propiedad exclusiva de la empresa y destinadas únicamente para el desempeño de sus labores laborales asignadas. Se compromete a salvaguardar los equipos contra daño, robo, extravío o acceso no autorizado."

	totalItems := len(attachedAssets)
	if primaryLaptop != nil {
		totalItems++
	}

	payload := models.ResponsivaPayload{
		Folio:              folio,
		GeneratedAt:        time.Now(),
		Employee:           u,
		PrimaryLaptop:      primaryLaptop,
		AttachedAssets:     attachedAssets,
		TotalItems:         totalItems,
		TermsAndConditions: terms,
		PendingHistoryID:   pendingHistoryID,
	}

	JSONResponse(w, http.StatusOK, payload)
}

// UploadSignedResponsiva recibe el archivo firmado (PDF, imagen o scan)
// lo guarda en h.UploadsDir y actualiza el estado a SIGNED en asset_history
func (h *AppHandler) UploadSignedResponsiva(w http.ResponseWriter, r *http.Request) {
	// Límite de 15 MB
	if err := r.ParseMultipartForm(15 << 20); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "El archivo excede el tamaño permitido (máx 15MB)")
		return
	}

	file, fileHeader, err := r.FormFile("file")
	if err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Archivo no encontrado en el formulario (campo 'file')")
		return
	}
	defer file.Close()

	historyID := r.FormValue("history_id")
	userID := r.FormValue("user_id")

	if historyID == "" && userID == "" {
		ErrorResponse(w, http.StatusBadRequest, "history_id o user_id es obligatorio")
		return
	}

	// Asegurar directorio de subida
	if err := os.MkdirAll(h.UploadsDir, 0755); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "No se pudo crear carpeta de subidas: "+err.Error())
		return
	}

	// Sanitizar nombre de archivo
	ext := filepath.Ext(fileHeader.Filename)
	if ext == "" {
		ext = ".pdf"
	}
	cleanFileName := fmt.Sprintf("resp_%s_%d%s", strings.ReplaceAll(filepath.Base(fileHeader.Filename), " ", "_"), time.Now().Unix(), ext)
	dstPath := filepath.Join(h.UploadsDir, cleanFileName)

	dst, err := os.Create(dstPath)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al crear archivo en disco: "+err.Error())
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al guardar contenido: "+err.Error())
		return
	}

	publicDocPath := "/api/responsivas/file/" + cleanFileName

	// Actualizar en base de datos
	var updatedRows int64
	if historyID != "" {
		res, err := h.DB.Exec(`
			UPDATE asset_history
			SET responsiva_status = 'SIGNED', responsiva_doc_path = ?
			WHERE id = ?
		`, publicDocPath, historyID)
		if err == nil {
			updatedRows, _ = res.RowsAffected()
		}
	} else if userID != "" {
		// Actualizar todas las responsivas pendientes para este usuario
		res, err := h.DB.Exec(`
			UPDATE asset_history
			SET responsiva_status = 'SIGNED', responsiva_doc_path = ?
			WHERE (new_user_id = ? OR asset_id IN (SELECT id FROM assets WHERE assigned_to_user_id = ?))
			  AND responsiva_status = 'PENDING'
		`, publicDocPath, userID, userID)
		if err == nil {
			updatedRows, _ = res.RowsAffected()
		}
	}

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":          "success",
		"message":         "Carta de responsiva firmada guardada correctamente",
		"file_name":       cleanFileName,
		"doc_path":        publicDocPath,
		"records_updated": updatedRows,
	})
}

// ServeResponsivaFile sirve de forma segura los archivos escaneados o firmados
func (h *AppHandler) ServeResponsivaFile(w http.ResponseWriter, r *http.Request) {
	filename := chi.URLParam(r, "filename")
	cleanFilename := filepath.Base(filename)
	filePath := filepath.Join(h.UploadsDir, cleanFilename)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		ErrorResponse(w, http.StatusNotFound, "Documento no encontrado")
		return
	}

	http.ServeFile(w, r, filePath)
}

// ListPendingResponsivas lista las responsivas que aún están pendientes de firma
func (h *AppHandler) ListPendingResponsivas(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT h.id, h.asset_id, a.asset_tag, a.model, h.action_type,
		       h.new_user_id, u.full_name AS new_user_name, u.employee_code,
		       h.notes, h.responsiva_status, h.created_at
		FROM asset_history h
		JOIN assets a ON h.asset_id = a.id
		LEFT JOIN users u ON h.new_user_id = u.id
		WHERE h.responsiva_status = 'PENDING'
		ORDER BY h.created_at DESC
	`

	rows, err := h.DB.Query(query)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error: "+err.Error())
		return
	}
	defer rows.Close()

	type PendingItem struct {
		HistoryID        string    `json:"history_id"`
		AssetID          string    `json:"asset_id"`
		AssetTag         string    `json:"asset_tag"`
		AssetModel       string    `json:"asset_model"`
		ActionType       string    `json:"action_type"`
		UserID           *string   `json:"user_id"`
		UserName         *string   `json:"user_name"`
		EmployeeCode     *string   `json:"employee_code"`
		Notes            string    `json:"notes"`
		ResponsivaStatus string    `json:"responsiva_status"`
		CreatedAt        time.Time `json:"created_at"`
	}

	results := []PendingItem{}
	for rows.Next() {
		var item PendingItem
		if err := rows.Scan(
			&item.HistoryID, &item.AssetID, &item.AssetTag, &item.AssetModel, &item.ActionType,
			&item.UserID, &item.UserName, &item.EmployeeCode,
			&item.Notes, &item.ResponsivaStatus, &item.CreatedAt,
		); err == nil {
			results = append(results, item)
		}
	}

	JSONResponse(w, http.StatusOK, results)
}
