package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distEmbedFS embed.FS

// GetFileSystem devuelve el sistema de archivos de dist/ para servir la SPA
func GetFileSystem() (fs.FS, error) {
	return fs.Sub(distEmbedFS, "dist")
}
