import { useEffect } from 'react';
import { Ico } from '../original/iconos';
import type { TipoMasivo } from './MenuMasivo';

export interface AccionesMasivas {
  menu(tipo: TipoMasivo, ancla: HTMLElement): void; etiquetas(ancla: HTMLElement): void;
  favoritas(): void; eliminar(): void; todas(): void; limpiar(): void;
}

const MENUS: [TipoMasivo, string, string][] = [
  ['estado', 'tablero', 'Estado'], ['prioridad', 'prioridad', 'Prioridad'], ['tamano', 'carga', 'Tamaño'], ['responsable', 'usuario', 'Responsable'],
  ['negocio', 'tienda', 'Negocio'], ['fechas', 'calendario', 'Fechas'],
];

/** Barra de acciones para las actividades seleccionadas (sólo con el archivo tomado): selección · cambios · acciones */
export function BarraMasiva({ n, todasFav, nVisibles, hayMasVisibles, abierto, acc }: {
  n: number; todasFav: boolean; nVisibles: number; hayMasVisibles: boolean; abierto?: TipoMasivo | null; acc: AccionesMasivas;
}) {
  // Deja espacio al final de la página y sube los avisos para que la barra no tape nada
  useEffect(() => { if (!n) return; document.body.classList.add('con-masiva'); return () => document.body.classList.remove('con-masiva'); }, [!n]);
  if (!n) return null;
  const fav = todasFav ? 'Quitar de favoritas' : 'Agregar a favoritas';
  const menu = (tipo: TipoMasivo | 'etiquetas', ico: string, txt: string) => (
    <button key={tipo} type="button" className="ms-menu" data-mas={tipo} title={`Cambiar ${txt.toLowerCase()}`} aria-label={txt} aria-haspopup="true" aria-expanded={abierto === tipo}
      onClick={e => (tipo === 'etiquetas' ? acc.etiquetas(e.currentTarget) : acc.menu(tipo, e.currentTarget))}>
      <Ico n={ico} /><span className="t">{txt}</span><span className="ms-car">▴</span></button>
  );
  return (
    <div className="masiva" id="masiva" role="toolbar" aria-label="Acciones para las actividades seleccionadas">
      <button type="button" title="Quitar la selección (Esc)" aria-label="Quitar la selección" onClick={acc.limpiar}><Ico n="x" /></button>
      <span className="ms-n"><b>{n}</b> <span>{n === 1 ? 'seleccionada' : 'seleccionadas'}</span></span>
      {hayMasVisibles && <button type="button" className="ms-todas" title="Seleccionar todas las actividades visibles en esta vista" onClick={acc.todas}>Todas ({nVisibles})</button>}
      <span className="ms-sep" />
      {MENUS.map(([t, i, x]) => menu(t, i, x))}
      {menu('etiquetas', 'etiqueta', 'Etiquetas')}
      <span className="ms-sep" />
      <button type="button" className="ms-menu" data-mas="duplicar" title="Duplicar las seleccionadas" aria-label="Duplicar" aria-haspopup="true" aria-expanded={abierto === 'duplicar'}
        onClick={e => acc.menu('duplicar', e.currentTarget)}><Ico n="copiar" /><span className="t">Duplicar</span></button>
      <button type="button" className={`ms-fav ${todasFav ? 'on' : ''}`} title={fav} aria-label={fav} aria-pressed={todasFav} onClick={acc.favoritas}><Ico n="estrella" /></button>
      <button type="button" className="peligro" title="Eliminar las seleccionadas" aria-label="Eliminar" onClick={acc.eliminar}><Ico n="basura" /></button>
    </div>
  );
}
