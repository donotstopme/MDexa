import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Lógica de archivos de la versión de escritorio. Es independiente de Electron para poder probarla
 * (y para que funcione igual en Windows, macOS y Linux: sólo usa `path` y `fs`).
 */

/** Escribe el archivo de forma atómica (archivo temporal + renombrar), para que nadie lea un archivo a medias. */
export async function escrituraAtomica(ruta: string, texto: string): Promise<void> {
  const tmp = `${ruta}.${process.pid}.${Date.now()}.tmp`;
  try {
    await fs.writeFile(tmp, texto, 'utf8');
    await fs.rename(tmp, ruta);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    // Algunas unidades de red o antivirus (sobre todo en Windows) impiden renombrar: se escribe directo
    if ((e as NodeJS.ErrnoException).code === 'EPERM' || (e as NodeJS.ErrnoException).code === 'EBUSY' || (e as NodeJS.ErrnoException).code === 'EXDEV') await fs.writeFile(ruta, texto, 'utf8');
    else throw e;
  }
}

/** Una imagen sólo puede vivir en `<carpeta>-imagenes/<archivo>` junto al .md. Devuelve la ruta absoluta o null si no es válida. */
export function rutaImagenSegura(archivoMd: string, ruta: string): string | null {
  const partes = ruta.split('/');
  if (partes.length !== 2 || partes.some(p => !p || p === '.' || p === '..' || /[\\:*?"<>|\0]/.test(p))) return null;
  if (!/-imagenes$/.test(partes[0])) return null;
  const base = path.dirname(archivoMd), abs = path.join(base, partes[0], partes[1]);
  return path.relative(base, abs).startsWith('..') ? null : abs;
}

/** Nombre de archivo propio y sin caracteres que algún sistema no admite */
export const nombreSeguro = (n: string): string => (n.replace(/[\\/:*?"<>|\0]/g, '-').trim() || 'actividades.md');

/** Datos locales: un archivo JSON por clave dentro de `dir` (la clave puede traer cualquier carácter: se usa su huella) */
const archivoDato = (dir: string, clave: string) => path.join(dir, createHash('sha1').update(clave).digest('hex') + '.json');
export async function leerDato(dir: string, clave: string): Promise<unknown> {
  try { const o = JSON.parse(await fs.readFile(archivoDato(dir, clave), 'utf8')); return o.clave === clave ? o.valor : undefined; } catch { return undefined; }
}
export async function guardarDato(dir: string, clave: string, valor: unknown): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await escrituraAtomica(archivoDato(dir, clave), JSON.stringify({ clave, valor }));
}
