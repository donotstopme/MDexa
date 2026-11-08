import type { Actividad } from './tipos';
import { cerrada } from './utilidades';

const porId = (acts: Actividad[], id: number) => acts.find(x => x.id === id);

/** Dependencias válidas: existen y no es la propia actividad */
export const deps = (acts: Actividad[], a: Actividad): number[] =>
  (a.depende || []).filter(id => id !== a.id && acts.some(x => x.id === id));
export const pendientesDe = (acts: Actividad[], a: Actividad): Actividad[] =>
  deps(acts, a).map(id => porId(acts, id)!).filter(d => !cerrada(d));
export const bloqueada = (acts: Actividad[], a: Actividad): boolean => !cerrada(a) && pendientesDe(acts, a).length > 0;
/** Dependencias sin terminar que acaban después de que esta actividad empiece */
export const choqueFechas = (acts: Actividad[], a: Actividad): Actividad[] =>
  cerrada(a) || !a.inicio ? [] : deps(acts, a).map(id => porId(acts, id)!).filter(d => !cerrada(d) && d.fin && a.inicio <= d.fin);
export const dependientesDe = (acts: Actividad[], id: number): Actividad[] => acts.filter(x => deps(acts, x).includes(id));
export const leerDeps = (t: unknown): number[] => [...new Set((String(t || '').match(/\d+/g) || []).map(Number))];
export const txtDeps = (acts: Actividad[], a: Actividad): string => deps(acts, a).map(i => '#' + i).join(', ');

/** ¿Agregar depId como dependencia de id formaría un círculo? */
export function creaCiclo(acts: Actividad[], id: number, depId: number): boolean {
  const vistos = new Set<number>(), pila = [depId];
  while (pila.length) {
    const c = pila.pop()!;
    if (c === id) return true;
    if (vistos.has(c)) continue;
    vistos.add(c);
    const x = porId(acts, c);
    if (x) pila.push(...deps(acts, x));
  }
  return false;
}

/**
 * Dependencias sin terminar que se ignorarían al pasar `a` a `nuevo`. Sólo importa al pasar a
 * En progreso o Terminado: la interfaz pide confirmar antes de hacerlo.
 */
export function pendientesAlMover(acts: Actividad[], a: Actividad, nuevo: string): Actividad[] {
  if (!['En progreso', 'Terminado'].includes(nuevo) || (a.estado || 'Backlog') === nuevo) return [];
  return pendientesDe(acts, a);
}
