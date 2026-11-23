package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"opti-itam/internal/models"
)

// ListConsumables devuelve el catálogo y stock actual de tóners, cartuchos y consumibles
func (h *AppHandler) ListConsumables(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT id, code, name, kind, brand, color, compatible_models, location,
		       stock, min_stock, ideal_stock, unit_cost, page_yield, notes, created_at, updated_at
		FROM consumables
		ORDER BY brand ASC, code ASC
	`)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al consultar consumibles: "+err.Error())
		return
	}
	defer rows.Close()

	list := []models.Consumable{}
	for rows.Next() {
		var c models.Consumable
		if err := rows.Scan(
			&c.ID, &c.Code, &c.Name, &c.Kind, &c.Brand, &c.Color, &c.CompatibleModels,
			&c.Location, &c.Stock, &c.MinStock, &c.IdealStock, &c.UnitCost, &c.PageYield,
			&c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error leyendo consumibles: "+err.Error())
			return
		}
		list = append(list, c)
	}
	JSONResponse(w, http.StatusOK, list)
}

// CreateConsumable registra un nuevo tóner/cartucho en el catálogo
func (h *AppHandler) CreateConsumable(w http.ResponseWriter, r *http.Request) {
	var req models.CreateConsumableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	req.Name = strings.TrimSpace(req.Name)
	req.Brand = strings.ToUpper(strings.TrimSpace(req.Brand))
	if req.Code == "" || req.Name == "" {
		ErrorResponse(w, http.StatusBadRequest, "El código (SKU) y nombre del consumible son obligatorios")
		return
	}

	if req.Kind == "" {
		req.Kind = "TONER"
	}
	if req.Color == "" {
		req.Color = "NEGRO"
	}
	if req.Location != "OPM" && req.Location != "OMEX" {
		req.Location = "OPM"
	}
	if req.Stock < 0 {
		req.Stock = 0
	}
	if req.MinStock < 0 {
		req.MinStock = 0
	}
	if req.IdealStock <= 0 {
		req.IdealStock = 4
	}
	if req.UnitCost < 0 {
		req.UnitCost = 0
	}
	if req.PageYield < 0 {
		req.PageYield = 0
	}

	newID := "cns-" + uuid.New().String()[:8]

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error de transacción: "+err.Error())
		return
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO consumables (id, code, name, kind, brand, color, compatible_models, location, stock, min_stock, ideal_stock, unit_cost, page_yield, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, newID, req.Code, req.Name, req.Kind, req.Brand, req.Color, strings.TrimSpace(req.CompatibleModels),
		req.Location, req.Stock, req.MinStock, req.IdealStock, req.UnitCost, req.PageYield, strings.TrimSpace(req.Notes))
	if err != nil {
		ErrorResponse(w, http.StatusConflict, "Error al registrar consumible (verifique que el código no esté repetido): "+err.Error())
		return
	}

	if req.Stock > 0 {
		movID := "cmv-" + uuid.New().String()[:8]
		_, err = tx.Exec(`
			INSERT INTO consumable_movements (id, consumable_id, movement_type, quantity, notes)
			VALUES (?, ?, 'IN', ?, 'Stock inicial al registrar consumible')
		`, movID, newID, req.Stock)
		if err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error al registrar movimiento inicial: "+err.Error())
			return
		}
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al confirmar transacción: "+err.Error())
		return
	}

	var created models.Consumable
	err = h.DB.QueryRow(`
		SELECT id, code, name, kind, brand, color, compatible_models, location,
		       stock, min_stock, ideal_stock, unit_cost, page_yield, notes, created_at, updated_at
		FROM consumables WHERE id = ?
	`, newID).Scan(
		&created.ID, &created.Code, &created.Name, &created.Kind, &created.Brand, &created.Color,
		&created.CompatibleModels, &created.Location, &created.Stock, &created.MinStock,
		&created.IdealStock, &created.UnitCost, &created.PageYield,
		&created.Notes, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al recuperar consumible creado: "+err.Error())
		return
	}

	JSONResponse(w, http.StatusCreated, created)
}

// UpdateConsumable actualiza los datos de catálogo de un consumible
func (h *AppHandler) UpdateConsumable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.CreateConsumableRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	req.Code = strings.ToUpper(strings.TrimSpace(req.Code))
	req.Name = strings.TrimSpace(req.Name)
	req.Brand = strings.ToUpper(strings.TrimSpace(req.Brand))
	if req.Code == "" || req.Name == "" {
		ErrorResponse(w, http.StatusBadRequest, "Código y nombre son obligatorios")
		return
	}
	if req.Location != "OPM" && req.Location != "OMEX" {
		req.Location = "OPM"
	}

	if req.IdealStock <= 0 {
		req.IdealStock = 4
	}
	res, err := h.DB.Exec(`
		UPDATE consumables
		SET code = ?, name = ?, kind = ?, brand = ?, color = ?, compatible_models = ?,
		    location = ?, min_stock = ?, ideal_stock = ?, unit_cost = ?, page_yield = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, req.Code, req.Name, req.Kind, req.Brand, req.Color, strings.TrimSpace(req.CompatibleModels),
		req.Location, req.MinStock, req.IdealStock, req.UnitCost, req.PageYield, strings.TrimSpace(req.Notes), id)
	if err != nil {
		ErrorResponse(w, http.StatusConflict, "Error al actualizar consumible: "+err.Error())
		return
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		ErrorResponse(w, http.StatusNotFound, "Consumible no encontrado")
		return
	}

	var updated models.Consumable
	_ = h.DB.QueryRow(`
		SELECT id, code, name, kind, brand, color, compatible_models, location,
		       stock, min_stock, ideal_stock, unit_cost, page_yield, notes, created_at, updated_at
		FROM consumables WHERE id = ?
	`, id).Scan(
		&updated.ID, &updated.Code, &updated.Name, &updated.Kind, &updated.Brand, &updated.Color,
		&updated.CompatibleModels, &updated.Location, &updated.Stock, &updated.MinStock,
		&updated.IdealStock, &updated.UnitCost, &updated.PageYield,
		&updated.Notes, &updated.CreatedAt, &updated.UpdatedAt,
	)
	JSONResponse(w, http.StatusOK, updated)
}

// DeleteConsumable elimina un consumible y su historial
func (h *AppHandler) DeleteConsumable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	res, err := h.DB.Exec("DELETE FROM consumables WHERE id = ?", id)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error al eliminar consumible: "+err.Error())
		return
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		ErrorResponse(w, http.StatusNotFound, "Consumible no encontrado")
		return
	}
	JSONResponse(w, http.StatusOK, map[string]string{"message": "Consumible eliminado"})
}

// MoveConsumable registra una entrada (IN), salida/instalación (OUT) o ajuste (ADJUST) de stock
func (h *AppHandler) MoveConsumable(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req models.ConsumableMovementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		ErrorResponse(w, http.StatusBadRequest, "Payload inválido: "+err.Error())
		return
	}

	if req.MovementType != "IN" && req.MovementType != "OUT" && req.MovementType != "ADJUST" {
		ErrorResponse(w, http.StatusBadRequest, "Tipo de movimiento inválido (IN, OUT o ADJUST)")
		return
	}
	if req.Quantity <= 0 && req.MovementType != "ADJUST" {
		ErrorResponse(w, http.StatusBadRequest, "La cantidad debe ser mayor a 0")
		return
	}
	if req.MovementType == "ADJUST" && req.Quantity < 0 {
		ErrorResponse(w, http.StatusBadRequest, "El stock ajustado no puede ser negativo")
		return
	}

	tx, err := h.DB.Begin()
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error de transacción: "+err.Error())
		return
	}
	defer tx.Rollback()

	var currentStock int
	err = tx.QueryRow("SELECT stock FROM consumables WHERE id = ?", id).Scan(&currentStock)
	if err == sql.ErrNoRows {
		ErrorResponse(w, http.StatusNotFound, "Consumible no encontrado")
		return
	} else if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error consultando stock: "+err.Error())
		return
	}

	var newStock int
	switch req.MovementType {
	case "IN":
		newStock = currentStock + req.Quantity
	case "OUT":
		if currentStock < req.Quantity {
			ErrorResponse(w, http.StatusBadRequest, "Stock insuficiente para realizar la salida")
			return
		}
		newStock = currentStock - req.Quantity
	case "ADJUST":
		newStock = req.Quantity
	}

	if _, err := tx.Exec(`
		UPDATE consumables SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
	`, newStock, id); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error actualizando stock: "+err.Error())
		return
	}

	var printerID *string
	if req.PrinterAssetID != nil && strings.TrimSpace(*req.PrinterAssetID) != "" {
		clean := strings.TrimSpace(*req.PrinterAssetID)
		printerID = &clean
	}

	movID := "cmv-" + uuid.New().String()[:8]
	if _, err := tx.Exec(`
		INSERT INTO consumable_movements (id, consumable_id, movement_type, quantity, printer_asset_id, department, notes)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, movID, id, req.MovementType, req.Quantity, printerID, strings.TrimSpace(req.Department), strings.TrimSpace(req.Notes)); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error registrando movimiento: "+err.Error())
		return
	}

	if err := tx.Commit(); err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error confirmando movimiento: "+err.Error())
		return
	}

	var updated models.Consumable
	_ = h.DB.QueryRow(`
		SELECT id, code, name, kind, brand, color, compatible_models, location,
		       stock, min_stock, ideal_stock, unit_cost, page_yield, notes, created_at, updated_at
		FROM consumables WHERE id = ?
	`, id).Scan(
		&updated.ID, &updated.Code, &updated.Name, &updated.Kind, &updated.Brand, &updated.Color,
		&updated.CompatibleModels, &updated.Location, &updated.Stock, &updated.MinStock,
		&updated.IdealStock, &updated.UnitCost, &updated.PageYield,
		&updated.Notes, &updated.CreatedAt, &updated.UpdatedAt,
	)
	JSONResponse(w, http.StatusOK, updated)
}

// ListConsumableMovements devuelve el historial reciente de entradas y salidas de consumibles
func (h *AppHandler) ListConsumableMovements(w http.ResponseWriter, r *http.Request) {
	consumableID := strings.TrimSpace(r.URL.Query().Get("consumable_id"))

	query := `
		SELECT m.id, m.consumable_id, c.code, c.name, m.movement_type, m.quantity,
		       m.printer_asset_id, a.asset_tag, a.model, m.department, m.notes, m.created_at
		FROM consumable_movements m
		JOIN consumables c ON c.id = m.consumable_id
		LEFT JOIN assets a ON a.id = m.printer_asset_id
		WHERE 1=1
	`
	args := []interface{}{}
	if consumableID != "" {
		query += " AND m.consumable_id = ?"
		args = append(args, consumableID)
	}
	query += " ORDER BY m.created_at DESC LIMIT 200"

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		ErrorResponse(w, http.StatusInternalServerError, "Error consultando movimientos: "+err.Error())
		return
	}
	defer rows.Close()

	list := []models.ConsumableMovement{}
	for rows.Next() {
		var m models.ConsumableMovement
		if err := rows.Scan(
			&m.ID, &m.ConsumableID, &m.ConsumableCode, &m.ConsumableName, &m.MovementType, &m.Quantity,
			&m.PrinterAssetID, &m.PrinterTag, &m.PrinterModel, &m.Department, &m.Notes, &m.CreatedAt,
		); err != nil {
			ErrorResponse(w, http.StatusInternalServerError, "Error leyendo movimientos: "+err.Error())
			return
		}
		list = append(list, m)
	}
	JSONResponse(w, http.StatusOK, list)
}
