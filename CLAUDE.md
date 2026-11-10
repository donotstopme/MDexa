# CLAUDE.md

## Qué es este proyecto

**MDexa**: administrador de actividades en un solo archivo, [mdexa.html](mdexa.html) (~6.3k líneas, ~480 KB). No tiene backend, build, dependencias ni tests. Los datos viven en un archivo `.md` compartido que el usuario abre desde el navegador. La UI y los textos están en **español**; mantén ese idioma en código visible, comentarios y manual.

## Migración a React + Electron (en curso)

Plan por etapas; las etapas 1 y 2 (parcial) están hechas, con edición básica. El HTML sigue siendo la app que se usa hoy.

- [packages/core/](packages/core/) (`@mdexa/core`): TypeScript puro, sin DOM, con tests (Vitest). Contiene `parseMD`/`toMD`, estados, etiquetas, dependencias, recurrencia y bitácora, portados del HTML. Sus funciones no mutan estado global y reciben la fecha (`ahora`) para poder probarse.
- [packages/app/](packages/app/) (`@mdexa/app`): Vite + React 18 + TS. Hoy: abrir/refrescar un `.md`, **tomar para editar** con candado, edición en la Lista (negocio, actividad, tamaño, prioridad, responsable, fechas, estado, alta y baja), deshacer/rehacer, bitácora y recurrentes automáticas, soltar, auto-refresco en lectura cada 15 s. La lógica vive en [estado/sesion.ts](packages/app/src/estado/sesion.ts) (clase `Sesion`, store externo con `useSyncExternalStore`, escrituras en cola); las reglas puras (quién puede escribir, bitácora, historial) están en `packages/core/src/sesion.ts`. La app sólo habla con la interfaz `Almacenamiento` ([almacenamiento/tipos.ts](packages/app/src/almacenamiento/tipos.ts)); `web.ts` usa File System Access API. Panel **Detalle** por actividad (botón en cada fila): etiquetas con color, subtareas y notas con menciones `@Nombre`; las notas se escriben sin tomar el archivo (`Sesion.editarSinTomar`) si nadie más lo edita. **Novedades** (qué cambió desde tu última visita, con menciones; la base se guarda por archivo en este equipo) y **Respaldos** (hasta 40 copias por archivo, comparar y restaurar) viven en la `Sesion`; ambos usan la interfaz `Local` ([almacenamiento/local.ts](packages/app/src/almacenamiento/local.ts), IndexedDB en la web). Vistas: **Lista**, **Tablero**, **Mis actividades** (secciones por urgencia y resumen; persona en `mdexa.persona`) **Calendario** (por fecha fin, arrastrar para cambiarla), **Carga** por persona y semana, y **Línea de tiempo** (Gantt: arrastrar barras y extremos, programar con clic, crear/quitar dependencias; geometría fija sin medir el DOM). Lógica pura en `packages/core/src/vistas.ts` y `gantt.ts` (Kanban con arrastrar entre columnas, botones Iniciar/Terminar y aviso si hay dependencias sin terminar); filtros compartidos en [vistas/filtros.tsx](packages/app/src/vistas/filtros.tsx); la vista elegida se recuerda en `localStorage` (`mdexa.vista`). El reporte (`ReporteContenido`, análisis en `packages/core/src/reporte.ts`) se ve en ventana, se imprime y se descarga en .html y .md. La **gráfica de avance** (burn-up, `core/src/avance.ts` + `GraficaAvance.tsx`) está en la tarjeta de meta y en el reporte; el **reporte semanal** (`core/src/semanal.ts`) se abre desde el reporte o el menú Más. **Importar/exportar CSV** (`core/src/csv.ts`; menú Más) y **selección múltiple** con su barra de acciones (`core/src/lote.ts`, `BarraMasiva`, `DialogoMasivo`; casillas en todas las vistas, Mayús+clic para rangos). **Renombrar negocio** (lápiz en el encabezado del grupo o menú Más), **Administrar etiquetas** y **Nuevo sprint / Nuevo .md** (`core/src/admin.ts`; crear archivos pasa por `Almacenamiento.crear` y `Sesion.nuevoArchivo`). **Exportar al calendario (.ics)** (`core/src/ics.ts`), **atajos de teclado** (`?` los lista; `App.tsx` los maneja) y **modo Presentar** (`BarraPresentacion`; el CSS del original lo activa con la clase `presentando` en `body` y los ids `banner`, `lateral`, `metaCard`, `masiva`). **Imágenes** por actividad (`core/src/imagenes.ts`, `DialogoImagenes`): se guardan en una carpeta `<archivo>-imagenes` junto al `.md` (acceso a la carpeta con `showDirectoryPicker`, recordado por archivo en IndexedDB) y se anotan en la sección `## Imágenes` y en la bitácora; operaciones en `Sesion.agregarImagenes/borrarImagen` y en la interfaz `Almacenamiento`. **Manual de uso** con buscador (`DialogoManual`; el contenido es el del HTML original adaptado a esta app en `original/manualPlantilla.ts`, con marcadores `{{ico:…}}` que `original/manual.ts` convierte en íconos). Si agregas o cambias una función visible, actualiza el manual.

**Pruebas**: los tests usan copias fijas (`packages/core/test/fixtures/`), no `ejemplos/proyecto-demo.md`, que la gente edita al probarlo; `ejemplo.test.ts` sólo comprueba que el ejemplo publicado siga siendo un archivo válido.
- Comandos (desde la raíz): `npm install`, `npm run dev` (app en el navegador), `npm run build`, `npm test`, `npm run typecheck`.
- El formato del `.md` debe seguir siendo idéntico al del HTML. La paridad se verificó comparando `parseMD`/`toMD` del core contra las funciones originales del HTML con los mismos archivos. Si cambias el formato, cambia ambos lados y sube `VERSION_MDEXA` en `constantes.ts` y en el HTML.
- Siguiente: lo que falta (ver arriba); luego `packages/desktop` (Electron) con una capa de almacenamiento que tenga dos implementaciones (File System Access API y `fs`).

### Paridad visual con el HTML original

La app React usa **el CSS del original tal cual** ([original/original.css](packages/app/src/original/original.css), copiado de `<style>`) y reproduce su marcado y nombres de clase; no inventes estilos nuevos: busca la clase en ese archivo y en las funciones `render*` del HTML. Muchas reglas dependen de ids (`#tabla`, `#vistaLista`). Piezas compartidas en [original/piezas.tsx](packages/app/src/original/piezas.tsx) e [iconos.tsx](packages/app/src/original/iconos.tsx).
- Migrado al diseño original: cabecera, aviso de estado, panel de negocios, tarjeta de meta, filtros múltiples (`Msel`), agrupar, columnas, favoritas, y **las seis vistas**: Lista (edición en línea; responsable es un campo con lista de existentes y alta libre), Línea de tiempo (agrupada por negocio, flechas, arrastrar/enlazar), Tablero (carriles + columnas; soltar cambia estado y el campo del carril), Calendario, Mis actividades y Carga; más la ventana de **actividad** (combos con alta libre, subtareas, dependencias, etiquetas, "una o varias") y la de meta. Vistas en [vistas/](packages/app/src/vistas/), tarjeta compartida en `TarjetaK.tsx`, lógica pura en `packages/core/src/{lista,vistas,gantt}.ts`.
- Ventanas con el diseño original: **Notas** (conversación con avatares y @menciones con autocompletar), **Subtareas** y **Etiquetas** (ventanas flotantes ancladas al botón, `PopFlotante`), **Novedades**, **Respaldos**, **Bitácora** y **Reporte** (en [componentes/](packages/app/src/componentes/)). Las vistas piden abrirlas mediante la interfaz `Acciones` ([vistas/acciones.ts](packages/app/src/vistas/acciones.ts)). Notas y subtareas se escriben sin tomar el archivo (`Sesion.editarSinTomar`); las etiquetas sí requieren tomarlo. Ya no queda CSS propio: todo sale de `original.css`.
- Para comparar: abrir ambas apps con Playwright (Chrome instalado, `executablePath`) y tomar capturas; el HTML sin File System Access (`delete window.showOpenFilePicker`) entra por `#inputArchivo`.

## Escritorio (Electron) — macOS, Windows y Linux

[packages/desktop/](packages/desktop/): el proceso principal (`src/main.ts`), el preload con la API mínima expuesta como `window.mdexaEscritorio` (contrato en `packages/core/src/escritorio.ts`) y la lógica de archivos aislada y probada en `src/archivos.ts`. La app React elige su almacenamiento según exista esa API (`almacenamiento/escritorio.ts`) o no (`web.ts`); el resto de la app no cambia.
- **Comandos** (raíz): `npm run escritorio` (compila la app y la abre en Electron), `npm run escritorio:dist` (instaladores del sistema actual); en `packages/desktop`: `dist:mac`, `dist:win`, `dist:linux`, `dist:dir` (sin instalador, para probar). CI en [.github/workflows/escritorio.yml](.github/workflows/escritorio.yml) compila los tres sistemas.
- **Seguridad**: `contextIsolation`, `sandbox`, sin `nodeIntegration`; la página nunca manda rutas: sólo se escribe en el archivo que la persona eligió en un diálogo del sistema; las imágenes sólo caben en `<carpeta>-imagenes/<archivo>` junto al `.md`. Las ventanas externas (http, mailto) se abren en el sistema.
- **Notas multiplataforma**: escritura atómica (temporal + renombrar, con respaldo a escritura directa si Windows/antivirus/red lo impiden); se vigila la **carpeta** del archivo, no el archivo, porque al reemplazarlo con renombrar el vigilante del archivo se pierde (macOS); `window.prompt` no existe en Electron (por eso `DialogoUsuario`); los menús no llevan Deshacer/Rehacer porque en macOS el acelerador del menú se tragaría Cmd+Z; el ícono es provisional (`scripts/icono.mjs` lo genera).
- **Atención al probar**: si `ELECTRON_RUN_AS_NODE=1` está en el entorno (lo pone el IDE), Electron arranca como Node y falla: `env -u ELECTRON_RUN_AS_NODE …`.
- **Instaladores** (probado el empaquetado de los cuatro en macOS, ejecutando sólo el de macOS): `.dmg` y `.zip` (macOS), instalador y versión portable (Windows), `.AppImage` y `.deb` (Linux). Los datos de contacto de `packages/desktop/package.json` (`homepage`, correo del autor) son marcadores a reemplazar.
- **Pendiente para distribuir**: firma de código y notarización (macOS exige Developer ID para abrirse en otras Macs; Windows muestra SmartScreen sin certificado) y probar en Windows y Linux reales (aquí sólo se probó en macOS).

## Cómo ejecutarlo

Abrir el HTML en Chrome o Edge (se usa la File System Access API: `showOpenFilePicker`, `showDirectoryPicker`). Hay respaldo con `<input type=file>` cuando no existe (`soportaFS`), pero en modo solo lectura.

## Estructura del HTML

- Líneas ~8–922: `<style>` (temas claro/oscuro vía `data-tema`). Luego el marcado y los diálogos `<dialog>`.
- Línea ~1440 en adelante: un único `<script>` sin módulos, organizado por secciones con comentarios `/* ============ Título ============ */`. Para ubicarte: `grep -n "^/\* =====" mdexa.html`.
- Secciones principales: Markdown <-> datos (`parseMD` / `toMD`), Archivo compartido (candado), Deshacer/rehacer, Vistas (lista, Gantt, Kanban, Mis actividades, Calendario, Carga), Análisis y reporte, Notas, Imágenes, Subtareas, Etiquetas, Respaldos, Sprint, CSV, Manual de uso, Atajos, Modo presentación, exportar `.ics`.

## Conceptos clave

- **Formato del `.md`**: encabezado con `Proyecto`, `Meta inicio/fin`, `Versión de MDexa`, `En edición` (candado); tabla de actividades (ID, Negocio, Actividad, Tamaño, Prioridad, Responsable, Inicio, Fin, Estado, Terminada, Etiquetas, Depende de, Repite) y secciones `## Etiquetas`, `## Notas`, `## Subtareas`, `## Imágenes`, `## Bitácora`. Las secciones `##` desconocidas se conservan en `seccionesExtra`.
- **Si cambias lo que se guarda en el `.md`**: actualiza `parseMD` y `toMD` juntos, y sube `VERSION_MDEXA` (número de compatibilidad). Un archivo con versión mayor se abre solo en lectura para no borrar datos desconocidos.
- **Versión visible**: `NOMBRE_APP`, `VERSION_TXT` y `VERSION_FECHA` (~línea 1464). Súbelos en cada cambio relevante; también existe el apartado de novedades/manual.
- **Edición concurrente**: un candado en el propio `.md` (`TTL_CANDADO` 5 min, `LATIDO` 1 min); en solo lectura se refresca cada 15 s (`AUTO_REFRESCO`).
- **Estados**: Backlog, Planeado, En progreso, Terminado, Cancelado (`ESTADOS`, con `ALIAS_ESTADO` para nombres antiguos).
- **Preferencias locales** en `localStorage` con prefijo `mdexa.` (usuario, vista, zoom, tema, columnas…); respaldos y archivos recientes en IndexedDB `mdexa`. Siempre envuelve el acceso en `try/catch`.

## Convenciones

- Todo en un solo archivo: no lo dividas ni añadas dependencias externas o paso de build sin que se pida.
- JS plano, funciones globales y helper `$ = id => document.getElementById(id)`. Iconos como trazos SVG de 24 px en el objeto de iconografía (`data-ico`).
- Al añadir una función visible, documéntala en la sección "Manual de uso" del script.
- No hay linters ni tests: valida abriendo el HTML en el navegador y probando con un `.md` de ejemplo.

## Nombre

El nombre es **MDexa** (título, marca, `NOMBRE_APP`, `PRODID` y UID del `.ics`). Los archivos `.md` antiguos siguen abriéndose: `parseMD` acepta también la clave de versión anterior del encabezado y al guardar escribe `Versión de MDexa`.
