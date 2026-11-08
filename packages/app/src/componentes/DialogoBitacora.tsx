import { useMemo, useState } from 'react';
import { ACCIONES_BIT, addDias, autoresBit, bitacoraCsv, colorAutor, filtrarBitacora, hoy, iniciales, nombreActBit, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { colorEstado, fmtTxt } from '../original/piezas';
import { Dialogo } from './Dialogo';

const valorBit = (k: string, v: string) => (!v ? '—' : ['inicio', 'fin', 'metaInicio', 'metaFin'].includes(k) && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtTxt(v) : v);

/** Bitácora de cambios: quién cambió qué y cuándo, con filtros y descarga a CSV */
export function DialogoBitacora({ doc, act, onIr, onCerrar }: { doc: Documento; act: number | null; onIr(id: number): void; onCerrar(): void }) {
  const [texto, setTexto] = useState(''), [autor, setAutor] = useState(''), [periodo, setPeriodo] = useState(act != null ? 0 : 7), [solo, setSolo] = useState(act);
  const es = useMemo(() => filtrarBitacora(doc, { texto, autor, periodo, act: solo }), [doc, texto, autor, periodo, solo]);
  const hoyS = hoy(), ayer = addDias(hoyS, -1);
  const fmtV = (k: string, v: string) => (k === 'estado' ? <span className={`es-${colorEstado(v || 'Backlog')}`}>{v || 'Backlog'}</span> : <>{valorBit(k, v)}</>);
  const csv = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bitacoraCsv(doc, es)], { type: 'text/csv' })); a.download = `bitacora-${hoyS}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  let diaActual = '';
  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra">
        <strong><Ico n="reloj" t={18} /> Bitácora <span className="nd" style={{ fontWeight: 400 }}>· {es.length} {es.length === 1 ? 'movimiento' : 'movimientos'}</span></strong>
        <div className="barra"><button onClick={csv}><Ico n="descargar" /> Descargar .csv</button><button className="prim" onClick={onCerrar}>Cerrar</button></div>
      </div>
      <div className="bit-filtros">
        <div className="buscar"><Ico n="buscar" /><input placeholder="Buscar en la bitácora…" value={texto} onChange={e => setTexto(e.target.value)} /></div>
        <select value={autor} onChange={e => setAutor(e.target.value)}><option value="">Todas las personas</option>{autoresBit(doc).map(a => <option key={a}>{a}</option>)}</select>
        <select value={periodo} onChange={e => setPeriodo(+e.target.value)}><option value={1}>Hoy</option><option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={0}>Todo</option></select>
        {solo != null && <span className="bit-chip">Solo: <b>{nombreActBit(doc, solo).nombre}</b> <button className="ico-btn" title="Ver toda la bitácora" aria-label="Ver toda la bitácora" onClick={() => setSolo(null)}><Ico n="x" t={12} /></button></span>}
      </div>
      <div className="contenido">
        {!es.length && <div className="vacio" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}><Ico n="reloj" t={28} />
          <p>{doc.bitacora.length ? 'No hay movimientos con estos filtros.' : 'Todavía no hay movimientos. La bitácora se llena sola cada vez que alguien edita el archivo.'}</p></div>}
        {es.map(e => {
          const d = new Date(e.fecha), dia = d.toLocaleDateString('en-CA'), cab = dia !== diaActual;
          diaActual = dia;
          const etq = dia === hoyS ? 'Hoy' : dia === ayer ? 'Ayer' : d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
          const ac = ACCIONES_BIT[e.accion] || { ic: 'lapiz', c: 'gris', t: e.accion }, a = e.act != null ? nombreActBit(doc, e.act) : null;
          return (
            <div key={e.fecha + e.autor + e.act + e.accion}>
              {cab && <h3 className="bit-dia">{etq.charAt(0).toUpperCase() + etq.slice(1)}</h3>}
              <div className="bit-e">
                <span className="bit-hora">{d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="avatar sm" style={{ '--h': colorAutor(e.autor) } as React.CSSProperties} title={e.autor}>{iniciales(e.autor) || '?'}</span>
                <div className="bit-cuerpo">
                  <div className="bit-l1"><b>{e.autor}</b> <span className={`bit-acc es-${ac.c}`}><Ico n={ac.ic} t={13} /> {ac.t}</span>
                    {a && <>{a.existe ? <a href="#" onClick={ev => { ev.preventDefault(); onCerrar(); onIr(e.act!); }}>{a.nombre}</a> : <span className="tachado" title="Esta actividad ya no existe">{a.nombre}</span>} <span className="nd">{a.negocio}</span></>}</div>
                  {e.campos.length > 0 && <ul className="nov-cambios">{e.campos.map(c => <li key={c.k}>{c.etq}: <s>{fmtV(c.k, c.antes)}</s> → <b>{fmtV(c.k, c.despues)}</b></li>)}</ul>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Dialogo>
  );
}
