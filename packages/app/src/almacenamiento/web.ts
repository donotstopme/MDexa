import type { Almacenamiento, ArchivoAbierto } from './tipos';
import type { Local } from './local';

const tiposMD = [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }];

// Tipado mínimo de la File System Access API (aún no está en lib.dom en todas las versiones)
type Escritor = { write(t: string): Promise<void>; close(): Promise<void> };
type Carpeta = {
  getDirectoryHandle(n: string, o?: { create: boolean }): Promise<Carpeta>;
  getFileHandle(n: string, o?: { create: boolean }): Promise<Manejador>;
  removeEntry(n: string): Promise<void>;
  queryPermission(o: { mode: 'readwrite' }): Promise<string>;
  requestPermission(o: { mode: 'readwrite' }): Promise<string>;
  resolve(h: Manejador): Promise<string[] | null>;
};
type Manejador = {
  isSameEntry?(o: unknown): Promise<boolean>;
  getFile(): Promise<File>;
  createWritable(): Promise<Escritor>;
  requestPermission(o: { mode: 'readwrite' }): Promise<string>;
};
type VentanaFS = Window & { showOpenFilePicker?: (o: unknown) => Promise<Manejador[]>; showSaveFilePicker?: (o: unknown) => Promise<Manejador & { name: string }>; showDirectoryPicker?: (o: unknown) => Promise<Carpeta> };

async function leer(h: Manejador): Promise<ArchivoAbierto> {
  const f = await h.getFile();
  return { nombre: f.name, texto: await f.text() };
}

function viaInput(): Promise<ArchivoAbierto | null> {
  return new Promise(resolve => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = '.md,text/markdown';
    i.onchange = async () => { const f = i.files?.[0]; resolve(f ? { nombre: f.name, texto: await f.text() } : null); };
    i.oncancel = () => resolve(null);
    i.click();
  });
}

export function crearAlmacenamientoWeb(local?: Local): Almacenamiento {
  let manejador: Manejador | null = null, carpeta: Carpeta | null = null, carpetaOk = false;
  const urls = new Map<string, string | null>();
  type Guardada = { file: Manejador; dir: Carpeta };
  const carpetasGuardadas = async () => (await local?.get<Guardada[]>('carpetas')) ?? [];
  /** Al abrir un .md: ¿ya diste acceso a su carpeta antes? */
  const buscarCarpeta = async () => {
    carpeta = null; carpetaOk = false; urls.forEach(u => u && URL.revokeObjectURL(u)); urls.clear();
    if (!manejador) return;
    for (const c of await carpetasGuardadas()) { try { if (await c.file.isSameEntry?.(manejador)) { carpeta = c.dir; break; } } catch { /* siguiente */ } }
    if (carpeta) try { carpetaOk = (await carpeta.queryPermission({ mode: 'readwrite' })) === 'granted'; } catch { carpetaOk = false; }
  };
  const archivoImg = async (ruta: string, crear = false) => {
    const partes = ruta.split('/').filter(Boolean); let d = carpeta!;
    for (const p of partes.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: crear });
    return { dir: d, nombre: partes[partes.length - 1] };
  };
  const w = window as VentanaFS;
  return {
    async abrir() {
      if (!w.showOpenFilePicker) { manejador = null; return viaInput(); }
      try {
        [manejador] = await w.showOpenFilePicker({ types: tiposMD, multiple: false });
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return null;
        throw e;
      }
      await buscarCarpeta();
      return leer(manejador);
    },
    async releer() { return manejador ? leer(manejador) : null; },
    puedeEscribir: () => manejador !== null,
    async permisoEscritura() { return !!manejador && (await manejador.requestPermission({ mode: 'readwrite' })) === 'granted'; },
    async crear(nombreSugerido, texto) {
      if (!w.showSaveFilePicker) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([texto], { type: 'text/markdown' })); a.download = nombreSugerido; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        return null;
      }
      let h: Manejador & { name: string };
      try { h = await w.showSaveFilePicker({ suggestedName: nombreSugerido, types: tiposMD }); }
      catch (e) { if ((e as DOMException).name === 'AbortError') return null; throw e; }
      const wr = await h.createWritable(); await wr.write(texto); await wr.close();
      manejador = h; await buscarCarpeta(); return h.name;
    },
    imagenesDisponibles: () => !!manejador && !!w.showDirectoryPicker,
    imagenesAcceso: async () => carpetaOk,
    async pedirCarpeta() {
      if (!manejador || !w.showDirectoryPicker) return { ok: false, aviso: 'Las imágenes necesitan Chrome o Edge y el archivo abierto desde una carpeta (no funciona con la copia del navegador).' };
      try {
        if (carpeta && !carpetaOk) { carpetaOk = (await carpeta.requestPermission({ mode: 'readwrite' })) === 'granted'; if (carpetaOk) return { ok: true }; }
        const d = await w.showDirectoryPicker({ id: 'gestor-imagenes', mode: 'readwrite', startIn: manejador });
        const ruta = await d.resolve(manejador);
        if (!ruta || ruta.length !== 1) return { ok: false, aviso: `Elige la carpeta donde está "${ruta?.[0] ?? 'el archivo'}" (no una subcarpeta ni otra carpeta).` };
        carpeta = d; carpetaOk = true; urls.forEach(u => u && URL.revokeObjectURL(u)); urls.clear();
        const otras: Guardada[] = [];
        for (const c of await carpetasGuardadas()) { try { if (!(await c.file.isSameEntry?.(manejador))) otras.push(c); } catch { /* se descarta */ } }
        await local?.set('carpetas', [{ file: manejador, dir: d }, ...otras].slice(0, 30));
        return { ok: true };
      } catch (e) { return (e as DOMException).name === 'AbortError' ? { ok: false } : { ok: false, aviso: 'No se pudo abrir la carpeta: ' + (e as Error).message }; }
    },
    async guardarImagen(ruta, datos) {
      const { dir, nombre } = await archivoImg(ruta, true);
      const wr = await (await dir.getFileHandle(nombre, { create: true })).createWritable(); await wr.write(datos as unknown as string); await wr.close();
      urls.set(ruta, URL.createObjectURL(datos));
    },
    async urlImagen(ruta) {
      if (urls.has(ruta)) return urls.get(ruta) ?? null;
      let u: string | null = null;
      try { const { dir, nombre } = await archivoImg(ruta); u = URL.createObjectURL(await (await dir.getFileHandle(nombre)).getFile()); } catch { /* no está */ }
      urls.set(ruta, u); return u;
    },
    async borrarImagen(ruta) {
      try { const { dir, nombre } = await archivoImg(ruta); await dir.removeEntry(nombre); } catch { /* ya no estaba */ }
      const u = urls.get(ruta); if (u) URL.revokeObjectURL(u); urls.delete(ruta);
    },
    liberarImagenes() { urls.forEach(u => u && URL.revokeObjectURL(u)); urls.clear(); },
    async escribir(texto) {
      if (!manejador) throw new Error('No hay archivo abierto');
      const w = await manejador.createWritable();
      await w.write(texto); await w.close();
    },
  };
}
