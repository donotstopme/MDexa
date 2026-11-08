import { CAMPOS_NOV } from './constantes';
import type { Actividad, Documento, Nota } from './tipos';
import { mencionaA, personasConocidas } from './notas';
import { foto, type Foto } from './sesion';

export const claveNota = (n: Pick<Nota, 'act' | 'fecha' | 'autor'>): string => `${n.act}|${n.fecha}|${n.autor}`;

export interface CampoCambiado { k: string; antes: string; despues: string }
export interface Novedades {
  nuevas: Actividad[];
  cambios: { a: Actividad; campos: CampoCambiado[] }[];
  borradas: ({ id: number } & Record<string, string | number>)[];
  /** Notas de otras personas que aún no has visto (más recientes primero) */
  notas: Nota[];
  menciones: Nota[];
  total: number;
  /** Por actividad: qué cambió desde tu última visita */
  porId: Record<number, { tipo: 'nueva' | 'cambio'; campos: CampoCambiado[] }>;
}
export const sinNovedades = (): Novedades => ({ nuevas: [], cambios: [], borradas: [], notas: [], menciones: [], total: 0, porId: {} });

/** Qué cambió respecto a lo que viste la última vez (`visto`). Tus propios cambios no cuentan. */
export function calcularNovedades(doc: Documento, visto: Foto | null, notasVistas: Set<string>, usuario: string): Novedades {
  const r = sinNovedades();
  if (!visto) return r;
  const actual = foto(doc.actividades);
  for (const a of doc.actividades) {
    const antes = visto[a.id];
    if (!antes) { r.nuevas.push(a); r.porId[a.id] = { tipo: 'nueva', campos: [] }; continue; }
    const campos = Object.keys(CAMPOS_NOV).filter(k => (antes[k] || '') !== actual[a.id][k]).map(k => ({ k, antes: antes[k] || '', despues: actual[a.id][k] }));
    if (campos.length) { r.cambios.push({ a, campos }); r.porId[a.id] = { tipo: 'cambio', campos }; }
  }
  for (const id of Object.keys(visto).map(Number)) if (!actual[id]) r.borradas.push({ id, ...visto[id] });
  const ids = new Set(doc.actividades.map(a => a.id));
  r.notas = doc.notas.filter(n => ids.has(n.act) && n.autor !== usuario && !notasVistas.has(claveNota(n))).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const personas = personasConocidas(doc, usuario);
  r.menciones = r.notas.filter(n => mencionaA(n, usuario, personas));
  r.total = r.nuevas.length + r.cambios.length + r.borradas.length + r.notas.length;
  return r;
}

/* ============ Respaldos ============ */

export interface Respaldo { fecha: string; motivo: string; texto: string; hash: string; usuario: string; n: number }

/** El candado no forma parte de un respaldo */
export const sinCandado = (t: string): string => t.split(/\r?\n/).filter(l => !/^[-*]\s*en edici[oó]n\s*:/i.test(l.trim())).join('\n');
export const hashTxt = (t: string): string => {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + ':' + t.length;
};

export interface Comparacion {
  respaldo: Documento;
  recupera: Actividad[];
  pierde: Actividad[];
  cambian: { a: Actividad; campos: { k: string; ahora: string; antes: string }[] }[];
  metaDif: boolean;
  igual: boolean;
}
/** Diferencias entre un respaldo y la versión actual */
export function compararRespaldo(actual: Documento, respaldo: Documento): Comparacion {
  const fa = foto(actual.actividades), fr = foto(respaldo.actividades);
  const recupera = respaldo.actividades.filter(a => !fa[a.id]), pierde = actual.actividades.filter(a => !fr[a.id]);
  const cambian = respaldo.actividades.filter(a => fa[a.id] && JSON.stringify(fa[a.id]) !== JSON.stringify(fr[a.id]))
    .map(a => ({ a, campos: Object.keys(CAMPOS_NOV).filter(k => fa[a.id][k] !== fr[a.id][k]).map(k => ({ k, ahora: fa[a.id][k], antes: fr[a.id][k] })) }));
  const metaDif = (['proyecto', 'inicio', 'fin'] as const).some(k => (respaldo.meta[k] || '') !== (actual.meta[k] || ''));
  return { respaldo, recupera, pierde, cambian, metaDif, igual: !recupera.length && !pierde.length && !cambian.length && !metaDif };
}

/**
 * Documento resultante de restaurar un respaldo: actividades y meta vuelven a como estaban; las notas actuales
 * se conservan (y se suman las del respaldo que no estén) y se anota "restauró" en la bitácora.
 */
export function restaurarRespaldo(actual: Documento, r: Respaldo, respaldo: Documento, usuario: string, etiquetaFecha: string, ahora: Date = new Date()): Documento {
  const claves = new Set(actual.notas.map(claveNota));
  return {
    ...actual,
    actividades: respaldo.actividades,
    meta: { ...actual.meta, proyecto: respaldo.meta.proyecto, inicio: respaldo.meta.inicio, fin: respaldo.meta.fin },
    notas: [...actual.notas, ...respaldo.notas.filter(n => !claves.has(claveNota(n)))],
    bitacora: [...actual.bitacora, {
      fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: null, accion: 'restauró', campos: [],
      detalle: `Respaldo del ${etiquetaFecha} (${r.motivo}) · ${respaldo.actividades.length} ${respaldo.actividades.length === 1 ? 'actividad' : 'actividades'}`,
    }],
  };
}

/** Quiénes (que no seas tú) cambiaron una actividad desde `desde`, y cuándo fue lo último */
export function autoresDesde(doc: Documento, id: number, desde: string, usuario: string): { quienes: string[]; ultima: string } | null {
  const es = doc.bitacora.filter(e => e.act === id && e.fecha > (desde || '') && e.autor !== usuario);
  return es.length ? { quienes: [...new Set(es.map(e => e.autor))], ultima: es[es.length - 1].fecha } : null;
}
