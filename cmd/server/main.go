package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"opti-itam/internal/db"
	"opti-itam/internal/handlers"
	"opti-itam/web"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/opti.db"
	}

	uploadsDir := os.Getenv("UPLOADS_DIR")
	if uploadsDir == "" {
		uploadsDir = "./data/uploads"
	}

	log.Printf("[ITAM] Iniciando Opti ITAM Server en puerto %s...", port)
	log.Printf("[ITAM] Ruta de base de datos SQLite: %s", dbPath)
	log.Printf("[ITAM] Ruta de almacenamiento de archivos: %s", uploadsDir)

	// Inicializar SQLite con PRAGMA WAL, foreign keys y migraciones
	database, err := db.InitDB(dbPath)
	if err != nil {
		log.Fatalf("[ITAM-FATAL] Error crítico al inicializar base de datos: %v", err)
	}
	defer database.Close()

	// Crear manejador de endpoints
	appHandler := handlers.NewAppHandler(database, uploadsDir)

	r := chi.NewRouter()

	// Middlewares esenciales
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	// Configuración de CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Rutas de API REST
	r.Route("/api", func(api chi.Router) {
		// Health check y estado del sistema
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			handlers.JSONResponse(w, http.StatusOK, map[string]interface{}{
				"status":    "healthy",
				"system":    "Opti ITAM (Raspberry Pi ARM64)",
				"database":  "SQLite3 WAL",
				"timestamp": time.Now().UTC().Format(time.RFC3339),
				"version":   "1.0.0",
			})
		})

		// Dashboard KPIs y Centro de Alertas
		api.Get("/stats", appHandler.GetStats)
		api.Get("/alerts", appHandler.GetAlerts)

		// Gestión de Usuarios
		api.Route("/users", func(u chi.Router) {
			u.Get("/", appHandler.ListUsers)
			u.Post("/", appHandler.CreateUser)
			u.Get("/{id}", appHandler.GetUser)
			u.Put("/{id}", appHandler.UpdateUser)
			u.Delete("/{id}", appHandler.DeleteUser)
			u.Get("/{id}/diagram", appHandler.GetUserDiagram)
			u.Get("/{id}/responsiva-data", appHandler.GetResponsivaData)
		})

		// Gestión de Activos (Assets)
		api.Route("/assets", func(a chi.Router) {
			a.Get("/", appHandler.ListAssets)
			a.Post("/", appHandler.CreateAsset)
			a.Get("/{id}", appHandler.GetAsset)
			a.Put("/{id}", appHandler.UpdateAsset)
			a.Delete("/{id}", appHandler.DeleteAsset)
			a.Get("/{id}/history", appHandler.GetAssetHistory)
			a.Get("/tag/{tag}", appHandler.GetAssetByTag)

			// Acciones de ciclo de vida
			a.Post("/assign", appHandler.AssignAsset)
			a.Post("/unassign", appHandler.UnassignAsset)
			a.Post("/swap", appHandler.SwapAsset)
		})

		// Responsivas y Carga de Documentos
		api.Route("/responsivas", func(resp chi.Router) {
			resp.Post("/upload", appHandler.UploadSignedResponsiva)
			resp.Get("/file/{filename}", appHandler.ServeResponsivaFile)
			resp.Get("/pending", appHandler.ListPendingResponsivas)
		})

		// Centro de Discrepancias
		api.Route("/discrepancies", func(disc chi.Router) {
			disc.Get("/", appHandler.ListAllDiscrepancies)
			disc.Post("/{id}/resolve", appHandler.ResolveDiscrepancy)
		})

		// Campañas de Auditoría y Conciliación Físico vs. Lógico
		api.Route("/audits", func(aud chi.Router) {
			aud.Get("/campaigns", appHandler.ListCampaigns)
			aud.Post("/campaigns", appHandler.CreateCampaign)
			aud.Get("/campaigns/{id}", appHandler.GetCampaign)
			aud.Post("/campaigns/{id}/close", appHandler.CloseCampaign)
			aud.Post("/campaigns/{id}/scan", appHandler.ScanAsset)
			aud.Get("/campaigns/{id}/discrepancies", appHandler.ListDiscrepancies)
			aud.Get("/discrepancies", appHandler.ListAllDiscrepancies)
			aud.Post("/discrepancies/{id}/resolve", appHandler.ResolveDiscrepancy)

			// Auditoría Dirigida por Persona o Sede/Site
			aud.Get("/target-assets", appHandler.GetTargetExpectedAssets)
			aud.Post("/target-scan", appHandler.ScanTargetAsset)
			aud.Post("/target-finish", appHandler.FinishTargetAudit)
			aud.Post("/target-reconcile", appHandler.ReconcileTargetAsset)
		})
	})

	// Servir frontend compilado estático embebido (SPA)
	distFS, err := web.GetFileSystem()
	if err != nil {
		log.Printf("[ITAM-WARN] Error al obtener filesystem embebido: %v", err)
	}

	fileServer := http.FileServer(http.FS(distFS))

	// Handler SPA para enrutamiento del lado del cliente
	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		path := strings.TrimPrefix(req.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Comprobar si el archivo solicitado existe en el filesystem estático
		f, err := distFS.Open(path)
		if err == nil {
			f.Close()
			fileServer.ServeHTTP(w, req)
			return
		}

		// Si el archivo no existe y no es API, servir index.html (fallback SPA)
		indexFile, err := distFS.Open("index.html")
		if err != nil {
			http.NotFound(w, req)
			return
		}
		defer indexFile.Close()

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		io.Copy(w, indexFile)
	})

	serverAddr := fmt.Sprintf(":%s", port)
	log.Printf("[ITAM-READY] Servidor web listo y escuchando en http://0.0.0.0%s", serverAddr)
	if err := http.ListenAndServe(serverAddr, r); err != nil {
		log.Fatalf("[ITAM-FATAL] Fallo al iniciar servidor HTTP: %v", err)
	}
}
