package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

type AppHandler struct {
	DB         *sql.DB
	UploadsDir string
	RemoteURL  string
}

func NewAppHandler(db *sql.DB, uploadsDir string) *AppHandler {
	return &AppHandler{
		DB:         db,
		UploadsDir: uploadsDir,
	}
}

// JSONResponse envía una respuesta JSON estructurada
func JSONResponse(w http.ResponseWriter, statusCode int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(statusCode)
	if payload != nil {
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			http.Error(w, `{"error":"error al serializar respuesta JSON"}`, http.StatusInternalServerError)
		}
	}
}

// ErrorResponse envía una respuesta de error en formato JSON
func ErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	JSONResponse(w, statusCode, map[string]string{
		"error": message,
	})
}

// ParseNullTime parsea un string de fecha nullable de SQLite a *time.Time
func ParseNullTime(s *string) *time.Time {
	if s == nil || *s == "" {
		return nil
	}
	formats := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02T15:04:05",
		"2006-01-02 15:04:05-07:00",
		"2006-01-02",
	}
	for _, f := range formats {
		if t, err := time.Parse(f, *s); err == nil {
			return &t
		}
	}
	return nil
}
