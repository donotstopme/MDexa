import { VERSION_MDEXA, VERSION_TXT } from './constantes';
import type { Actividad, ColorEtiqueta, Documento, Estado } from './tipos';
import { etqs, limpiaEtq, tieneEtq, todasEtq } from './etiquetas';
import { conEstado } from './sesion';
import { EST, addDias, dias, hoy as hoyDe, negocioDe, normaliza, unicos } from './utilidades';
import { subtareasDe } from './utilidades';

/* ============ Renombrar negocio ============ */

/** Qué pasaría al renombrar `viejo` ('' = sin negocio) a `nuevo`: cuántas actividades cambian y si se juntaría con uno existente */
export function infoRenombrarNegocio(d: Documento, viejo: string, nuevo: string): { n: number; existente: string; m: number; mismo: boolean } {
  const nu = nuevo.trim(), n = d.actividades.filter(a => (a.negocio || '') === viejo).length;
  const existente = unicos(d.actividades.map(a => a.negocio)).find(x => x && x !== viejo && normaliza(x) === normaliza(nu)) || '';
  return { n, existente, m: existente ? d.actividades.filter(a => a.negocio === existente).length : 0, mismo: nu === viejo };
}
/** Cambia el nombre de un negocio en todas sus actividades; si ya existe otro igual (sin importar mayúsculas), se juntan con ese nombre */
export function renombrarNegocio(d: Documento, viejo: string, nuevo: string): { doc: Documento; n: number; nombre: string } {
  const nu0 = nuevo.replace(/[|]/g, '/').trim();
  if (!nu0 || nu0 === viejo) return { doc: d, n: 0, nombre: viejo };
  const nombre = unicos(d.actividades.map(a => a.negocio)).find(x => x && x !== viejo && normaliza(x) === normaliza(nu0)) || nu0;
  let n = 0;
  const actividades = d.actividades.map(a => { if ((a.negocio || '') !== viejo) return a; n++; return { ...a, negocio: nombre }; });
  return { doc: { ...d, actividades }, n, nombre };
}

/* ============ Administrar etiquetas ============ */

export const actividadesConEtiqueta = (d: Documento, t: string): number => d.actividades.filter(a => tieneEtq(a, t)).length;
/** Renombra una etiqueta en todas las actividades (si ya existe otra con ese nombre, se juntan) y conserva su color */
export function renombrarEtiqueta(d: Documento, viejo: string, nuevo: string): { doc: Documento; n: number; nombre: string; existente: string } {
  const nu = limpiaEtq(nuevo);
  if (!nu || nu === viejo) return { doc: d, n: 0, nombre: viejo, existente: '' };
  const kv = normaliza(viejo), existente = todasEtq(d.actividades).find(x => normaliza(x) === normaliza(nu) && normaliza(x) !== kv) || '';
  const nombre = existente || nu; let n = 0;
  const actividades = d.actividades.map(a => {
    if (!tieneEtq(a, viejo)) return a; n++;
    return { ...a, etiquetas: [...etqs(a).filter(x => normaliza(x) !== kv && normaliza(x) !== normaliza(nombre)), nombre] };
  });
  const colores = { ...d.coloresEtq };
  if (colores[kv] && !existente) colores[normaliza(nombre)] = colores[kv];
  if (normaliza(nombre) !== kv) delete colores[kv];
  return { doc: { ...d, actividades, coloresEtq: colores }, n, nombre, existente };
}
export function borrarEtiqueta(d: Documento, t: string): Documento {
  const colores = { ...d.coloresEtq }; delete colores[normaliza(t)];
  return { ...d, coloresEtq: colores, actividades: d.actividades.map(a => (tieneEtq(a, t) ? { ...a, etiquetas: etqs(a).filter(x => normaliza(x) !== normaliza(t)) } : a)) };
}

/* ============ Nuevo sprint ============ */

/** Nombre sugerido: "Sprint 3" → "Sprint 4"; si no lleva número, "… · Sprint 2" */
export function nombreSprintSugerido(proyecto: string, archivo: string): string {
  const m = (proyecto || '').match(/^(.*?sprint\s*)(\d+)(.*)$/i);
  return m ? `${m[1]}${+m[2] + 1}${m[3]}` : `${proyecto || archivo.replace(/\.md$/i, '')} · Sprint 2`;
}
/** Fechas sugeridas: el sprint empieza el día siguiente a la meta actual (o hoy) y dura lo mismo */
export function fechasSprintSugeridas(meta: { inicio: string; fin: string }, h: string = hoyDe()): { inicio: string; fin: string } {
  const dur = meta.inicio && meta.fin ? dias(meta.inicio, meta.fin) + 1 : 14, ini = meta.fin && meta.fin >= h ? addDias(meta.fin, 1) : h;
  return { inicio: ini, fin: addDias(ini, dur - 1) };
}
export interface OpcionesSprint { nombre: string; inicio: string; fin: string; estados: string[]; negocios: string[]; notas: boolean; quitarFechas: boolean; reiniciar: boolean }
export const seleccionSprint = (d: Documento, o: Pick<OpcionesSprint, 'estados' | 'negocios'>): Actividad[] => d.actividades.filter(a => o.estados.includes(EST(a)) && o.negocios.includes(negocioDe(a)));

/** Documento nuevo con las actividades elegidas del actual (el actual no se modifica) */
export function crearSprint(d: Documento, o: OpcionesSprint, usuario: string, archivoOrigen: string, ahora: Date = new Date()): Documento {
  const sel = seleccionSprint(d, o);
  const actividades = sel.map(a => {
    let c: Actividad = { ...a, ...(subtareasDe(a).length ? { subtareas: subtareasDe(a).map(x => ({ ...x })) } : {}) };
    if (o.quitarFechas) c = { ...c, inicio: '', fin: '' };
    if (o.reiniciar && EST(c) === 'En progreso') c = conEstado(c, 'Planeado' as Estado, undefined, ahora);
    return c;
  });
  const ids = new Set(actividades.map(a => a.id));
  const origen = d.meta.proyecto || archivoOrigen;
  return {
    actividades, meta: { proyecto: o.nombre, inicio: o.inicio, fin: o.fin, version: VERSION_MDEXA, versionTxt: VERSION_TXT }, candado: null,
    notas: o.notas ? d.notas.filter(n => ids.has(n.act)).map(n => ({ ...n })) : [], extra: [], coloresEtq: { ...d.coloresEtq } as Record<string, ColorEtiqueta>, imagenes: [],
    bitacora: [{ fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: null, accion: 'sprint', campos: [],
      detalle: `A partir de "${origen}" (${archivoOrigen}) · ${actividades.length} ${actividades.length === 1 ? 'actividad copiada' : 'actividades copiadas'}` }],
  };
}

/** Documento vacío para un archivo nuevo */
export const documentoNuevo = (meta: { proyecto: string; inicio: string; fin: string }): Documento => ({
  actividades: [], meta: { ...meta, version: VERSION_MDEXA, versionTxt: VERSION_TXT }, candado: null, notas: [], bitacora: [], extra: [], coloresEtq: {}, imagenes: [],
});
