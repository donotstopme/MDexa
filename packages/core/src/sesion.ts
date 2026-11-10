import { CAMPOS_NOV, ETQ_BIT, REPITE, TTL_CANDADO, VERSION_MDEXA } from './constantes';
import type { Actividad, Candado, Documento, Estado } from './tipos';
import { registrarBit } from './bitacora';
import { txtDeps } from './dependencias';
import { etqs } from './etiquetas';
import { crearSiguiente } from './recurrencia';
import { EST, candadoVigente, hoy, pl, siguienteId, txtSubsDe } from './utilidades';

/* ============ Candado: quién puede escribir el archivo ============ */

export type DecisionToma =
  | { tipo: 'ok' }
  | { tipo: 'masNuevo' }
  | { tipo: 'ocupado'; por: string; desde: string }
  | { tipo: 'abandonado'; por: string; latido: string };   // pide confirmar antes de tomarlo

const esMio = (c: Candado | null, usuario: string) => !!c && c.usuario === usuario;

/** ¿Se puede tomar el archivo para editar, dado lo que hay hoy en disco? */
export function decidirToma(d: Documento, usuario: string, ahora = Date.now()): DecisionToma {
  if ((d.meta.version || 0) > VERSION_MDEXA) return { tipo: 'masNuevo' };
  const c = d.candado;
  if (c && !esMio(c, usuario)) {
    return candadoVigente(c, ahora, TTL_CANDADO)
      ? { tipo: 'ocupado', por: c.usuario, desde: c.desde }
      : { tipo: 'abandonado', por: c.usuario, latido: c.latido };
  }
  return { tipo: 'ok' };
}

/** Candado que se escribe al tomar (conserva `desde` si ya era tuyo, p. ej. tras recargar la página) */
export const candadoNuevo = (previo: Candado | null, usuario: string, ahora: Date = new Date()): Candado => {
  const iso = ahora.toISOString();
  return { usuario, desde: esMio(previo, usuario) ? previo!.desde : iso, latido: iso };
};

export type DecisionEscritura = 'ok' | 'masNuevo' | 'perdido';
/** Antes de cada escritura: ¿sigue siendo seguro escribir? */
export function decidirEscritura(enDisco: Documento, usuario: string, ahora = Date.now()): DecisionEscritura {
  if ((enDisco.meta.version || 0) > VERSION_MDEXA) return 'masNuevo';
  const c = enDisco.candado;
  if (c && !esMio(c, usuario) && candadoVigente(c, ahora, TTL_CANDADO)) return 'perdido';
  return 'ok';
}

/** Al soltar: ¿se debe reescribir el archivo sin candado? Sólo si el candado es tuyo o ya no hay. */
export const puedeSoltar = (enDisco: Documento, usuario: string): boolean =>
  (enDisco.meta.version || 0) <= VERSION_MDEXA && (!enDisco.candado || esMio(enDisco.candado, usuario));

/* ============ Cambios propios: bitácora y recurrentes ============ */

export type Foto = Record<number, Record<string, string>>;

/** Resumen textual de los campos que se vigilan de cada actividad */
export function foto(acts: Actividad[]): Foto {
  return Object.fromEntries(acts.map(a => [a.id, Object.fromEntries(Object.keys(CAMPOS_NOV).map(k => [k,
    k === 'estado' ? EST(a) : k === 'etiquetas' ? etqs(a).join(', ') : k === 'depende' ? txtDeps(acts, a)
      : k === 'subtareas' ? txtSubsDe(a) : k === 'repite' ? ((a.repite && REPITE[a.repite]) || '')
        : String((a as unknown as Record<string, unknown>)[k] || '')]))]));
}

export interface ResultadoCambios { doc: Documento; previo: Foto; creadas: Actividad[] }

/**
 * Incorpora tus cambios: crea la siguiente de las actividades recurrentes recién terminadas y
 * anota en la bitácora lo creado, cambiado y eliminado. No muta `doc`.
 */
export function absorberPropios(doc: Documento, previo: Foto, usuario: string, opts: { restaurando?: boolean; ahora?: Date } = {}): ResultadoCambios {
  const ahora = opts.ahora ?? new Date();
  let actividades = [...doc.actividades];
  const creadas: Actividad[] = [];
  if (!opts.restaurando) {
    for (const a of doc.actividades) {
      const p = previo[a.id];
      if (a.repite && REPITE[a.repite] && EST(a) === 'Terminado' && p && p.estado !== 'Terminado') {
        const { siguiente, original } = crearSiguiente({ ...doc, actividades }, a, ahora);
        actividades = actividades.map(x => (x.id === a.id ? original : x)).concat(siguiente);
        creadas.push(siguiente);
      }
    }
  }
  const bitacora = structuredClone(doc.bitacora);
  const actual = foto(actividades);
  for (const id of Object.keys(actual).map(Number)) {
    if (JSON.stringify(actual[id]) === JSON.stringify(previo[id])) continue;
    if (!previo[id]) registrarBit(bitacora, usuario, opts.restaurando ? 'recuperó' : 'creó', id, [], actual[id] as never, ahora);
    else registrarBit(bitacora, usuario, 'cambió', id, Object.keys(CAMPOS_NOV).filter(k => previo[id][k] !== actual[id][k])
      .map(k => ({ k, etq: CAMPOS_NOV[k], antes: previo[id][k], despues: actual[id][k] })), actual[id] as never, ahora);
  }
  for (const id of Object.keys(previo).map(Number))
    if (!actual[id]) registrarBit(bitacora, usuario, 'eliminó', id, [], previo[id] as never, ahora);
  return { doc: { ...doc, actividades, bitacora }, previo: actual, creadas };
}

/* ============ Edición ============ */

/** Cambia el estado: Terminado fija la fecha de término; cualquier otro la borra. */
export function conEstado(a: Actividad, estado: Estado | '', terminada?: string, ahora: Date = new Date()): Actividad {
  const e: Estado = estado || 'Backlog';
  return { ...a, estado: e, terminada: e === 'Terminado' ? (terminada || a.terminada || hoy(ahora)) : '' };
}

export function actividadNueva(doc: Pick<Documento, 'actividades' | 'bitacora' | 'notas'>, datos: Partial<Actividad> & { actividad: string }): Actividad {
  return {
    negocio: '', tamano: '', prioridad: '', etiquetas: [], depende: [], repite: '', responsable: '', inicio: '', fin: '',
    estado: 'Backlog', terminada: '', ...datos, id: siguienteId(doc),
  };
}

/* ============ Deshacer / rehacer ============ */

export interface Instantanea { actividades: Actividad[]; proyecto: string; inicio: string; fin: string; coloresEtq: Documento['coloresEtq'] }
export interface Historial { pasadas: { s: Instantanea; d: string }[]; futuras: { s: Instantanea; d: string }[]; previa: Instantanea | null }
export const MAX_DESHACER = 50;
export const historialVacio = (): Historial => ({ pasadas: [], futuras: [], previa: null });

export const instantanea = (d: Documento): Instantanea =>
  ({ actividades: d.actividades, proyecto: d.meta.proyecto, inicio: d.meta.inicio, fin: d.meta.fin, coloresEtq: d.coloresEtq });
export const aplicarInstantanea = (d: Documento, s: Instantanea): Documento =>
  ({ ...d, actividades: s.actividades, coloresEtq: s.coloresEtq, meta: { ...d.meta, proyecto: s.proyecto, inicio: s.inicio, fin: s.fin } });
const igual = (a: Instantanea, b: Instantanea) => JSON.stringify(a) === JSON.stringify(b);

export function describirCambio(antes: Instantanea, despues: Instantanea): string {
  const A = new Map(antes.actividades.map(x => [x.id, x])), D = new Map(despues.actividades.map(x => [x.id, x]));
  const nuevas = [...D.keys()].filter(k => !A.has(k)), borradas = [...A.keys()].filter(k => !D.has(k));
  const cambiadas = [...D.keys()].filter(k => A.has(k) && JSON.stringify(A.get(k)) !== JSON.stringify(D.get(k)));
  const nom = (x: Actividad) => `«${String(x.actividad).split('\n')[0].slice(0, 40)}»`, total = nuevas.length + borradas.length + cambiadas.length;
  if (!total) return 'el cambio en la meta o en los colores';
  if (total === 1) return nuevas.length ? `agregar ${nom(D.get(nuevas[0])!)}` : borradas.length ? `eliminar ${nom(A.get(borradas[0])!)}` : `el cambio en ${nom(D.get(cambiadas[0])!)}`;
  return [nuevas.length && pl(nuevas.length, 'agregada', 'agregadas'), borradas.length && pl(borradas.length, 'eliminada', 'eliminadas'), cambiadas.length && pl(cambiadas.length, 'cambiada', 'cambiadas')].filter(Boolean).join(', ');
}

/** Llamar después de cada cambio: si el estado difiere del previo, apila el previo para deshacer. */
export function registrarDeshacer(h: Historial, doc: Documento): Historial {
  const ahora = instantanea(doc);
  if (h.previa && !igual(h.previa, ahora)) {
    const pasadas = [...h.pasadas, { s: h.previa, d: describirCambio(h.previa, ahora) }].slice(-MAX_DESHACER);
    return { pasadas, futuras: [], previa: ahora };
  }
  return { ...h, previa: h.previa ?? ahora };
}
export function deshacer(h: Historial, doc: Documento): { h: Historial; doc: Documento; d: string } | null {
  const p = h.pasadas[h.pasadas.length - 1];
  if (!p) return null;
  return { h: { pasadas: h.pasadas.slice(0, -1), futuras: [...h.futuras, { s: instantanea(doc), d: p.d }], previa: p.s }, doc: aplicarInstantanea(doc, p.s), d: p.d };
}
export function rehacer(h: Historial, doc: Documento): { h: Historial; doc: Documento; d: string } | null {
  const p = h.futuras[h.futuras.length - 1];
  if (!p) return null;
  return { h: { pasadas: [...h.pasadas, { s: instantanea(doc), d: p.d }], futuras: h.futuras.slice(0, -1), previa: p.s }, doc: aplicarInstantanea(doc, p.s), d: p.d };
}

/* ============ Meta del proyecto ============ */

/** Cambia nombre y fechas de la meta y lo anota en la bitácora ("meta"). No muta. */
export function conMeta(d: Documento, r: { proyecto: string; inicio: string; fin: string }, usuario: string, ahora: Date = new Date()): Documento {
  const cambios = ([['proyecto', d.meta.proyecto, r.proyecto], ['metaInicio', d.meta.inicio, r.inicio], ['metaFin', d.meta.fin, r.fin]] as const)
    .filter(([, a, b]) => (a || '') !== (b || '')).map(([k, antes, despues]) => ({ k, etq: ETQ_BIT[k], antes: antes || '', despues: despues || '' }));
  if (!cambios.length) return d;
  return {
    ...d, meta: { ...d.meta, ...r },
    bitacora: [...d.bitacora, { fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: null, accion: 'meta', campos: cambios, detalle: '' }],
  };
}

/** ¿Se pueden escribir notas, subtareas o cambios sueltos ahora? (con el archivo tomado, o libre si nadie lo edita) */
export function estadoEscritura(x: {
  hayArchivo: boolean; masNuevo: boolean; modo: 'lectura' | 'edicion'; puedeEscribir: boolean; candado: Candado | null; usuario: string; versionTxt?: string; ahora?: number;
}): { ok: boolean; msg: string } {
  if (!x.hayArchivo) return { ok: false, msg: 'Abre un archivo primero.' };
  if (x.masNuevo) return { ok: false, msg: `El archivo es de una versión más nueva de MDexa${x.versionTxt ? ` (v${x.versionTxt})` : ''}; actualiza tu HTML para agregar notas.` };
  if (x.modo === 'edicion') return { ok: true, msg: 'Se guarda en el archivo al momento.' };
  if (!x.puedeEscribir) return { ok: false, msg: 'Este navegador no puede escribir el archivo compartido; usa Chrome o Edge.' };
  const c = x.candado;
  if (c && c.usuario !== x.usuario && candadoVigente(c, x.ahora ?? Date.now(), TTL_CANDADO)) return { ok: false, msg: `${c.usuario} está editando el archivo; podrás agregar notas cuando lo suelte.` };
  return { ok: true, msg: 'Se guarda directo en el archivo compartido; no necesitas tomarlo.' };
}
