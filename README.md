# Opti ITAM (IT Asset Management)
> Sistema autohospedado de gestión de activos de TI y control de custodia, optimizado para **Raspberry Pi (ARM64)** con consumo de memoria menor a **40 MB RAM**.

---

## 🚀 Arquitectura y Tecnologías Clave

- **Backend:** Go 1.23+ con `go-chi/chi/v5` y CORS nativo.
- **Base de Datos:** SQLite3 puro sin CGO (`modernc.org/sqlite`) operando con:
  ```sql
  PRAGMA journal_mode=WAL;
  PRAGMA synchronous=NORMAL;
  PRAGMA foreign_keys=ON;
  PRAGMA busy_timeout=5000;
  PRAGMA cache_size=-2000; -- ~2MB de caché de páginas
  ```
- **Monolito en Binario Único:** El frontend compilado (`web/dist/`) se incrusta en el ejecutable final mediante `embed.FS` de Go, eliminando dependencias externas o servidores Node en producción.
- **Frontend:** React 18 + TypeScript + Vite (SPA pura, sin SSR para cero sobrecarga de servidor).
- **Estilos e Interfaz:** Tailwind CSS con diseño SaaS corporativo (`#F8FAFC`, `#FFFFFF`, `#E2E8F0`, tipografía `Inter`).
- **Diagramas de Custodia:** `@xyflow/react` (React Flow) para visualizar la relación jerárquica: Usuario ➔ Laptop Primaria ➔ Docks, Monitores y Periféricos satélites.
- **Códigos QR y Auditoría:** `qrcode.react` (para generación de etiquetas imprimibles) y `html5-qrcode` (lector con cámara web/móvil o pistola de códigos de barras).
- **Arquitectura de Responsivas:** Desacoplada y lista para motor de PDF en fase posterior; provee el endpoint JSON de acta estructurada (`/api/users/:id/responsiva-data`), previsualización en pantalla y carga de documentos firmados a `/app/data/uploads/`.

---

## 📁 Estructura del Proyecto

```text
Opti/
├── cmd/
│   └── server/
│       └── main.go                 # Servidor HTTP, API REST, SPA fallback y embed.FS
├── internal/
│   ├── db/
│   │   ├── db.go                  # SQLite WAL sin CGO, pragmas y migraciones
│   │   ├── schema.sql             # Tablas: users, assets, asset_history, audit_campaigns, audit_scans
│   │   └── seed.sql               # Datos iniciales realistas (Laptops Dell, Docks WD19, Monitores)
│   ├── handlers/
│   │   ├── handlers.go            # Utilidades JSON y parseo de fechas SQLite
│   │   ├── users.go               # ABM usuarios y generación de topología para React Flow
│   │   ├── assets.go              # ABM activos, asignación, desasignación y Swap atómico
│   │   ├── audits.go              # Campañas de inventario, escaneo y resolución 1-clic
│   │   ├── responsivas.go         # Endpoint de datos de responsiva y carga de firmas
│   │   └── stats.go               # Métricas para el Dashboard y centro de alertas
│   └── models/
│       └── models.go              # Entidades y DTOs
├── web/                           # Aplicación SPA en React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/            # Sidebar, Header, Modales (Responsiva, QR, Scanner, Swap, AssetForm)
│   │   ├── views/                 # Dashboard, Assets, Users & Diagrams, Discrepancies, Alerts, Documents
│   │   ├── api.ts                 # Cliente HTTP fuertemente tipado
│   │   └── types.ts               # Modelos de TypeScript
│   └── embed.go                   # go:embed all:dist
├── data/
│   └── uploads/                   # Carpeta de persistencia para documentos escaneados y base SQLite
├── Dockerfile                     # Multi-stage build optimizado para ARM64
├── docker-compose.yml             # Despliegue con límites estrictos de memoria (<80MB RAM)
└── README.md
```

---

## ⚡ Ejecución Rápida

### Con Docker Compose (Recomendado para Producción y ARM64)
```bash
docker compose up -d --build
```
El sistema estará disponible en `http://localhost:8080`. Toda la información de la base de datos y archivos firmados se mantendrá en `./data`.

### Ejecución Local Nativa (Windows / Linux / macOS)
1. **Compilar el frontend:**
   ```bash
   cd web
   npm install
   npm run build
   cd ..
   ```
2. **Compilar y arrancar el backend en Go:**
   ```bash
   go build -o opti-itam ./cmd/server
   ./opti-itam
   ```
3. Abrir navegador en `http://localhost:8080`.

---

## 📊 Endpoints de la API REST

### Dashboard & Alertas
- `GET /api/health` — Verificación de salud y estado del sistema.
- `GET /api/stats` — Métricas de activos, categorías, sedes y discrepancias.
- `GET /api/alerts` — Alertas de garantías próximas a vencer, falta de auditoría (>90d) y discrepancias.

### Usuarios & Diagramas
- `GET /api/users` — Listado de usuarios.
- `GET /api/users/{id}` — Detalle del usuario y sus equipos asignados.
- `GET /api/users/{id}/diagram` — Nodos y aristas para `@xyflow/react`.
- `GET /api/users/{id}/responsiva-data` — JSON estructurado con folio para la carta de entrega-recepción.

### Activos & Movimientos
- `GET /api/assets` — Inventario con filtros por categoría, estatus y búsqueda.
- `GET /api/assets/tag/{tag}` — Búsqueda instantánea por tag de código QR.
- `POST /api/assets/assign` — Asignar equipo a un usuario.
- `POST /api/assets/swap` — **Transacción atómica de cambio de equipo**: desasigna el anterior, transfiere periféricos vinculados, asigna el nuevo y marca responsiva como `PENDING`.

### Auditorías & Discrepancias
- `GET /api/audits/campaigns` — Campañas de auditoría física.
- `POST /api/audits/campaigns/{id}/scan` — Escaneo físico con detección de `MATCH`, `WRONG_USER`, `WRONG_LOCATION` y `MISSING`.
- `POST /api/audits/discrepancies/{id}/resolve` — **Resolución en 1-Clic**: `ACCEPT_PHYSICAL` (actualiza el inventario lógico) o `MARK_LOST` (marca activo como extraviado).

### Responsivas & Documentos
- `POST /api/responsivas/upload` — Carga de archivo firmado a `/app/data/uploads/` y actualización a `SIGNED`.
- `GET /api/responsivas/file/{filename}` — Descarga segura de documento firmado.
- `GET /api/responsivas/pending` — Listado de responsivas pendientes de firma.
