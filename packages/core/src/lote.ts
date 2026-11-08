import type { Actividad, Documento, Estado, Prioridad, Tamano } from './tipos';
import { pendientesDe } from './dependencias';
import { conEstado } from './sesion';
import { EST, addDias } from './utilidades';

const sobre = (d: Documento, ids: ReadonlySet<number>, fn: (a: Actividad) => Actividad): Documento =>
  ({ ...d, actividades: d.actividades.map(a => (ids.has(a.id) ? fn(a) : a)) });

/** Seleccionadas que, al pasar a En progreso o Terminado, dependen de actividades sin terminar */
export const bloqueadasAlMover = (d: Documento, ids: ReadonlySet<number>, estado: string): Actividad[] =>
  ['En progreso', 'Terminado'].includes(estado) ? d.actividades.filter(a => ids.has(a.id) && EST(a) !== estado && pendientesDe(d.actividades, a).length) : [];

export const loteEstado = (d: Documento, ids: ReadonlySet<number>, e: Estado, ahora?: Date) => sobre(d, ids, a => conEstado(a, e, undefined, ahora));
export const loteTamano = (d: Documento, ids: ReadonlySet<number>, t: Tamano | '') => sobre(d, ids, a => ({ ...a, tamano: t }));
export const lotePrioridad = (d: Documento, ids: ReadonlySet<number>, p: Prioridad | '') => sobre(d, ids, a => ({ ...a, prioridad: p }));
export const loteResponsable = (d: Documento, ids: ReadonlySet<number>, r: string) => sobre(d, ids, a => ({ ...a, responsable: r }));
export const loteNegocio = (d: Documento, ids: ReadonlySet<number>, n: string) => sobre(d, ids, a => ({ ...a, negocio: n }));

export type CambioFechas = { op: 'mover'; dias: number } | { op: 'ini'; fecha: string } | { op: 'fin'; fecha: string } | { op: 'quitar' };
/** Cambia las fechas de varias actividades: mover N días, fijar inicio o fin (sin dejar el fin antes del inicio) o quitarlas */
export function loteFechas(d: Documento, ids: ReadonlySet<number>, c: CambioFechas): Documento {
  return sobre(d, ids, a => {
    if (c.op === 'mover') return { ...a, inicio: a.inicio ? addDias(a.inicio, c.dias) : '', fin: a.fin ? addDias(a.fin, c.dias) : '' };
    if (c.op === 'ini') return { ...a, inicio: c.fecha, fin: a.fin && a.fin < c.fecha ? c.fecha : a.fin };
    if (c.op === 'fin') return { ...a, fin: c.fecha, inicio: a.inicio && a.inicio > c.fecha ? c.fecha : a.inicio };
    return { ...a, inicio: '', fin: '' };
  });
}
/** Elimina las actividades y sus notas */
export const loteEliminar = (d: Documento, ids: ReadonlySet<number>): Documento =>
  ({ ...d, actividades: d.actividades.filter(a => !ids.has(a.id)), notas: d.notas.filter(n => !ids.has(n.act)) });
/** Rango de selección con Mayús+clic: todos los ids entre `desde` y `hasta` según el orden en pantalla */
export function rangoSeleccion(orden: number[], desde: number, hasta: number): number[] {
  const a = orden.indexOf(desde), b = orden.indexOf(hasta);
  return a < 0 || b < 0 ? [hasta] : orden.slice(Math.min(a, b), Math.max(a, b) + 1);
}
