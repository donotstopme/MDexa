import { useEffect, useRef, useState } from 'react';
import { Ico } from '../original/iconos';
import { describirEstado, type Props as EstadoProps } from './Banner';
import { SIG, TEMAS, alternarPantalla, type Props as CabeceraProps } from './Cabecera';

/**
 * Cuando la cabecera deja de verse, este botón flotante (del color del estado) abre un panel con quién edita
 * y todas sus acciones.
 */
export function Flotante({ estado, cab, onNueva, visible }: { estado: EstadoProps; cab: CabeceraProps; onNueva?(): void; visible?: boolean }) {
  const [fuera, setFuera] = useState(!!visible);
  const [abierto, setAbierto] = useState(false), [mas, setMas] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = document.querySelector('header');
    if (!h) return;
    const o = new IntersectionObserver(([x]) => setFuera(!x!.isIntersecting));
    o.observe(h); return () => o.disconnect();
  }, []);
  useEffect(() => { if (!fuera) setAbierto(false); }, [fuera]);
  useEffect(() => { if (!abierto) setMas(false); }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const clic = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    // Escape cierra primero el panel, sin quitar la selección
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setAbierto(false); } };
    document.addEventListener('pointerdown', clic); document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', clic); document.removeEventListener('keydown', esc, true); };
  }, [abierto]);
  if (!fuera) return null;

  const e = describirEstado(estado), n = cab.novedades;
  const globo = n > 0 && <span className={`nov-badge ${cab.menciones ? 'con-men' : ''}`}>{n > 99 ? '99+' : n}</span>;
  const hacer = (fn?: () => void) => () => { setAbierto(false); fn?.(); };
  const boton = (ico: string, txt: string, fn?: () => void, off = false, extra?: React.ReactNode) => (
    <button key={txt} type="button" disabled={off} onClick={hacer(fn)}><Ico n={ico} t={18} /><span>{txt}</span>{extra}</button>
  );
  return (
    <div className={`flot ${e.cls}`} id="flotante" ref={raiz}>
      {abierto && (
        <div className="flot-panel" role="dialog" aria-label="Estado y acciones">
          <div className="flot-cab"><Ico n={e.icono} t={20} /><div title={e.ayuda || undefined}><span>{e.titulo}</span>{e.detalle && <span className="det">{e.detalle}</span>}</div></div>
          {e.acciones && <div className="flot-acc" onClick={ev => { if ((ev.target as HTMLElement).closest('button')) setAbierto(false); }}>{e.acciones}</div>}
          {onNueva && <button type="button" className="prim flot-nueva" onClick={hacer(onNueva)}><Ico n="mas" /> Nueva actividad</button>}
          <div className="flot-rej">
            {boton('carpeta', 'Abrir', cab.onAbrir)}
            {boton('refrescar', 'Refrescar', cab.onRefrescar)}
            {boton('campana', 'Novedades', cab.onNovedades, false, globo)}
            {boton('reloj', 'Bitácora', cab.onBitacora, !cab.hayArchivo)}
            {boton('bandera', 'Hitos', cab.onHitos, !cab.hayArchivo)}
            {boton('grafica', 'Reporte', cab.onReporte, !cab.hayArchivo)}
            {boton('libro', 'Manual', cab.onManual)}
            <button type="button" aria-expanded={mas} onClick={() => setMas(m => !m)}><Ico n="puntos" t={18} /><span>Más</span></button>
            <button type="button" title={`Tema: ${TEMAS[cab.tema].t}. Clic para cambiar a ${TEMAS[SIG[cab.tema]].t}`} onClick={() => cab.onTema(SIG[cab.tema])}><Ico n={TEMAS[cab.tema].ic} t={18} /><span>Tema</span></button>
            {boton('expandir', 'Pantalla', alternarPantalla)}
          </div>
          {mas && <div className="flot-mas">{cab.extras.map(x => <button key={x.titulo} type="button" title={x.desc} onClick={hacer(x.onClick)}>{x.titulo}</button>)}</div>}
          <button type="button" className="flot-arriba" onClick={hacer(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}><Ico n="subir" t={14} /> Volver arriba</button>
        </div>
      )}
      <button type="button" className="flot-btn" aria-expanded={abierto} aria-label={`Estado y acciones${e.corto ? `: ${e.corto}` : ''}`} title="Estado del archivo y acciones" onClick={() => setAbierto(a => !a)}>
        <Ico n={e.icono} t={22} />{e.corto && <span className="flot-txt">{e.corto}</span>}{globo}
      </button>
    </div>
  );
}
