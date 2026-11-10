# =====================================================================
# ETAPA 1: Construcción del Frontend (React + TypeScript + Vite)
# =====================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /web

# Instalar dependencias
COPY web/package*.json ./
RUN npm ci --silent || npm install

# Copiar código fuente y compilar bundle SPA
COPY web/ ./
RUN npm run build

# =====================================================================
# ETAPA 2: Compilación del Backend en Go (Sin CGO, optimizado ARM64)
# =====================================================================
FROM golang:1.23-alpine AS backend-builder
WORKDIR /src

# Instalar certificados CA mínimos
RUN apk add --no-cache ca-certificates tzdata

# Descargar dependencias de Go
COPY go.mod go.sum ./
RUN go mod download

# Copiar el código del backend
COPY internal/ internal/
COPY cmd/ cmd/

# Copiar el dist generado en la Etapa 1 dentro del paquete web para embed.FS
COPY --from=frontend-builder /web/dist ./web/dist
COPY web/embed.go ./web/embed.go

# Compilación monolítica estática pura (CGO_ENABLED=0, strip de símbolos para reducir tamaño y RAM)
ARG TARGETOS=linux
ARG TARGETARCH=arm64
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} go build \
    -ldflags="-s -w -X main.Version=1.0.0" \
    -trimpath \
    -o /opti-itam ./cmd/server

# =====================================================================
# ETAPA 3: Imagen de Ejecución Mínima (<40MB RAM en Raspberry Pi)
# =====================================================================
FROM alpine:3.20 AS runner

# Metadatos
LABEL maintainer="Opti ITAM Architect"
LABEL description="IT Asset Management ultraligero para Raspberry Pi ARM64 con Go, SQLite WAL y React"

# Dependencias mínimas del sistema y zona horaria
RUN apk add --no-cache ca-certificates tzdata sqlite-libs curl && \
    addgroup -S itam && adduser -S itam -G itam

WORKDIR /app

# Crear directorios de persistencia con permisos adecuados
RUN mkdir -p /app/data/uploads && chown -R itam:itam /app

# Copiar binario único compilado
COPY --from=backend-builder --chown=itam:itam /opti-itam /app/opti-itam

# Variables de entorno por defecto
ENV PORT=8080 \
    DB_PATH=/app/data/opti.db \
    UPLOADS_DIR=/app/data/uploads

# Usuario no privilegiado para seguridad
USER itam

# Exponer puerto HTTP
EXPOSE 8080

# Volumen persistente para base de datos SQLite y responsivas firmadas
VOLUME ["/app/data"]

# Healthcheck de bajo consumo
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

ENTRYPOINT ["/app/opti-itam"]
