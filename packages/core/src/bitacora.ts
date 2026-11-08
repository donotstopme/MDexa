import { ETQ_BIT, JUNTAR_BIT, SIN_NEGOCIO } from './constantes';
import type { Actividad, CampoBit, EntradaBit } from './tipos';

export const valBit = (v: unknown): string =>
  (v === '' || v == null) ? '—' : String(v).replace(/[|;\r\n]+/g, ' ').replace(/→/g, '->').trim().slice(0, 140);

export const nombreDe = (d?: Pick<Actividad, 'negocio' | 'actividad'> | null): string =>
  d ? `${d.negocio || SIN_NEGOCIO} · ${String(d.actividad || '').split('\n')[0]}` : '';

export const detalleBit = (e: EntradaBit): string =>
  e.accion === 'cambió' || e.accion === 'meta'
    ? e.campos.map(c => `${c.etq}: ${valBit(c.antes)} → ${valBit(c.despues)}`).join('; ')
    : valBit(e.detalle);

/** `mb` es el resultado de la regex de una línea de bitácora: [, fecha, autor, act, accion, detalle] */
export function leerEntradaBit(mb: string[]): EntradaBit {
  const [, fecha, autor, act, accion, det] = mb;
  const e: EntradaBit = { fecha, autor: autor || 'Sin nombre', act: act === '-' ? null : +act, accion, campos: [], detalle: '' };
  if (accion === 'cambió' || accion === 'meta') {
    e.campos = det.split('; ').map(s => {
      const m = s.match(/^(.+?):\s(.*?)\s→\s(.*)$/);
      if (!m) return null;
      const k = Object.keys(ETQ_BIT).find(x => ETQ_BIT[x] === m[1]) || m[1];
      return { k, etq: m[1], antes: m[2] === '—' ? '' : m[2], despues: m[3] === '—' ? '' : m[3] };
    }).filter((x): x is CampoBit => x !== null);
  } else e.detalle = det;
  return e;
}

/**
 * Anota un cambio en la bitácora (muta el arreglo recibido). Cambios seguidos de la misma
 * persona a la misma actividad en menos de 3 min se juntan en una sola entrada.
 */
export function registrarBit(
  bitacora: EntradaBit[], usuario: string, accion: string, act: number | null,
  campos: CampoBit[], datos?: Pick<Actividad, 'negocio' | 'actividad'> | null, ahora: Date = new Date(),
): void {
  const iso = ahora.toISOString(), autor = usuario || 'Sin nombre', ult = bitacora[bitacora.length - 1];
  const reciente = !!ult && ult.act === act && ult.autor === autor && ahora.getTime() - Date.parse(ult.fecha) < JUNTAR_BIT;
  if (accion === 'cambió' && reciente && ult.accion === 'cambió') {
    for (const c of campos) {
      const p = ult.campos.find(x => x.k === c.k);
      if (p) p.despues = c.despues; else ult.campos.push({ ...c });
    }
    ult.campos = ult.campos.filter(c => c.antes !== c.despues);
    ult.fecha = iso;
    if (!ult.campos.length) bitacora.pop();
    return;
  }
  if (accion === 'cambió' && reciente && ult.accion === 'creó') { ult.detalle = nombreDe(datos); ult.fecha = iso; return; }
  if (accion === 'eliminó' && reciente && ult.accion === 'creó') { bitacora.pop(); return; }   // creada y borrada al momento
  if (accion === 'cambió' && !campos.length) return;
  bitacora.push({ fecha: iso, autor, act, accion, campos: campos.map(c => ({ ...c })), detalle: nombreDe(datos) });
}

/* ============ Consultas de la bitácora ============ */
import { ACCIONES_BIT } from './constantes';
import { negocioDe, normaliza, unicos } from './utilidades';
import type { Documento } from './tipos';

/** Nombre de una actividad por su número, aunque ya no exista (se toma de la bitácora) */
export function nombreActBit(d: Pick<Documento, 'actividades' | 'bitacora'>, id: number): { nombre: string; negocio: string; existe: boolean } {
  const a = d.actividades.find(x => x.id === id);
  if (a) return { nombre: a.actividad.split('\n')[0], negocio: negocioDe(a), existe: true };
  const e = [...d.bitacora].reverse().find(x => x.act === id && x.detalle && x.accion !== 'imagen');
  if (e) { const [neg, ...r] = e.detalle.split(' · '); return { nombre: r.join(' · ') || e.detalle, negocio: neg, existe: false }; }
  return { nombre: `Actividad #${id}`, negocio: '', existe: false };
}

export interface FiltroBit { texto: string; autor: string; /** días hacia atrás: 1 = hoy, 0 = todo */ periodo: number; act: number | null }
/** Entradas que pasan el filtro, la más reciente primero */
export function filtrarBitacora(d: Documento, f: FiltroBit, ahora: Date = new Date()): EntradaBit[] {
  const t = normaliza(f.texto || '');
  const desde = f.periodo === 1 ? new Date(new Date(ahora).setHours(0, 0, 0, 0)).toISOString() : f.periodo ? new Date(ahora.getTime() - f.periodo * 864e5).toISOString() : '';
  return d.bitacora.filter(e => (f.act == null || e.act === f.act) && (!f.autor || e.autor === f.autor) && (!desde || e.fecha >= desde) &&
    (!t || normaliza(`${e.autor} ${ACCIONES_BIT[e.accion]?.t || e.accion} ${e.act != null ? nombreActBit(d, e.act).nombre + ' ' + nombreActBit(d, e.act).negocio : 'meta'} ${detalleBit(e)}`).includes(t))).slice().reverse();
}
export const autoresBit = (d: Documento): string[] => unicos(d.bitacora.map(e => e.autor));

/** CSV (con BOM, para Excel) de las entradas de la bitácora */
export function bitacoraCsv(d: Documento, es: EntradaBit[]): string {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = es.map(e => {
    const act = e.act != null ? nombreActBit(d, e.act) : { nombre: '(meta del proyecto)', negocio: '' };
    return [new Date(e.fecha).toLocaleString('es-MX'), e.autor, ACCIONES_BIT[e.accion]?.t || e.accion, e.act ?? '', act.nombre, act.negocio, detalleBit(e).replace(/ → /g, ' -> ')].map(q).join(',');
  });
  return '﻿' + ['Fecha', 'Autor', 'Acción', 'ID', 'Actividad', 'Negocio', 'Detalle'].map(q).join(',') + '\n' + filas.join('\n');
}
