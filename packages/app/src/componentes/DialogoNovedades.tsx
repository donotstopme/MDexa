import { CAMPOS_NOV, EST, autoresDesde, claveNota, mencionesEn, negocioDe, nomCorto, personasConocidas, SIN_NEGOCIO, type Documento, type Novedades, type Nota } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { colorEstado, fmtHora, fmtTxt, haceLargo } from '../original/piezas';
import { Dialogo } from './Dialogo';

const valorNov = (k: string, v: string) => (!v ? '—' : k === 'inicio' || k === 'fin' ? fmtTxt(v) : v);
const valorBit = (k: string, v: string) => (!v ? '—' : ['inicio', 'fin', 'metaInicio', 'metaFin'].includes(k) && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtTxt(v) : v);

/** Ventana de novedades: lo que otras personas cambiaron o comentaron desde tu última visita */
export function DialogoNovedades({ doc, nov, usuario, vistoFecha, acc, onVisto, onNotaVista, onTodo, onSoloNovedades, onBitacora, onCerrar }: {
  doc: Documento; nov: Novedades; usuario: string; vistoFecha: string;
  acc: { ir(id: number): void; notas(id: number): void }; onVisto(id: number): void; onNotaVista(n: Nota): void; onTodo(): void; onSoloNovedades(): void; onBitacora(): void; onCerrar(): void;
}) {
  const personas = personasConocidas(doc, usuario);
  const fmtV = (k: string, v: string) => (k === 'estado' ? <span className={`es-${colorEstado(v || 'Backlog')}`}>{v || 'Backlog'}</span> : <>{valorNov(k, v)}</>);
  const quien = (id: number, verbo: string) => {
    const a = autoresDesde(doc, id, vistoFecha, usuario);
    return a ? <div className="nov-quien"><Ico n="usuario" t={12} /> {verbo} por <b>{a.quienes.join(', ')}</b> · {haceLargo(a.ultima)}</div> : null;
  };
  const ok = (onClick: () => void, titulo = 'Marcar como visto') => <button className="ico-btn nov-ok" title={titulo} aria-label={titulo} onClick={e => { e.stopPropagation(); onClick(); }}><Ico n="check" t={14} /></button>;
  const item = (a: (typeof nov.nuevas)[number], tipo: 'nueva' | 'cambio', extra?: React.ReactNode) => (
    <li key={a.id} className="nov-it" onClick={() => { onCerrar(); acc.ir(a.id); }}>
      <div className="nov-top"><span className={`nov-mark ${tipo}`}>{tipo === 'nueva' ? 'Nueva' : 'Cambió'}</span><b title={a.actividad}>{nomCorto(a)}</b>{ok(() => onVisto(a.id))}</div>
      <div className="nd nov-det">{negocioDe(a)} · <span className={`es-${colorEstado(EST(a))}`}>{EST(a)}</span>{a.responsable ? ' · ' + a.responsable : ''}{a.fin ? ' · fin ' + fmtTxt(a.fin) : ''}</div>
      {quien(a.id, tipo === 'nueva' ? 'Creada' : 'Cambiada')}{extra}
    </li>
  );
  const notaNov = (x: Nota, marca: boolean) => {
    const a = doc.actividades.find(y => y.id === x.act);
    const txt = x.texto.length > 220 ? x.texto.slice(0, 220) + '…' : x.texto;
    return (
      <li key={claveNota(x)} className={`nov-it ${marca ? 'nov-men' : ''}`} onClick={() => { onCerrar(); acc.notas(x.act); }}>
        <div className="nov-top"><span className={`nov-mark ${marca ? 'nov-m-men' : 'nueva'}`}>{marca ? '@ Mención' : 'Nota'}</span>
          <b>{marca ? `Te mencionaron en #${x.act}${a ? ' · ' + nomCorto(a) : ''}` : a ? nomCorto(a) : ''}</b>{ok(() => onNotaVista(x), 'Marcar como vista')}</div>
        <div className="nd nov-det"><b>{x.autor}</b> · {haceLargo(x.fecha)}{a ? ' · ' + negocioDe(a) : ''}</div>
        <div className="nov-nota">{mencionesEn(txt, personas).length ? <span className="mencion">{txt}</span> : txt}</div>
      </li>
    );
  };
  const metaNov = doc.bitacora.filter(e => e.accion === 'meta' && e.fecha > vistoFecha && e.autor !== usuario);
  const otras = nov.notas.filter(x => !nov.menciones.includes(x));
  return (
    <Dialogo onCerrar={onCerrar}>
      <h2><Ico n="campana" t={20} /> Novedades</h2>
      <p>{nov.total
        ? `Cambios de otras personas desde tu última visita (${fmtHora(vistoFecha)}). Tus propios cambios no aparecen aquí. Clic en una actividad para ir a ella.`
        : `No hay cambios desde tu última visita (${fmtHora(vistoFecha)}).`}</p>
      <div className="nov-cont">
        {!nov.total && <div className="vacio"><Ico n="check" t={26} /><p>Estás al día.</p></div>}
        {nov.menciones.length > 0 && <><h3 className="nov-h-men"><Ico n="arroba" t={15} /> Te mencionaron <span className="m-n">{nov.menciones.length}</span></h3><ul className="nov-lista">{nov.menciones.map(x => notaNov(x, true))}</ul></>}
        {nov.cambios.length > 0 && <><h3><Ico n="lapiz" t={15} /> Modificadas <span className="m-n">{nov.cambios.length}</span></h3><ul className="nov-lista">{nov.cambios.map(c =>
          item(c.a, 'cambio', <ul className="nov-cambios">{c.campos.map(x => <li key={x.k}>{CAMPOS_NOV[x.k]}: <s>{fmtV(x.k, x.antes)}</s> → <b>{fmtV(x.k, x.despues)}</b></li>)}</ul>))}</ul></>}
        {nov.nuevas.length > 0 && <><h3><Ico n="mas" t={15} /> Nuevas <span className="m-n">{nov.nuevas.length}</span></h3><ul className="nov-lista">{nov.nuevas.map(a => item(a, 'nueva'))}</ul></>}
        {nov.borradas.length > 0 && <><h3><Ico n="basura" t={15} /> Eliminadas <span className="m-n">{nov.borradas.length}</span></h3><ul className="nov-lista">{nov.borradas.map(b => (
          <li key={b.id} className="nov-it borrada">
            <div className="nov-top"><span className="nov-mark borrada">Eliminada</span><b>{String(b.actividad).split('\n')[0]}</b>{ok(() => onVisto(b.id))}</div>
            <div className="nd nov-det">{String(b.negocio || SIN_NEGOCIO)}{b.responsable ? ' · ' + b.responsable : ''} · estaba en {String(b.estado || 'Backlog')}</div>
            {quien(b.id, 'Eliminada')}
          </li>))}</ul></>}
        {metaNov.length > 0 && <><h3><Ico n="bandera" t={15} /> Meta del proyecto</h3><ul className="nov-lista">{metaNov.map(e => (
          <li key={e.fecha} className="nov-it borrada" style={{ cursor: 'default' }}>
            <div className="nov-top"><span className="nov-mark cambio">Meta</span><b style={{ textDecoration: 'none', color: 'var(--text)' }}>Cambió la meta del proyecto</b></div>
            <div className="nov-quien"><Ico n="usuario" t={12} /> por <b>{e.autor}</b> · {haceLargo(e.fecha)}</div>
            <ul className="nov-cambios">{e.campos.map(c => <li key={c.k}>{c.etq}: <s>{valorBit(c.k, c.antes)}</s> → <b>{valorBit(c.k, c.despues)}</b></li>)}</ul></li>))}</ul></>}
        {otras.length > 0 && <><h3><Ico n="nota" t={15} /> Notas nuevas <span className="m-n">{otras.length}</span></h3><ul className="nov-lista">{otras.map(x => notaNov(x, false))}</ul></>}
      </div>
      <div className="pie">
        <div className="barra" style={{ justifyContent: 'flex-start' }}>
          <button type="button" disabled={!(nov.nuevas.length + nov.cambios.length)} onClick={onSoloNovedades}>Ver solo novedades</button>
          <button type="button" onClick={onBitacora}>Ver bitácora</button>
        </div>
        <div className="barra"><button type="button" onClick={onCerrar}>Cerrar</button><button type="button" className="prim" disabled={!nov.total} onClick={onTodo}>Marcar todo como visto</button></div>
      </div>
    </Dialogo>
  );
}
