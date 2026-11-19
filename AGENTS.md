# AGENTS.md — Guía de Estilo y Reglas de Opti ITAM

Este documento define las reglas obligatorias de diseño UI/UX, iconografía, tablas, mapas, accesibilidad y arquitectura para **Opti ITAM** (`Optibelt de México S. de R.L. de C.V.`).

---

## 1. Sistema Visual y Paleta (Estilo Limpio SaaS / ZoBox + Optibelt)

- **Fondo de aplicación (canvas):** `#F6F7FB` (claro, aireado; evitar fondos oscuros genéricos en el dashboard).
- **Tarjetas y contenedores:** `#FFFFFF`, borde `1px solid #E6E8F0`, bordes redondeados `rounded-2xl`, sombra sutil (`shadow-2xs` / `shadow-sm`).
- **Color de acento principal (CTAs y estado activo):** `#5B4FE9` (hover `#4B3FD8`), con fondos suaves `#F3F2FF` y borde `#E4E2F8`.
- **Colores semánticos:**
  - **Éxito / En Uso / Activo:** `emerald` (`#10B981` / `bg-emerald-50 text-emerald-700 border-emerald-200`)
  - **Informativo / Disponibles / OPM:** `sky` (`#0284C7` / `bg-sky-50 text-sky-700 border-sky-200`)
  - **Advertencia / Mantenimiento / Pendiente:** `amber` (`#F59E0B` / `bg-amber-50 text-amber-800 border-amber-200`)
  - **Crítico / Error / Extraviado:** `rose` (`#E11D48` / `bg-rose-50 text-rose-700 border-rose-200`)
- **Tipografía:**
  - Títulos y encabezados: `Plus Jakarta Sans` (`font-display`)
  - Cuerpo e interfaz: `Inter`
  - Tags, códigos de empleado, números de serie y fechas: `JetBrains Mono` (`font-mono`) + `tabular-nums` obligatorio en todo número o contador.

---

## 2. Iconografía y Marcas (`@phosphor-icons/react`)

- **Librería única principal:** `@phosphor-icons/react`.
  - Usar **`weight="duotone"`** para navegación, tarjetas de estado, encabezados, botones de acción y categorías de hardware.
  - Usar **`weight="bold"`** únicamente para controles pequeños (`+`, `-`, `×`, flechas, chevrons).
  - **No mezclar** librerías de íconos ni usar emojis como íconos de interfaz.
- **Componente centralizado:** usar `<HardwareIcon category={...} />` y `<BrandTag brand={...} />` de `web/src/components/HardwareIcon.tsx` en cualquier listado, tabla, tarjeta o burbuja que muestre activos.
- **Logos reales:** usar `/optibelt-logo.webp` en el Sidebar y en las Cartas Responsivas. Para marcas conocidas (`DELL`, `APPLE`, `FORTINET`, `BROTHER`, `ZEBRA`, `KYOCERA`, `JABRA`, `HP/HPE`), usar `<BrandTag />` con sus colores oficiales.

---

## 3. Reglas de Tablas de Activos (`AssetDataTable`)

Todas las tablas destinadas a buscar, filtrar o gestionar **assets** (excepto los resúmenes compactos del Dashboard) deben usar el componente compartido `web/src/components/AssetDataTable.tsx` y cumplir:

1. **Filtrado instantáneo (en tiempo real):**
   - Toda barra de búsqueda y selector de filtro (`Categoría`, `Estado`, `Sede`, `Departamento`) debe aplicar los cambios **de inmediato al escribir o seleccionar**, sin requerir botón `"Buscar"`.
2. **Primera columna fijada (Pinned Column):**
   - La columna `Activo & Tag` permanece fija a la izquierda (`sticky left-0`) al hacer scroll horizontal.
3. **Agrupación de filas (Row Grouping):**
   - Soportar agrupación colapsable por `Categoría`, `Estado`, `Departamento` o `Sede` con conteo por grupo (`▾ LAPTOP (42)`).
4. **Ordenamiento, columnas y exportación:**
   - Encabezados ordenables (`↑` / `↓`), selector para mostrar/ocultar columnas, exportación a CSV del filtro activo y paginación clara (`Por página` + rango `1–25 de N`).

---

## 4. Reglas de Mapas y Visualizaciones

- **Mapa de ubicaciones (Dashboard):** mapa real minimalista en `web/src/components/SanJuanMap.tsx` usando **Leaflet** + **OpenStreetMap** con filtro claro (`opti-minimal-map`, sin servicios que exijan API key ni marcas de agua), con las coordenadas reales de **OMEX** (`20.381557, -100.013647`) y **OPM** (`20.365195, -99.943321`).
- **Gráfica de categorías en Dashboard:** agrupar cualquier categoría con `< 5%` del inventario en `OTROS (< 5%)`.
- **Conjuntos de Departamentos & Sites:** burbujas conectadas agrupadas por **categoría + cantidad** para el área/site y conjuntos separados por colaborador en el mismo tablero.

---

## 5. Accesibilidad e Intuición

- Idioma consistente en **español** en etiquetas visibles (`Inicio`, `Inventario`, `Colaboradores`, `Deptos & Sites`, `Auditorías`, `Discrepancias`, `Alertas`, `Responsivas`).
- Todos los controles interactivos deben tener contraste legible, `aria-label` cuando solo muestren ícono, `aria-current="page"` en navegación activa y anillo de foco visible (`focus-visible:ring-2 focus-visible:ring-[#5B4FE9]`).
- Navegación responsiva: menú lateral colapsable en pantallas `< lg` sin solapar el contenido.
- Micro-interacciones sutiles: tarjetas enlazadas con `hover:-translate-y-0.5` y botones con `active:scale-[0.98]`.

---

## 6. Reglas de Negocio e Infraestructura

- **Sincronización de departamento:** al asignar o hacer swap de un activo a un colaborador, el `department` del activo se sincroniza automáticamente con el del colaborador.
- **Impresión Brother PT-D410:** se ejecuta localmente vía `client_windows.py` + `scripts/print_label.ps1` + `templates/etiqueta.lbx` (impresión en lote en un solo trabajo continuo y número de serie en la línea superior).
- **Servidor:** Raspberry Pi (`192.168.16.132:8080`, servicio `systemd` `opti-itam.service`). No modificar otros servicios del host.
