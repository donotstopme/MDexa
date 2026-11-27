import type { Actividad, Documento, Estado, Prioridad, Tamano } from './tipos';
import { pendientesDe } from './dependencias';
import { conEstado } from './sesion';
import { hitoCompatible, hitoCumplido } from './hitos';
import { EST, addDias, siguienteId } from './utilidades';

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

/* ============ Duplicar ============ */

/** En el mismo negocio la copia se distingue con «(copia)» al final de su primera línea */
export function nombreCopia(texto: string): string {
  const [primera = '', ...resto] = texto.split('\n');
  return [/\(copia\)\s*$/i.test(primera) ? primera : `${primera.trimEnd()} (copia)`, ...resto].join('\n');
}

/**
 * Lo que hereda la copia de una actividad: empieza en Planeado, con las subtareas sin marcar y sin notas, imágenes ni historial.
 * El hito sólo se conserva si sigue abierto e incluye el negocio de la copia.
 */
export function datosCopia(d: Documento, a: Actividad, negocio: string = a.negocio, dias = 0, repetir = true): Omit<Actividad, 'id'> {
  const h = d.hitos.find(x => x.id === a.hito), mover = (f: string) => (f && dias ? addDias(f, dias) : f);
  return {
    negocio, actividad: negocio === a.negocio ? nombreCopia(a.actividad) : a.actividad, tamano: a.tamano, prioridad: a.prioridad,
    etiquetas: [...(a.etiquetas || [])], depende: [...(a.depende || [])], repite: repetir ? a.repite : '', responsable: a.responsable,
    inicio: mover(a.inicio), fin: mover(a.fin), estado: 'Planeado', terminada: '',
    ...(a.subtareas?.length ? { subtareas: a.subtareas.map(s => ({ t: s.t, ok: false })) } : {}),
    ...(h && !hitoCumplido(d, h) && hitoCompatible(h, negocio) ? { hito: h.id } : {}),
  };
}

export interface OpcionesCopia {
  /** Negocios destino; null = el mismo de cada actividad */
  negocios: string[] | null; dias: number; estado: Estado;
}

/** Copia las actividades (una vez por negocio destino). Las copias que dependían entre sí quedan dependiendo unas de otras. */
export function loteDuplicar(d: Documento, ids: ReadonlySet<number>, o: OpcionesCopia, ahora?: Date): { doc: Documento; nuevas: number[] } {
  const origen = d.actividades.filter(a => ids.has(a.id)).sort((a, b) => a.id - b.id), nuevas: number[] = [];
  let doc = d;
  for (const destino of o.negocios ?? [null]) {
    const base = siguienteId(doc), nuevoId = new Map(origen.map((a, i) => [a.id, base + i]));
    const copias = origen.map(a => {
      const c = datosCopia(d, a, destino ?? a.negocio, o.dias, origen.length === 1);
      return conEstado({ ...c, id: nuevoId.get(a.id)!, depende: c.depende.map(x => nuevoId.get(x) ?? x) }, o.estado, undefined, ahora);
    });
    nuevas.push(...copias.map(c => c.id));
    doc = { ...doc, actividades: [...doc.actividades, ...copias] };
  }
  return { doc, nuevas };
}
