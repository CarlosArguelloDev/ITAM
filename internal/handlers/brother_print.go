package handlers

import (
	"archive/zip"
	"bytes"
	"database/sql"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/go-chi/chi/v5"
	"opti-itam/internal/models"
)

// PrintAssetLabelBrother imprime la etiqueta física del activo en Brother PT-D410
func (h *AppHandler) PrintAssetLabelBrother(w http.ResponseWriter, r *http.Request) {
	assetID := chi.URLParam(r, "id")
	if assetID == "" {
		ErrorResponse(w, http.StatusBadRequest, "ID de activo requerido")
		return
	}

	// 1. Obtener activo desde BD
	var asset models.Asset
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

	// 2. Verificar existencia del ejecutable de Brother P-touch Editor
	ptouchExe := findPtouchEditorExe()
	if ptouchExe == "" {
		ErrorResponse(w, http.StatusServiceUnavailable, "Brother P-touch Editor no encontrado en el sistema. Verifica que esté instalado.")
		return
	}

	// 3. Buscar plantilla de etiqueta .lbx
	templatePath := findLabelTemplate()
	if templatePath == "" {
		ErrorResponse(w, http.StatusNotFound, "Plantilla etiqueta.lbx no encontrada en la carpeta templates/.")
		return
	}

	// 4. Nombre de la impresora (por defecto Brother PT-D410)
	printerName := r.URL.Query().Get("printer")
	if printerName == "" {
		printerName = "Brother PT-D410"
	}

	// 5. Generar archivo .lbx temporal con los datos del activo inyectados
	tempLbxPath, err := generateCustomLbx(templatePath, asset)
	if err != nil {
		log.Printf("[PRINT-ERROR] Error al generar .lbx personalizado: %v", err)
		ErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error al preparar plantilla: %v", err))
		return
	}

	// 6. Lanzar impresión mediante PtouchEditor6 /pt
	log.Printf("[PRINT-JOB] Enviando activo %s (%s %s) a %s mediante %s", asset.AssetTag, asset.Brand, asset.Model, printerName, ptouchExe)
	
	// Ejecutar comando: PtouchEditor6.Wpf.exe /pt "<tempFile>" "<printerName>"
	cmd := exec.Command(ptouchExe, "/pt", tempLbxPath, printerName)
	if err := cmd.Start(); err != nil {
		log.Printf("[PRINT-ERROR] Error al ejecutar P-touch Editor: %v", err)
		ErrorResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error al enviar orden a impresora: %v", err))
		return
	}

	// Limpiar archivo temporal después de unos segundos en una goroutine
	go func(path string, c *exec.Cmd) {
		// Esperar a que el proceso termine o timeout de 15 segundos
		done := make(chan error, 1)
		go func() {
			done <- c.Wait()
		}()

		select {
		case <-done:
		case <-time.After(15 * time.Second):
		}

		time.Sleep(2 * time.Second)
		_ = os.Remove(path)
	}(tempLbxPath, cmd)

	JSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":      "success",
		"message":     fmt.Sprintf("Etiqueta de %s enviada exitosamente a %s", asset.AssetTag, printerName),
		"asset_tag":   asset.AssetTag,
		"brand_model": fmt.Sprintf("%s %s", asset.Brand, asset.Model),
		"printer":     printerName,
	})
}

// findPtouchEditorExe localiza el ejecutable de Brother P-touch Editor
func findPtouchEditorExe() string {
	candidates := []string{
		`C:\Program Files (x86)\Brother\P-touch Editor\6\PtouchEditor6.Wpf.exe`,
		`C:\Program Files\Brother\P-touch Editor\6\PtouchEditor6.Wpf.exe`,
		`C:\Program Files (x86)\Brother\P-touch Editor 5.4\PtEdit.exe`,
		`C:\Program Files\Brother\P-touch Editor 5.4\PtEdit.exe`,
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return ""
}

// findLabelTemplate busca la plantilla etiqueta.lbx
func findLabelTemplate() string {
	candidates := []string{
		"templates/etiqueta.lbx",
		"./templates/etiqueta.lbx",
		"../templates/etiqueta.lbx",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			return c
		}
	}
	return ""
}

// generateCustomLbx lee el template base (.lbx = zip), inyecta los datos en label.xml y escribe un nuevo .lbx temporal
func generateCustomLbx(templatePath string, asset models.Asset) (string, error) {
	r, err := zip.OpenReader(templatePath)
	if err != nil {
		return "", fmt.Errorf("error al abrir plantilla zip: %w", err)
	}
	defer r.Close()

	// Crear archivo temporal de salida
	tempFile, err := os.CreateTemp("", fmt.Sprintf("opti_label_%s_*.lbx", asset.AssetTag))
	if err != nil {
		return "", fmt.Errorf("error al crear archivo temporal: %w", err)
	}
	defer tempFile.Close()

	w := zip.NewWriter(tempFile)
	defer w.Close()

	// Preparar textos
	brandModel := strings.TrimSpace(fmt.Sprintf("%s %s", asset.Brand, asset.Model))
	if brandModel == "" {
		brandModel = string(asset.Category)
	}
	brandModel = strings.ToUpper(brandModel)
	brandModelLen := utf8.RuneCountInString(brandModel)

	assetTag := strings.TrimSpace(asset.AssetTag)
	assetTagLen := utf8.RuneCountInString(assetTag)

	for _, file := range r.File {
		rc, err := file.Open()
		if err != nil {
			return "", err
		}

		fw, err := w.Create(file.Name)
		if err != nil {
			rc.Close()
			return "", err
		}

		if file.Name == "label.xml" {
			buf := new(bytes.Buffer)
			if _, err := io.Copy(buf, rc); err != nil {
				rc.Close()
				return "", err
			}
			rc.Close()

			xmlContent := buf.String()

			// 1. Reemplazar código de barras (Barcode)
			// Busca el nodo barcode que tenga objectName="Barcode" y actualiza su <pt:data>...</pt:data>
			barcodeRegex := regexp.MustCompile(`(?s)(<barcode:barcode[^>]*>.*?objectName="Barcode".*?<pt:data>)(.*?)(</pt:data>.*?</barcode:barcode>)`)
			if barcodeRegex.MatchString(xmlContent) {
				xmlContent = barcodeRegex.ReplaceAllString(xmlContent, fmt.Sprintf("${1}%s${3}", assetTag))
			} else {
				// Fallback simple si el orden de atributos difiere
				simpleBarcodeRegex := regexp.MustCompile(`(?s)(objectName="Barcode"[^>]*>.*?<pt:data>)(.*?)(</pt:data>)`)
				xmlContent = simpleBarcodeRegex.ReplaceAllString(xmlContent, fmt.Sprintf("${1}%s${3}", assetTag))
			}

			// 2. Reemplazar txtBrandModel (o txtModelBrand)
			brandFont := `<text:ptFontInfo><text:logFont name="Leelawadee UI" width="0" italic="false" weight="700" charSet="0" pitchAndFamily="34"></text:logFont><text:fontExt effect="OUTLINE" underline="0" strikeout="0" size="5.4pt" orgSize="28.8pt" textColor="#000000" textPrintColorNumber="1"></text:fontExt></text:ptFontInfo>`
			brandReplacement := fmt.Sprintf(`<pt:data>%s</pt:data><text:stringItem charLen="%d">%s</text:stringItem></text:text>`, brandModel, brandModelLen, brandFont)

			brandRegex := regexp.MustCompile(`(?s)(objectName="txt(?:BrandModel|ModelBrand)"[^>]*>.*?)(<pt:data>.*?</text:text>)`)
			if brandRegex.MatchString(xmlContent) {
				xmlContent = brandRegex.ReplaceAllString(xmlContent, fmt.Sprintf("${1}%s", brandReplacement))
			}

			// 3. Reemplazar txtAssetTag
			tagFont := `<text:ptFontInfo><text:logFont name="Helsinki" width="0" italic="false" weight="700" charSet="0" pitchAndFamily="34"></text:logFont><text:fontExt effect="REVERSAL" underline="0" strikeout="0" size="16pt" orgSize="28.8pt" textColor="#000000" textPrintColorNumber="1"></text:fontExt></text:ptFontInfo>`
			tagReplacement := fmt.Sprintf(`<pt:data>%s</pt:data><text:stringItem charLen="%d">%s</text:stringItem></text:text>`, assetTag, assetTagLen, tagFont)

			tagRegex := regexp.MustCompile(`(?s)(objectName="txtAssetTag"[^>]*>.*?)(<pt:data>.*?</text:text>)`)
			if tagRegex.MatchString(xmlContent) {
				xmlContent = tagRegex.ReplaceAllString(xmlContent, fmt.Sprintf("${1}%s", tagReplacement))
			}

			if _, err := io.WriteString(fw, xmlContent); err != nil {
				return "", err
			}
		} else {
			// Copiar cualquier otro archivo tal cual (ej. prop.xml)
			if _, err := io.Copy(fw, rc); err != nil {
				rc.Close()
				return "", err
			}
			rc.Close()
		}
	}

	return tempFile.Name(), nil
}
