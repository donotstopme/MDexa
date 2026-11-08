import type { Documento, Imagen } from './tipos';
import { nombreDe } from './bitacora';

export const MAX_IMG = 15 * 1024 * 1024;
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp' };

/** Carpeta junto al .md donde se guardan las imágenes: "mi-proyecto-imagenes" */
export const carpetaImagenes = (archivo: string): string =>
  (archivo.replace(/\.md$/i, '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'actividades') + '-imagenes';

export const imagenesDe = (d: Pick<Documento, 'imagenes'>, id: number): Imagen[] => d.imagenes.filter(x => x.act === id).sort((a, b) => a.fecha.localeCompare(b.fecha));

/** Ruta relativa de una imagen nueva: carpeta/ID-AAAAMMDD-HHMMSS-xxxx.ext */
export function rutaImagen(carpeta: string, id: number, mime: string, nombreOriginal: string, ahora: Date, azar: string): string {
  const ext = EXT[mime] || (nombreOriginal.split('.').pop() || 'png').toLowerCase(), sello = ahora.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${carpeta}/${id}-${sello}-${azar}.${ext}`;
}
/** Nombre que se muestra: el del archivo, o "Captura <hora>" si viene de pegar */
export const nombreVisible = (nombre: string, fechaTxt: string): string => (nombre && nombre !== 'image.png' ? nombre : `Captura ${fechaTxt}`).replace(/[|[\]\r\n]/g, ' ').slice(0, 80);

/** Separa las imágenes aceptables de las que superan el límite */
export function filtrarImagenes<T extends { type: string; size: number }>(archivos: T[]): { validas: T[]; grandes: T[] } {
  const imgs = archivos.filter(f => f && /^image\//.test(f.type));
  return { validas: imgs.filter(f => f.size <= MAX_IMG), grandes: imgs.filter(f => f.size > MAX_IMG) };
}

/** Agrega imágenes a una actividad y lo anota en la bitácora */
export function agregarImagenes(d: Documento, id: number, nuevas: Imagen[], usuario: string, ahora: Date = new Date()): Documento {
  if (!nuevas.length) return d;
  const a = d.actividades.find(x => x.id === id);
  return {
    ...d, imagenes: [...d.imagenes, ...nuevas],
    bitacora: [...d.bitacora, { fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: id, accion: 'imagen', campos: [], detalle: `Agregó ${nuevas.length === 1 ? nuevas[0].nombre : `${nuevas.length} imágenes`}${a ? ' · ' + nombreDe(a) : ''}` }],
  };
}
export function quitarImagen(d: Documento, archivo: string, usuario: string, ahora: Date = new Date()): Documento {
  const x = d.imagenes.find(i => i.archivo === archivo);
  if (!x) return d;
  const a = d.actividades.find(y => y.id === x.act);
  return {
    ...d, imagenes: d.imagenes.filter(i => i.archivo !== archivo),
    bitacora: [...d.bitacora, { fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: x.act, accion: 'imagen', campos: [], detalle: `Quitó ${x.nombre}${a ? ' · ' + nombreDe(a) : ''}` }],
  };
}
