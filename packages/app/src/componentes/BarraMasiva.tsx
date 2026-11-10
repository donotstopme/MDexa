import { ESTADOS, PRIORIDADES, TAMANOS, type Estado, type Prioridad, type Tamano } from '@mdexa/core';
import { Ico } from '../original/iconos';

export interface AccionesMasivas {
  estado(e: Estado): void; tamano(t: Tamano | ''): void; prioridad(p: Prioridad | ''): void; etiquetas(ancla: HTMLElement): void; cambio(tipo: 'responsable' | 'negocio' | 'fechas'): void;
  favoritas(): void; eliminar(): void; todas(): void; limpiar(): void;
}

/** Barra de acciones para las actividades seleccionadas (sólo con el archivo tomado) */
export function BarraMasiva({ n, todasFav, hayMasVisibles, acc }: { n: number; todasFav: boolean; hayMasVisibles: boolean; acc: AccionesMasivas }) {
  if (!n) return null;
  return (
    <div className="masiva" id="masiva" role="toolbar" aria-label="Acciones para las actividades seleccionadas">
      <span className="ms-n"><b>{n}</b> <span>{n === 1 ? 'seleccionada' : 'seleccionadas'}</span></span>
      {hayMasVisibles && <button title="Seleccionar todas las actividades visibles en esta vista" onClick={acc.todas}>Todas las visibles</button>}
      <span className="ms-sep" />
      <select title="Cambiar el estado" value="" onChange={e => { if (e.target.value) acc.estado(e.target.value as Estado); }}><option value="">Estado…</option>{ESTADOS.map(e => <option key={e}>{e}</option>)}</select>
      <select title="Cambiar el tamaño" value="" onChange={e => { if (e.target.value) acc.tamano(e.target.value === '__sin' ? '' : (e.target.value as Tamano)); }}>
        <option value="">Tamaño…</option>{Object.entries(TAMANOS).map(([k, t]) => <option key={k} value={k} title={t.txt}>{k}</option>)}<option value="__sin">Sin tamaño</option></select>
      <select title="Cambiar la prioridad" value="" onChange={e => { if (e.target.value) acc.prioridad(e.target.value === '__sin' ? '' : (e.target.value as Prioridad)); }}>
        <option value="">Prioridad…</option>{Object.keys(PRIORIDADES).map(p => <option key={p}>{p}</option>)}<option value="__sin">Sin prioridad</option></select>
      <button onClick={e => acc.etiquetas(e.currentTarget)}><Ico n="etiqueta" /> Etiquetas</button>
      <button onClick={() => acc.cambio('responsable')}><Ico n="usuario" /> Responsable</button>
      <button onClick={() => acc.cambio('negocio')}><Ico n="tienda" /> Negocio</button>
      <button onClick={() => acc.cambio('fechas')}><Ico n="calendario" /> Fechas</button>
      <button onClick={acc.favoritas}><Ico n="estrella" /> {todasFav ? 'Quitar de favoritas' : 'Favoritas'}</button>
      <button className="peligro" onClick={acc.eliminar}><Ico n="basura" /> Eliminar</button>
      <button className="ico-btn" title="Quitar la selección (Esc)" aria-label="Quitar la selección" onClick={acc.limpiar}><Ico n="x" /></button>
    </div>
  );
}
