package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"opti-itam/internal/models"
)

// PrintAssetLabelBrother imprime la etiqueta física del activo en Brother PT-D410 usando b-PAC
func (h *AppHandler) PrintAssetLabelBrother(w http.ResponseWriter, r *http.Request) {
	assetID := chi.URLParam(r, "id")
	if assetID == "" {
		ErrorResponse(w, http.StatusBadRequest, "ID de activo requerido")
		return
	}

	// 1. Obtener activo desde BD local o servidor remoto
	var asset models.Asset
	if h.DB != nil {
		var assignedToUserID, parentAssetID, specs, warrantyExpiry, lastAuditedAt sql.NullString

		query := `
			SELECT id, asset_tag, serial_number, category, brand, model, status,
			       assigned_to_user_id, parent_asset_id, location, specs, warranty_expiry,
			       last_audited_at, created_at
			FROM assets
			WHERE id = ? OR asset_tag = ?
		`
		err := h.DB.QueryRow(query, assetID, assetID).Scan(
			&asset.ID, &asset.AssetTag, &asset.SerialNumber, &asset.Category, &asset.Brand, &asset.Model,
			&asset.Status, &assignedToUserID, &parentAssetID, &asset.Location,
			&specs, &warrantyExpiry, &lastAuditedAt, &asset.CreatedAt,
		)
		if err == sql.ErrNoRows {
			ErrorResponse(w, http.StatusNotFound, "Activo no encontrado")
			return
		} else if err != nil {
			log.Printf("[PRINT-ERROR] Error al buscar activo %s: %v", assetID, err)
			ErrorResponse(w, http.StatusInternalServerError, "Error al consultar activo")
			return
		}
	} else if h.RemoteURL != "" {
		client := &http.Client{Timeout: 10 * time.Second}
		resp, err := client.Get(fmt.Sprintf("%s/api/assets/%s", strings.TrimRight(h.RemoteURL, "/"), url.PathEscape(assetID)))
		if err != nil {
			log.Printf("[PRINT-ERROR] Error consultando servidor remoto %s: %v", h.RemoteURL, err)
			ErrorResponse(w, http.StatusBadGateway, "No se pudo consultar el activo en el servidor remoto")
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			ErrorResponse(w, http.StatusNotFound, "Activo no encontrado en servidor remoto")
			return
		} else if resp.StatusCode != http.StatusOK {
			ErrorResponse(w, resp.StatusCode, "Error al obtener activo del servidor remoto")
			return
		}
		if err := json.NewDecoder(resp.Body).Decode(&asset); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al decodificar activo remoto")
			return
		}
	} else {
		ErrorResponse(w, http.StatusInternalServerError, "Sin conexión a base de datos ni servidor remoto")
		return
	}

	// 2. Localizar script y plantilla
	scriptPath := findPrintScript()
	templatePath := findLabelTemplate()

	if scriptPath == "" {
		ErrorResponse(w, http.StatusInternalServerError, "Script de impresión scripts/print_label.ps1 no encontrado.")
		return
	}
	if templatePath == "" {
		ErrorResponse(w, http.StatusNotFound, "Plantilla templates/etiqueta.lbx no encontrada.")
		return
	}

	// 3. Nombre de la impresora (por defecto Brother PT-D410)
	printerName := r.URL.Query().Get("printer")
	if printerName == "" {
		printerName = "Brother PT-D410"
	}

	// 4. Preparar textos
	brandModel := strings.TrimSpace(fmt.Sprintf("%s %s", asset.Brand, asset.Model))
	if brandModel == "" {
		brandModel = string(asset.Category)
	}

	// El código de barras lleva el número de serie, y si no tiene serial, lleva el tag
	barcodeValue := strings.TrimSpace(asset.SerialNumber)
	if barcodeValue == "" || strings.EqualFold(barcodeValue, "NO LEGIBLE") || strings.EqualFold(barcodeValue, "NA") || strings.EqualFold(barcodeValue, "N/A") {
		barcodeValue = strings.TrimSpace(asset.AssetTag)
	}

	log.Printf("[PRINT-JOB] Imprimiendo con b-PAC: Tag=%s, Modelo=%s, Barcode=%s en %s", asset.AssetTag, brandModel, barcodeValue, printerName)

	// 5. Invocar PowerShell con b-PAC
	cmd := exec.Command("powershell", "-ExecutionPolicy", "Bypass", "-File", scriptPath,
		"-templatePath", templatePath,
		"-printerName", printerName,
		"-brandModel", brandModel,
		"-assetTag", asset.AssetTag,
		"-barcodeValue", barcodeValue,
	)

	out, err := cmd.CombinedOutput()
	outputStr := strings.TrimSpace(string(out))

	if err != nil {
		log.Printf("[PRINT-ERROR] Error b-PAC: %v - Salida: %s", err, outputStr)
		ErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error al imprimir con b-PAC: %s", outputStr))
		return
	}

	log.Printf("[PRINT-SUCCESS] %s", outputStr)

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":        "success",
		"message":       fmt.Sprintf("Etiqueta de %s enviada exitosamente a %s", asset.AssetTag, printerName),
		"asset_tag":     asset.AssetTag,
		"serial_number": asset.SerialNumber,
		"barcode_value": barcodeValue,
		"brand_model":   brandModel,
		"printer":       printerName,
	})
}

func findPrintScript() string {
	candidates := []string{
		"scripts/print_label.ps1",
		"./scripts/print_label.ps1",
		"../scripts/print_label.ps1",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	return ""
}

func findLabelTemplate() string {
	candidates := []string{
		"templates/etiqueta.lbx",
		"./templates/etiqueta.lbx",
		"../templates/etiqueta.lbx",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, err := filepath.Abs(c)
			if err == nil {
				return abs
			}
			return c
		}
	}
	return ""
}
