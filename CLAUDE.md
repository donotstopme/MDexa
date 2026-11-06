# CLAUDE.md

## Qué es este proyecto

**Gestor Proyectos** (antes "Gestor GDSO"): gestor de actividades de un solo archivo, [gestor-actividades.html](gestor-actividades.html) (~6.3k líneas, ~480 KB). No tiene backend, build, dependencias ni tests. Los datos viven en un archivo `.md` compartido que el usuario abre desde el navegador. La UI y los textos están en **español**; mantén ese idioma en código visible, comentarios y manual.

## Cómo ejecutarlo

Abrir el HTML en Chrome o Edge (se usa la File System Access API: `showOpenFilePicker`, `showDirectoryPicker`). Hay respaldo con `<input type=file>` cuando no existe (`soportaFS`), pero en modo solo lectura.

## Estructura del HTML

- Líneas ~8–922: `<style>` (temas claro/oscuro vía `data-tema`). Luego el marcado y los diálogos `<dialog>`.
- Línea ~1440 en adelante: un único `<script>` sin módulos, organizado por secciones con comentarios `/* ============ Título ============ */`. Para ubicarte: `grep -n "^/\* =====" gestor-actividades.html`.
- Secciones principales: Markdown <-> datos (`parseMD` / `toMD`), Archivo compartido (candado), Deshacer/rehacer, Vistas (lista, Gantt, Kanban, Mis actividades, Calendario, Carga), Análisis y reporte, Notas, Imágenes, Subtareas, Etiquetas, Respaldos, Sprint, CSV, Manual de uso, Atajos, Modo presentación, exportar `.ics`.

## Conceptos clave

- **Formato del `.md`**: encabezado con `Proyecto`, `Meta inicio/fin`, `Versión del gestor`, `En edición` (candado); tabla de actividades (ID, Negocio, Actividad, Tamaño, Prioridad, Responsable, Inicio, Fin, Estado, Terminada, Etiquetas, Depende de, Repite) y secciones `## Etiquetas`, `## Notas`, `## Subtareas`, `## Imágenes`, `## Bitácora`. Las secciones `##` desconocidas se conservan en `seccionesExtra`.
- **Si cambias lo que se guarda en el `.md`**: actualiza `parseMD` y `toMD` juntos, y sube `VERSION_GESTOR` (número de compatibilidad). Un archivo con versión mayor se abre solo en lectura para no borrar datos desconocidos.
- **Versión visible**: `NOMBRE_APP`, `VERSION_TXT` y `VERSION_FECHA` (~línea 1464). Súbelos en cada cambio relevante; también existe el apartado de novedades/manual.
- **Edición concurrente**: un candado en el propio `.md` (`TTL_CANDADO` 5 min, `LATIDO` 1 min); en solo lectura se refresca cada 15 s (`AUTO_REFRESCO`).
- **Estados**: Backlog, Planeado, En progreso, Terminado, Cancelado (`ESTADOS`, con `ALIAS_ESTADO` para nombres antiguos).
- **Preferencias locales** en `localStorage` con prefijo `gestor.` (usuario, vista, zoom, tema, columnas…); respaldos y archivos recientes en IndexedDB `gestor-actividades`. Siempre envuelve el acceso en `try/catch`.

## Convenciones

- Todo en un solo archivo: no lo dividas ni añadas dependencias externas o paso de build sin que se pida.
- JS plano, funciones globales y helper `$ = id => document.getElementById(id)`. Iconos como trazos SVG de 24 px en el objeto de iconografía (`data-ico`).
- Al añadir una función visible, documéntala en la sección "Manual de uso" del script.
- No hay linters ni tests: valida abriendo el HTML en el navegador y probando con un `.md` de ejemplo.

## Nombre

El nombre mostrado es **Gestor Proyectos** (título, marca, `NOMBRE_APP`, `PRODID` y UID del `.ics`). El nombre del archivo, el `.md` de datos, las claves `gestor.*` de `localStorage` y la base IndexedDB `gestor-actividades` se mantuvieron sin cambios a propósito, para no romper datos ni respaldos existentes.
