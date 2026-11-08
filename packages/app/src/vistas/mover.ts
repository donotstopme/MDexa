import { conEstado, EST, nomCorto, pendientesAlMover, type Documento, type Estado } from '@gestor/core';
import type { Edicion } from './Lista';

/** Cambia el estado de una actividad; antes pide confirmar si hay dependencias sin terminar */
export function moverConAviso(doc: Documento, edicion: Edicion | undefined, id: number, nuevo: Estado): void {
  const a = doc.actividades.find(x => x.id === id);
  if (!a || EST(a) === nuevo || !edicion) return;
  const p = pendientesAlMover(doc.actividades, a, nuevo);
  if (p.length && !window.confirm(`"${nomCorto(a)}" depende de:\n\n${p.map(d => `• #${d.id} ${nomCorto(d)} (${EST(d)})`).join('\n')}\n\n${p.length === 1 ? 'Esa actividad aún no termina' : 'Esas actividades aún no terminan'}. ¿Pasarla a ${nuevo} de todos modos?`)) return;
  edicion.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === id ? conEstado(x, nuevo) : x)) }));
}
