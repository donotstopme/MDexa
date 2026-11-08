import { app, BrowserWindow, dialog, ipcMain, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import { watch, promises as fs, type FSWatcher } from 'node:fs';
import * as path from 'node:path';
import { escrituraAtomica, guardarDato, leerDato, nombreSeguro, rutaImagenSegura } from './archivos';

const esMac = process.platform === 'darwin', esDev = !app.isPackaged && !!process.env.GESTOR_DEV_URL;
const carpetaDatos = () => path.join(app.getPath('userData'), 'datos');
const rutaUltimo = () => path.join(app.getPath('userData'), 'ultimo.json');
const rutaVentana = () => path.join(app.getPath('userData'), 'ventana.json');

// El renderer nunca manda rutas de archivo: sólo se escribe en el archivo que la persona eligió en un diálogo del sistema.
let archivoActual: string | null = null;
let ventana: BrowserWindow | null = null;
let vigilante: FSWatcher | null = null, temporizador: NodeJS.Timeout | null = null;

const filtros = [{ name: 'Markdown', extensions: ['md'] }];
const leer = async (ruta: string) => ({ nombre: path.basename(ruta), texto: await fs.readFile(ruta, 'utf8') });

/**
 * Vigila el archivo abierto y avisa a la página (con un pequeño retraso para juntar varios eventos).
 * Se vigila la CARPETA y se filtra por nombre: así sigue funcionando cuando el archivo se reemplaza con
 * "escribir y renombrar" (lo hace esta app y casi todos los editores); vigilar el archivo solo se pierde en ese caso.
 */
function vigilar(ruta: string) {
  vigilante?.close(); vigilante = null;
  const nombre = path.basename(ruta);
  try {
    vigilante = watch(path.dirname(ruta), (_ev, f) => {
      if (f && f.toString() !== nombre) return;
      if (temporizador) clearTimeout(temporizador);
      temporizador = setTimeout(() => ventana?.webContents.send('archivo:cambio'), 300);
    });
    vigilante.on('error', () => { vigilante?.close(); vigilante = null; });   // unidades de red: queda el refresco periódico de la página
  } catch { /* sin vigilancia: la página vuelve a leer sola cada 15 s */ }
}
async function fijarArchivo(ruta: string) {
  archivoActual = ruta; vigilar(ruta);
  await escrituraAtomica(rutaUltimo(), JSON.stringify({ ruta })).catch(() => {});
}

function registrarIpc() {
  ipcMain.handle('archivo:abrir', async () => {
    const r = await dialog.showOpenDialog(ventana!, { title: 'Abrir archivo de actividades', properties: ['openFile'], filters: filtros });
    if (r.canceled || !r.filePaths[0]) return null;
    await fijarArchivo(r.filePaths[0]); return leer(r.filePaths[0]);
  });
  ipcMain.handle('archivo:ultimo', async () => {
    try {
      const { ruta } = JSON.parse(await fs.readFile(rutaUltimo(), 'utf8')) as { ruta: string };
      const a = await leer(ruta); await fijarArchivo(ruta); return a;
    } catch { return null; }
  });
  ipcMain.handle('archivo:releer', async () => (archivoActual ? leer(archivoActual) : null));
  ipcMain.handle('archivo:escribir', async (_e, texto: unknown) => {
    if (!archivoActual || typeof texto !== 'string') throw new Error('No hay archivo abierto');
    await escrituraAtomica(archivoActual, texto);
  });
  ipcMain.handle('archivo:crear', async (_e, sugerido: unknown, texto: unknown) => {
    if (typeof sugerido !== 'string' || typeof texto !== 'string') throw new Error('Datos no válidos');
    const base = archivoActual ? path.dirname(archivoActual) : app.getPath('documents');
    const r = await dialog.showSaveDialog(ventana!, { title: 'Guardar archivo nuevo', defaultPath: path.join(base, nombreSeguro(sugerido)), filters: filtros });
    if (r.canceled || !r.filePath) return null;
    const ruta = /\.md$/i.test(r.filePath) ? r.filePath : r.filePath + '.md';
    await escrituraAtomica(ruta, texto); await fijarArchivo(ruta); return path.basename(ruta);
  });
  ipcMain.handle('imagen:guardar', async (_e, ruta: unknown, datos: unknown) => {
    const abs = archivoActual && typeof ruta === 'string' ? rutaImagenSegura(archivoActual, ruta) : null;
    if (!abs || !(datos instanceof ArrayBuffer || ArrayBuffer.isView(datos))) throw new Error('Ruta de imagen no válida');
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, ArrayBuffer.isView(datos) ? Buffer.from(datos.buffer, datos.byteOffset, datos.byteLength) : Buffer.from(datos));
  });
  ipcMain.handle('imagen:leer', async (_e, ruta: unknown) => {
    const abs = archivoActual && typeof ruta === 'string' ? rutaImagenSegura(archivoActual, ruta) : null;
    if (!abs) return null;
    try { const b = await fs.readFile(abs); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } catch { return null; }
  });
  ipcMain.handle('imagen:borrar', async (_e, ruta: unknown) => {
    const abs = archivoActual && typeof ruta === 'string' ? rutaImagenSegura(archivoActual, ruta) : null;
    if (abs) await fs.rm(abs, { force: true });
  });
  ipcMain.handle('dato:leer', (_e, clave: unknown) => (typeof clave === 'string' ? leerDato(carpetaDatos(), clave) : undefined));
  ipcMain.handle('dato:guardar', (_e, clave: unknown, valor: unknown) => { if (typeof clave === 'string') return guardarDato(carpetaDatos(), clave, valor); });
}

function menu() {
  const t: MenuItemConstructorOptions[] = [
    ...(esMac ? [{ role: 'appMenu' as const }] : []),
    { label: 'Archivo', submenu: [esMac ? { role: 'close' as const } : { role: 'quit' as const }] },
    // Sin "Deshacer/Rehacer" en el menú: la página usa Ctrl/Cmd+Z para deshacer los cambios de las actividades
    { label: 'Edición', submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Ver', submenu: [{ role: 'togglefullscreen' }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, ...(esDev ? [{ type: 'separator' as const }, { role: 'toggleDevTools' as const }] : [])] },
    { label: 'Ventana', submenu: [{ role: 'minimize' }, ...(esMac ? [{ role: 'front' as const }] : [])] },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

async function crearVentana() {
  let b = { width: 1400, height: 900 } as { width: number; height: number; x?: number; y?: number };
  try { b = { ...b, ...JSON.parse(await fs.readFile(rutaVentana(), 'utf8')) }; } catch { /* primera vez */ }
  ventana = new BrowserWindow({
    ...b, minWidth: 900, minHeight: 600, show: false, title: 'Gestor Proyectos', backgroundColor: '#12151a',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  const w = ventana;
  w.once('ready-to-show', () => w.show());
  w.on('close', () => { if (!w.isMinimized() && !w.isFullScreen()) void fs.writeFile(rutaVentana(), JSON.stringify(w.getBounds())).catch(() => {}); });
  w.on('closed', () => { ventana = null; vigilante?.close(); });

  // Enlaces: los de internet y el correo se abren fuera; sólo se permiten ventanas en blanco (el reporte que se imprime)
  const externo = (u: string) => /^(https?|mailto):/i.test(u);
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (url === 'about:blank' || url === '') return { action: 'allow', overrideBrowserWindowOptions: { webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false } } };
    if (externo(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  w.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:') && !(esDev && url.startsWith(process.env.GESTOR_DEV_URL!))) { e.preventDefault(); if (externo(url)) void shell.openExternal(url); } });

  if (esDev) await w.loadURL(process.env.GESTOR_DEV_URL!);
  else await w.loadFile(app.isPackaged ? path.join(process.resourcesPath, 'app', 'index.html') : path.join(__dirname, '..', '..', 'app', 'dist', 'index.html'));
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (ventana) { if (ventana.isMinimized()) ventana.restore(); ventana.focus(); } });
  app.whenReady().then(async () => {
    app.setName('Gestor Proyectos');
    registrarIpc(); menu(); await crearVentana();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) void crearVentana(); });
  });
  app.on('window-all-closed', () => { if (!esMac) app.quit(); });
}
