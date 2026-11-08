import { VISTAS, type Vista } from '../estado/ui';

/** Barra del modo presentación (para la junta semanal): avance, vistas, negocio y tamaño de letra */
export function BarraPresentacion({ proyecto, fecha, pct, ritmo, vencidas, vista, onVista, negocio, onNegocio, onZoom, onSalir }: {
  proyecto: string; fecha: string; pct: number; ritmo?: string; vencidas: number; vista: Vista; onVista(v: Vista): void; negocio: string; onNegocio(d: number): void; onZoom(d: number): void; onSalir(): void;
}) {
  const vistas = (['lista', 'gantt', 'kanban', 'cal', 'carga'] as Vista[]);
  return (
    <div className="pres-barra" id="presBarra">
      <div className="pres-tit"><b>{proyecto}</b><span>{fecha}</span></div>
      <div className="pres-av"><span><b>{pct}%</b> terminado</span><span className="pres-bar"><i style={{ width: `${pct}%` }} /></span>
        {ritmo && <span className="pres-ritmo">{ritmo}</span>}{vencidas > 0 && <span className="pres-venc">{vencidas} {vencidas === 1 ? 'vencida' : 'vencidas'}</span>}</div>
      <div className="seg pres-vistas">{vistas.map(v => <button key={v} className={v === vista ? 'on' : ''} onClick={() => onVista(v)}>{VISTAS[v]}</button>)}</div>
      <div className="pres-neg"><button title="Negocio anterior (←)" aria-label="Negocio anterior" onClick={() => onNegocio(-1)}>‹</button><span>{negocio}</span><button title="Negocio siguiente (→)" aria-label="Negocio siguiente" onClick={() => onNegocio(1)}>›</button></div>
      <div className="pres-zoom"><button title="Letra más chica" aria-label="Letra más chica" onClick={() => onZoom(-0.1)}>A−</button><button title="Letra más grande" aria-label="Letra más grande" onClick={() => onZoom(0.1)}>A+</button></div>
      <button className="pres-salir" title="Salir del modo presentación (Esc)" onClick={onSalir}>Salir</button>
    </div>
  );
}
