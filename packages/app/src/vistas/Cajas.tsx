import type { Seleccion } from './acciones';

/** Casilla de selección de una actividad */
export const CajaSel = ({ id, sel }: { id: number; sel?: Seleccion }) => sel ? (
  <input type="checkbox" className="sel" checked={sel.ids.has(id)} title="Seleccionar (Mayús+clic para seleccionar un rango)" aria-label="Seleccionar" draggable={false}
    onClick={e => e.stopPropagation()} onChange={e => sel.alternar(id, e.target.checked, (e.nativeEvent as MouseEvent).shiftKey)} />
) : null;

/** Casilla que selecciona todo un grupo (o todas las visibles) */
export function CajaGrupo({ ids, sel, todo = false }: { ids: number[]; sel?: Seleccion; todo?: boolean }) {
  if (!sel || !ids.length) return null;
  const n = ids.filter(i => sel.ids.has(i)).length;
  return <input type="checkbox" className={todo ? 'sel-todo' : 'sel-g'} checked={n === ids.length} ref={el => { if (el) el.indeterminate = n > 0 && n < ids.length; }}
    title={todo ? 'Seleccionar todas las visibles' : 'Seleccionar todo el grupo'} aria-label={todo ? 'Seleccionar todas las visibles' : 'Seleccionar todo el grupo'} onClick={e => e.stopPropagation()} onChange={() => sel.grupo(ids)} />;
}
