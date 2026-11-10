package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"opti-itam/internal/models"
)

// GetStats consolida las métricas clave para el Dashboard y gráficos
func (h *AppHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	stats := models.DashboardStats{
		CategoryCounts: make(map[string]int),
		StatusCounts:   make(map[string]int),
		LocationCounts: make(map[string]int),
	}

	// Total de activos
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM assets").Scan(&stats.TotalAssets)

	// Total de usuarios activos
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM users WHERE is_active = 1").Scan(&stats.TotalUsers)

	// Activos por categoría
	catRows, err := h.DB.Query("SELECT category, COUNT(*) FROM assets GROUP BY category")
	if err == nil {
		defer catRows.Close()
		for catRows.Next() {
			var cat string
			var count int
			if err := catRows.Scan(&cat, &count); err == nil {
				stats.CategoryCounts[cat] = count
			}
		}
	}

	// Activos por estado
	statusRows, err := h.DB.Query("SELECT status, COUNT(*) FROM assets GROUP BY status")
	if err == nil {
		defer statusRows.Close()
		for statusRows.Next() {
			var st string
			var count int
			if err := statusRows.Scan(&st, &count); err == nil {
				stats.StatusCounts[st] = count
			}
		}
	}

	// Activos por ubicación
	locRows, err := h.DB.Query("SELECT location, COUNT(*) AS cnt FROM assets WHERE location != '' GROUP BY location ORDER BY cnt DESC LIMIT 10")
	if err == nil {
		defer locRows.Close()
		for locRows.Next() {
			var loc string
			var count int
			if err := locRows.Scan(&loc, &count); err == nil {
				stats.LocationCounts[loc] = count
			}
		}
	}

	// Discrepancias activas (no resueltas)
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM audit_scans WHERE discrepancy_type != 'MATCH' AND resolved = 0").Scan(&stats.ActiveDiscrepancies)

	// Responsivas pendientes
	_ = h.DB.QueryRow("SELECT COUNT(*) FROM asset_history WHERE responsiva_status = 'PENDING'").Scan(&stats.PendingResponsivas)

	// Garantías que vencen en los próximos 30 días o ya vencidas
	in30DaysStr := time.Now().AddDate(0, 0, 30).Format("2006-01-02")
	_ = h.DB.QueryRow(`
		SELECT COUNT(*) FROM assets
		WHERE warranty_expiry IS NOT NULL 
		  AND warranty_expiry != '' 
		  AND warranty_expiry <= ?
		  AND status NOT IN ('RETIRED', 'LOST')
	`, in30DaysStr).Scan(&stats.ExpiringWarranties30Days)

	// Activos sin auditar por más de 90 días (o nunca auditados)
	ninetyDaysAgo := time.Now().AddDate(0, 0, -90).Format("2006-01-02 15:04:05")
	_ = h.DB.QueryRow(`
		SELECT COUNT(*) FROM assets
		WHERE status IN ('ASSIGNED', 'AVAILABLE')
		  AND (last_audited_at IS NULL OR last_audited_at < ?)
	`, ninetyDaysAgo).Scan(&stats.UnauditedAssetsOver90Days)

	JSONResponse(w, http.StatusOK, stats)
}

// GetAlerts genera el listado unificado de advertencias prioritarias
func (h *AppHandler) GetAlerts(w http.ResponseWriter, r *http.Request) {
	alerts := []models.AlertItem{}

	// 1. Discrepancias activas (HIGH SEVERITY)
	discRows, err := h.DB.Query(`
		SELECT s.id, s.asset_id, a.asset_tag, a.model, s.discrepancy_type, s.expected_location, s.found_location,
		       s.expected_user_id, u_exp.full_name, s.found_with_user_id, u_fnd.full_name, s.scanned_at
		FROM audit_scans s
		JOIN assets a ON s.asset_id = a.id
		LEFT JOIN users u_exp ON s.expected_user_id = u_exp.id
		LEFT JOIN users u_fnd ON s.found_with_user_id = u_fnd.id
		WHERE s.discrepancy_type != 'MATCH' AND s.resolved = 0
		ORDER BY s.scanned_at DESC
	`)
	if err == nil {
		defer discRows.Close()
		for discRows.Next() {
			var scanID, assetID, assetTag, model, discType, expLoc, fndLoc string
			var expUID, expUName, fndUID, fndUName *string
			var scannedAt time.Time
			if err := discRows.Scan(&scanID, &assetID, &assetTag, &model, &discType, &expLoc, &fndLoc, &expUID, &expUName, &fndUID, &fndUName, &scannedAt); err == nil {
				desc := ""
				switch discType {
				case models.DiscrepancyWrongUser:
					expN := "Sin Asignar"
					if expUName != nil {
						expN = *expUName
					}
					fndN := "Sin Asignar"
					if fndUName != nil {
						fndN = *fndUName
					}
					desc = "Custodia indebida: Lógicamente asignado a " + expN + ", pero hallado con " + fndN
				case models.DiscrepancyWrongLocation:
					desc = "Ubicación incorrecta: Esperado en " + expLoc + ", pero encontrado en " + fndLoc
				case models.DiscrepancyMissing:
					desc = "Equipo faltante: No fue detectado durante el barrido físico"
				default:
					desc = "Discrepancia detectada en auditoría física"
				}

				alerts = append(alerts, models.AlertItem{
					ID:          "alt-disc-" + scanID,
					Severity:    "HIGH",
					Type:        "ACTIVE_DISCREPANCY",
					Title:       "Discrepancia Física: " + assetTag + " (" + model + ")",
					Description: desc,
					AssetID:     &assetID,
					AssetTag:    &assetTag,
					UserID:      fndUID,
					UserName:    fndUName,
					Date:        scannedAt,
				})
			}
		}
	}

	// 2. Responsivas pendientes de firma (HIGH / MEDIUM SEVERITY)
	respRows, err := h.DB.Query(`
		SELECT h.id, h.asset_id, a.asset_tag, a.model, h.new_user_id, u.full_name, h.action_type, h.created_at
		FROM asset_history h
		JOIN assets a ON h.asset_id = a.id
		LEFT JOIN users u ON h.new_user_id = u.id
		WHERE h.responsiva_status = 'PENDING'
		ORDER BY h.created_at DESC
	`)
	if err == nil {
		defer respRows.Close()
		for respRows.Next() {
			var histID, assetID, assetTag, model, actionType string
			var userID, userName *string
			var createdAt time.Time
			if err := respRows.Scan(&histID, &assetID, &assetTag, &model, &userID, &userName, &actionType, &createdAt); err == nil {
				uName := "Empleado"
				if userName != nil {
					uName = *userName
				}
				alerts = append(alerts, models.AlertItem{
					ID:          "alt-resp-" + histID,
					Severity:    "MEDIUM",
					Type:        "PENDING_RESPONSIVA",
					Title:       "Responsiva Pendiente de Firma: " + assetTag,
					Description: "Movimiento de " + actionType + " para " + uName + " pendiente de cargar documento firmado",
					AssetID:     &assetID,
					AssetTag:    &assetTag,
					UserID:      userID,
					UserName:    userName,
					Date:        createdAt,
				})
			}
		}
	}

	// 3. Activos sin auditar > 90 días (MEDIUM SEVERITY)
	ninetyDaysAgo := time.Now().AddDate(0, 0, -90).Format("2006-01-02 15:04:05")
	unauditedRows, err := h.DB.Query(`
		SELECT a.id, a.asset_tag, a.brand, a.model, a.location, a.assigned_to_user_id, u.full_name, a.last_audited_at
		FROM assets a
		LEFT JOIN users u ON a.assigned_to_user_id = u.id
		WHERE a.status IN ('ASSIGNED', 'AVAILABLE')
		  AND (a.last_audited_at IS NULL OR a.last_audited_at < ?)
		ORDER BY a.last_audited_at ASC NULLS FIRST
		LIMIT 15
	`, ninetyDaysAgo)
	if err == nil {
		defer unauditedRows.Close()
		for unauditedRows.Next() {
			var id, tag, brand, model, loc string
			var uid, uname *string
			var lastAudited sql.NullTime
			if err := unauditedRows.Scan(&id, &tag, &brand, &model, &loc, &uid, &uname, &lastAudited); err == nil {
				desc := "No ha sido escaneado físicamente en más de 90 días"
				var alertDate time.Time
				if lastAudited.Valid {
					desc = "Última auditoría física registrada: " + lastAudited.Time.Format("2006-01-02")
					alertDate = lastAudited.Time
				} else {
					desc = "Nunca ha tenido una auditoría física registrada"
					alertDate = time.Now().AddDate(0, -6, 0)
				}

				alerts = append(alerts, models.AlertItem{
					ID:          "alt-audit-" + id,
					Severity:    "MEDIUM",
					Type:        "UNAUDITED_90_DAYS",
					Title:       "Activo Sin Auditar: " + tag + " (" + brand + " " + model + ")",
					Description: desc + " | Ubicación: " + loc,
					AssetID:     &id,
					AssetTag:    &tag,
					UserID:      uid,
					UserName:    uname,
					Date:        alertDate,
				})
			}
		}
	}

	// 4. Garantías próximas a vencer en menos de 30 días (INFO/MEDIUM SEVERITY)
	in30Days := time.Now().AddDate(0, 0, 30).Format("2006-01-02")
	warrantyRows, err := h.DB.Query(`
		SELECT a.id, a.asset_tag, a.brand, a.model, a.warranty_expiry, a.assigned_to_user_id, u.full_name
		FROM assets a
		LEFT JOIN users u ON a.assigned_to_user_id = u.id
		WHERE a.warranty_expiry IS NOT NULL 
		  AND a.warranty_expiry != '' 
		  AND a.warranty_expiry <= ?
		  AND a.status NOT IN ('RETIRED', 'LOST')
		ORDER BY a.warranty_expiry ASC
		LIMIT 10
	`, in30Days)
	if err == nil {
		defer warrantyRows.Close()
		for warrantyRows.Next() {
			var id, tag, brand, model, expiry string
			var uid, uname *string
			if err := warrantyRows.Scan(&id, &tag, &brand, &model, &expiry, &uid, &uname); err == nil {
				parsedDate, _ := time.Parse("2006-01-02", expiry)
				severity := "INFO"
				if parsedDate.Before(time.Now()) {
					severity = "MEDIUM"
				}
				alerts = append(alerts, models.AlertItem{
					ID:          "alt-warr-" + id,
					Severity:    severity,
					Type:        "EXPIRING_WARRANTY",
					Title:       "Garantía Próxima a Vencer: " + tag + " (" + brand + " " + model + ")",
					Description: "Vencimiento estipulado el " + expiry,
					AssetID:     &id,
					AssetTag:    &tag,
					UserID:      uid,
					UserName:    uname,
					Date:        parsedDate,
				})
			}
		}
	}

	JSONResponse(w, http.StatusOK, alerts)
}
