package db

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaSQL string

//go:embed seed.sql
var seedSQL string

// InitDB inicializa la base de datos SQLite con configuraciones estrictas para bajo consumo
func InitDB(dbPath string) (*sql.DB, error) {
	// Asegurar que el directorio de datos existe
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("error al crear directorio para DB: %w", err)
	}

	// Abrir conexión SQLite con el driver modernc.org/sqlite (sin CGO)
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("error al abrir SQLite: %w", err)
	}

	// Configurar límite de conexiones para bajo consumo de RAM en Raspberry Pi
	db.SetMaxOpenConns(5)
	db.SetMaxIdleConns(2)

	// Ejecutar pragmas obligatorios para concurrencia WAL, consistencia y llaves foráneas
	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA foreign_keys=ON;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA cache_size=-2000;", // ~2MB de caché de páginas
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			return nil, fmt.Errorf("fallo al aplicar %s: %w", pragma, err)
		}
	}

	// Ejecutar migraciones DDL (schema.sql)
	if err := runMigrations(db); err != nil {
		return nil, fmt.Errorf("error ejecutando migraciones DDL: %w", err)
	}

	// Verificar si la base de datos está vacía para sembrar datos de prueba
	var userCount int
	err = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&userCount)
	if err == nil && userCount == 0 {
		log.Println("[ITAM-DB] Base de datos vacía detectada. Aplicando seed.sql inicial...")
		if err := runSeed(db); err != nil {
			log.Printf("[ITAM-DB] Advertencia al aplicar seed.sql: %v", err)
		} else {
			log.Println("[ITAM-DB] Datos semilla cargados exitosamente.")
		}
	}

	log.Printf("[ITAM-DB] SQLite inicializada exitosamente en modo WAL: %s", dbPath)
	return db, nil
}

func runMigrations(db *sql.DB) error {
	if _, err := db.Exec(schemaSQL); err != nil {
		return err
	}

	// Migraciones incrementales seguras para bases de datos existentes
	alters := []string{
		"ALTER TABLE audit_campaigns ADD COLUMN target_type TEXT NOT NULL DEFAULT 'LOCATION';",
		"ALTER TABLE audit_campaigns ADD COLUMN target_id TEXT NULLABLE;",
		"ALTER TABLE audit_campaigns ADD COLUMN target_name TEXT NOT NULL DEFAULT '';",
		"ALTER TABLE audit_campaigns ADD COLUMN total_expected INTEGER NOT NULL DEFAULT 0;",
		"ALTER TABLE audit_campaigns ADD COLUMN total_scanned INTEGER NOT NULL DEFAULT 0;",
		"ALTER TABLE audit_campaigns ADD COLUMN total_matches INTEGER NOT NULL DEFAULT 0;",
		"ALTER TABLE audit_campaigns ADD COLUMN total_discrepancies INTEGER NOT NULL DEFAULT 0;",
		"ALTER TABLE audit_campaigns ADD COLUMN total_missing INTEGER NOT NULL DEFAULT 0;",
		"ALTER TABLE audit_campaigns ADD COLUMN notes TEXT NULLABLE;",
		"ALTER TABLE audit_scans ADD COLUMN notes TEXT NULLABLE;",
	}
	for _, alter := range alters {
		_, _ = db.Exec(alter)
	}

	return nil
}

func runSeed(db *sql.DB) error {
	_, err := db.Exec(seedSQL)
	return err
}
