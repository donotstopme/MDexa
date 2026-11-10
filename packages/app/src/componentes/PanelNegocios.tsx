import { abrevNeg, type StatsNegocio } from '@mdexa/core';
import { Ico, Estrella } from '../original/iconos';

export interface Props {
  stats: StatsNegocio[]; total: number; compacto: boolean; onCompacto(c: boolean): void;
  /** Negocio resaltado (el único filtrado, o el último elegido) */
  activo: string; filtra: boolean; onElegir(g: string): void;
  favs: { n: number; visible: boolean } | null;
}

/** Panel de negocios de la izquierda: avance por negocio; clic filtra o salta al grupo */
export function PanelNegocios({ stats, total, compacto, onCompacto, activo, filtra, onElegir, favs }: Props) {
  const item = (g: string, nombre: string, icono: React.ReactNode, s: StatsNegocio | null, vis: boolean, titulo: string, corto: React.ReactNode) => (
    <button key={g || '(todos)'} className={`nav-neg ${vis ? '' : 'apagado'} ${activo === g ? 'activo' : ''}`} title={titulo} onClick={() => onElegir(g)}>
      <span className="nn-ico">{icono}</span>
      <span className="nn-abbr">{corto}{s && s.venc > 0 && <span className="pv">{s.venc}</span>}</span>
      {s && <span className="nn-mini"><i style={{ width: `${s.pct}%` }} /></span>}
      <span className="nn-txt"><span className="nn-nom">{nombre}</span>{s && <span className="nn-bar"><i style={{ width: `${s.pct}%` }} /></span>}</span>
      <span className="nn-num">{s ? `${s.t}/${s.act}` : total}{s && s.venc > 0 && <b title="Vencidas">● {s.venc}</b>}</span>
    </button>
  );
  return (
    <aside className="card lateral" id="lateral">
      <div className="lat-tit"><Ico n="tienda" /><span className="lt-txt">Negocios</span><span className="nd">{stats.length}</span>
        <button className="lat-toggle" title={compacto ? 'Expandir el panel' : 'Compactar el panel'} aria-label={compacto ? 'Expandir el panel' : 'Compactar el panel'} onClick={() => onCompacto(!compacto)}><Ico n={compacto ? 'der' : 'izq'} /></button></div>
      <div className="lat-nota">{filtra ? 'Clic para filtrar por negocio' : 'Clic para ir al negocio'}</div>
      {item('', 'Todos los negocios', <Ico n="lista" />, null, true, filtra ? 'Ver todos los negocios' : 'Ir al inicio de la lista', <Ico n="lista" t={18} />)}
      {favs && item('__fav', 'Mis favoritas', <span className="estrella on" style={{ padding: 0 }}><Estrella relleno /></span>, null, favs.visible, 'Tus actividades favoritas', <span className="estrella on" style={{ padding: 0 }}><Estrella relleno /></span>)}
      <div className="nav-sep" />
      {stats.map(s => item(s.negocio, s.negocio, <Ico n="tienda" />, s, s.visibles > 0,
        `${s.negocio}: ${s.t} de ${s.act} terminadas${s.venc ? `, ${s.venc} vencidas` : ''}${s.visibles ? '' : ' · oculto por los filtros'}`, abrevNeg(s.negocio)))}
    </aside>
  );
}
