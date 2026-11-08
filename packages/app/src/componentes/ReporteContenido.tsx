import { datosAvance, ESTADOS, NOMBRE_APP, ORDEN_TAMANOS, TAMANOS, VERSION_TXT, addDias, dias, negocioDe, quienTermino, resultado, situacion, type ActR, type AnalisisReporte, type Documento, type Resumen } from '@gestor/core';
import { GraficaAvance, LeyendaAvance, ResumenAvance, TablaAvance } from './GraficaAvance';
import { TamBadge, colorEstado, fmtHora, fmtTxt } from '../original/piezas';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const Pct = ({ p }: { p: number }) => <div className="pct"><div className="bar"><div className="f-verde" style={{ width: `${p}%` }} /></div><span>{p}%</span></div>;

function TablaResumen({ titulo, lista, col }: { titulo: string; lista: Resumen[]; col: string }) {
  return (
    <>
      <h2>{titulo}</h2>
      <div className="scroll"><table>
        <thead><tr><th>{col}</th><th className="num">Asignadas</th><th className="num">Terminadas</th><th className="num">A tiempo</th><th className="num">Con retraso</th><th className="num">En progreso</th><th className="num">Planeadas</th><th className="num">Backlog</th><th className="num">Canceladas</th><th className="num">Vencidas</th><th>Cumplimiento</th></tr></thead>
        <tbody>{lista.map(r => (
          <tr key={r.k}><td>{r.k}</td><td className="num">{r.total}</td><td className="num t-ok">{r.comp}</td><td className="num">{r.aTiempo}</td><td className={`num ${r.retraso ? 't-dan' : ''}`}>{r.retraso}</td>
            <td className="num">{r.prog}</td><td className="num">{r.plan}</td><td className="num">{r.porIni}</td><td className="num">{r.canc}</td><td className={`num ${r.venc ? 't-dan' : ''}`}>{r.venc}</td><td><Pct p={r.pct} /></td></tr>))}</tbody>
      </table></div>
    </>
  );
}

/** Contenido del reporte: el mismo se muestra en la ventana, se imprime y se descarga como .html */
export function ReporteContenido({ doc, x, usuario, archivo, ahora = new Date() }: { doc: Documento; x: AnalisisReporte; usuario: string; archivo: string; ahora?: Date }) {
  const meta = doc.meta, t = x.tiempo, h = x.h, avance = datosAvance(doc, 'act', h);
  const tile = (n: number | string, l: string, cls = '') => <div className={`tile ${cls}`}><div className="n">{n}</div><div className="l">{l}</div></div>;
  const chipEst = (a: ActR) => <span className={`es-${colorEstado(a.est)}`}>{a.est}</span>;
  const rec = doc.notas.filter(n => x.acts.some(a => a.id === n.act) && n.fecha >= addDias(h, -14)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const Ta = ({ a }: { a: ActR }) => <TamBadge t={a.tamano} />;
  return (
    <>
      <h1>{meta.proyecto || 'Reporte de actividades'}</h1>
      <div className="sub">{meta.proyecto ? 'Reporte de actividades · ' : ''}Generado el {ahora.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}{usuario ? ' por ' + usuario : ''}{archivo ? ' · ' + archivo : ''} · {NOMBRE_APP} v{VERSION_TXT}</div>

      <h2>Resumen general</h2>
      {t ? <>
        <p style={{ margin: '0 0 4px' }}><b>Meta:</b> {fmtTxt(meta.inicio)} → {fmtTxt(meta.fin)} ({pl(t.totalD, 'día', 'días')}).{' '}
          {!t.iniciada ? `Inicia en ${pl(dias(h, meta.inicio), 'día', 'días')}.` : t.terminada ? `Terminó hace ${pl(dias(meta.fin, h), 'día', 'días')}.` : `Van ${pl(t.trans, 'día', 'días')}, quedan ${pl(Math.max(dias(h, meta.fin), 0), 'día', 'días')}.`}
          {x.ritmo && <> <span className={`chip ${x.ritmo.cls}`}>{x.ritmo.txt}</span></>}</p>
        {x.ritmo && <div className="sub">{x.ritmo.det}</div>}
      </> : <p className="vacio">El archivo no tiene meta definida.</p>}
      <div className="tiles">
        {tile(x.total, 'Actividades')}{tile(x.terminadas, `Terminadas · ${x.pctAv}%`, 'verde')}{tile(x.cuenta['En progreso'], 'En progreso', 'amar')}{tile(x.cuenta.Planeado, 'Planeadas', 'azul')}
        {tile(x.cuenta.Backlog, 'Backlog · no cuentan en métricas', 'gris')}{tile(x.canc.length, 'Canceladas', 'rojo')}{tile(x.venc.length, 'Vencidas', x.venc.length ? 'rojo' : '')}
        {tile(x.conRetrasoL.length, 'Terminadas con retraso', x.conRetrasoL.length ? 'rojo' : '')}
      </div>
      {x.total > 0 && <>
        <div className="bar" style={{ height: 14 }}>{ESTADOS.map(e => (x.cuenta[e] ? <div key={e} className={`f-${colorEstado(e)}`} style={{ width: `${x.cuenta[e] * 100 / x.total}%` }} /> : null))}</div>
        <div className="leyenda">{ESTADOS.map(e => <span key={e}><i className={`f-${colorEstado(e)}`} />{e}: {x.cuenta[e]}</span>)}</div>
      </>}
      {t && <div className="dos">
        <div><div className="fila-p"><span>Tiempo transcurrido de la meta</span><span>{t.pct}%</span></div><div className="bar"><div className="f-azul" style={{ width: `${t.pct}%` }} /></div></div>
        <div><div className="fila-p"><span>Actividades terminadas (sin backlog ni canceladas)</span><span>{x.pctAv}%</span></div><div className="bar"><div className="f-verde" style={{ width: `${x.pctAv}%` }} /></div></div></div>}

      {avance && avance.total > 0 && <>
        <h2>Avance acumulado contra la meta</h2><p style={{ margin: '0 0 8px' }}><ResumenAvance d={avance} /></p><LeyendaAvance d={avance} />
        <div className="av-graf"><GraficaAvance d={avance} /></div><h3>Por semana</h3><div className="scroll"><TablaAvance d={avance} /></div></>}

      <h2>Alertas</h2>
      {x.alertas.length ? <ul>{x.alertas.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p className="vacio">Sin alertas.</p>}

      {x.total > 0 && <>
        <TablaResumen titulo="Avance por responsable" lista={x.porResp} col="Responsable" />
        <TablaResumen titulo="Avance por negocio" lista={x.porNeg} col="Negocio" />
        <h2>Tamaño y esfuerzo</h2>
        <p className="sub" style={{ margin: '0 0 8px' }}>Horas máximas estimadas según el tamaño (XS 1 h, S 4 h, M 8 h, L 16 h, XL 40 h). No incluye las de Backlog ni las canceladas. Total: <b>{x.horasTotal} h</b> · terminadas: <b>{x.horasHechas} h</b> · por hacer: <b>{x.horasTotal - x.horasHechas} h</b>.</p>
        <div className="scroll"><table><thead><tr><th>Tamaño</th><th>Significa</th><th className="num">Actividades</th><th className="num">Terminadas</th><th className="num">Horas máx.</th></tr></thead><tbody>
          {x.porTam.filter(r => r.total).map(r => (
            <tr key={r.t}><td>{r.t ? <TamBadge t={r.t as keyof typeof TAMANOS} /> : <span className="t-mut">Sin tamaño</span>}</td><td>{r.t ? TAMANOS[r.t as keyof typeof TAMANOS].txt : 'No se estimó'}</td>
              <td className="num">{r.total}</td><td className="num">{r.comp}</td><td className="num">{r.t ? `${r.horas} h` : '—'}</td></tr>))}</tbody></table></div>
        <h3>Esfuerzo por responsable</h3>
        <div className="scroll"><table><thead><tr><th>Responsable</th>{ORDEN_TAMANOS.map(tz => <th key={tz} className="num">{tz}</th>)}<th className="num">Sin tamaño</th><th className="num">Horas máx.</th><th className="num">Terminadas</th><th className="num">Por hacer</th></tr></thead><tbody>
          {x.porResp.map(r => (
            <tr key={r.k}><td>{r.k}</td>{ORDEN_TAMANOS.map(tz => <td key={tz} className={`num ${tz === 'XL' && r.tams[tz] ? 't-dan' : ''}`}>{r.tams[tz] || ''}</td>)}
              <td className="num t-mut">{r.tams[''] || ''}</td><td className="num">{r.horas} h</td><td className="num t-ok">{r.horasHechas} h</td><td className="num">{r.horasFalta} h</td></tr>))}</tbody></table></div>
      </>}

      <h2>Actividades terminadas ({x.comp.length})</h2>
      {x.comp.length ? <div className="scroll"><table><thead><tr><th>Negocio</th><th>Actividad</th><th>Tamaño</th><th>Responsable</th><th>Fin planeado</th><th>Terminada</th><th>Resultado</th><th>Marcada por</th></tr></thead><tbody>
        {x.comp.map(a => { const r = resultado(a); return <tr key={a.id}><td>{negocioDe(a)}</td><td className="txt">{a.actividad}</td><td><Ta a={a} /></td><td>{a.responsable || '—'}</td><td>{fmtTxt(a.fin) || '—'}</td><td>{fmtTxt(a.terminada) || '—'}</td><td className={r.cls}>{r.txt}</td><td>{quienTermino(doc, a.id) || '—'}</td></tr>; })}</tbody></table></div>
        : <p className="vacio">Todavía no hay actividades terminadas.</p>}

      <h2>Actividades sin terminar ({x.noTerm.length})</h2>
      {x.noTerm.length ? <div className="scroll"><table><thead><tr><th>Negocio</th><th>Actividad</th><th>Tamaño</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Situación</th></tr></thead><tbody>
        {x.noTerm.map(a => { const s = situacion(a, h); return <tr key={a.id}><td>{negocioDe(a)}</td><td className="txt">{a.actividad}</td><td><Ta a={a} /></td><td>{a.responsable || '—'}</td><td>{fmtTxt(a.inicio) || '—'}</td><td>{fmtTxt(a.fin) || '—'}</td><td>{chipEst(a)}</td><td className={s.cls}>{s.txt}</td></tr>; })}</tbody></table></div>
        : <p className="vacio">No hay actividades pendientes.</p>}

      {x.canc.length > 0 && <>
        <h2>Actividades canceladas ({x.canc.length})</h2>
        <div className="scroll"><table><thead><tr><th>Negocio</th><th>Actividad</th><th>Tamaño</th><th>Responsable</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>
          {x.canc.map(a => <tr key={a.id}><td>{negocioDe(a)}</td><td className="txt">{a.actividad}</td><td><Ta a={a} /></td><td>{a.responsable || '—'}</td><td>{fmtTxt(a.inicio) || '—'}</td><td>{fmtTxt(a.fin) || '—'}</td></tr>)}</tbody></table></div></>}

      <h2>Quién hizo qué</h2>
      {x.porResp.length ? x.porResp.map(r => {
        const hechas = r.l.filter(a => a.est === 'Terminado'), faltan = r.l.filter(a => a.est !== 'Terminado' && a.est !== 'Cancelado'), canc = r.l.filter(a => a.est === 'Cancelado');
        const li = (a: ActR, extra: React.ReactNode) => <li key={a.id}>{a.tamano && <><TamBadge t={a.tamano} /> </>}{a.actividad.split('\n')[0]} <span className="sub">— {negocioDe(a)}{extra}</span></li>;
        return (
          <div key={r.k} className="persona">
            <h3>{r.k} <span className="sub" style={{ fontWeight: 400 }}>· {r.comp} de {r.med} terminadas ({r.pct}%) · {r.horasHechas} h de {r.horas} h estimadas{r.venc > 0 && <> · <span className="t-dan">{r.venc} vencida{r.venc === 1 ? '' : 's'}</span></>}</span></h3>
            <div className="etq">Terminó</div>
            {hechas.length ? <ul>{hechas.map(a => { const res = resultado(a); return li(a, <>{a.terminada ? ' · ' + fmtTxt(a.terminada) : ''} <span className={res.cls}>{res.txt}</span></>); })}</ul> : <p className="vacio" style={{ margin: '4px 0' }}>Nada terminado todavía.</p>}
            {faltan.length > 0 && <><div className="etq">Tiene pendiente</div><ul>{faltan.map(a => { const s = situacion(a, h); return li(a, <> · {chipEst(a)} <span className={s.cls}>{s.txt}</span></>); })}</ul></>}
            {canc.length > 0 && <><div className="etq">Canceladas</div><ul>{canc.map(a => li(a, null))}</ul></>}
          </div>
        );
      }) : <p className="vacio">No hay actividades.</p>}

      {x.equipo.length > 0 && <>
        <h2>Actividad del equipo (últimos 7 días)</h2>
        <p className="sub" style={{ margin: '0 0 8px' }}>Según la bitácora: quién creó, cambió, terminó o eliminó actividades.</p>
        <div className="scroll"><table><thead><tr><th>Persona</th><th className="num">Movimientos</th><th className="num">Creó</th><th className="num">Cambió</th><th className="num">Terminó</th><th className="num">Eliminó</th><th>Último movimiento</th></tr></thead><tbody>
          {x.equipo.map(r => <tr key={r.autor}><td>{r.autor}</td><td className="num">{r.total}</td><td className="num">{r.creo}</td><td className="num">{r.cambio}</td><td className="num t-ok">{r.termino}</td><td className="num">{r.elimino}</td><td>{fmtHora(r.ultimo)}</td></tr>)}</tbody></table></div></>}
      {rec.length > 0 && <>
        <h2>Notas de los últimos 14 días ({rec.length})</h2>
        <div className="scroll"><table><thead><tr><th>Fecha</th><th>Autor</th><th>Actividad</th><th>Nota</th></tr></thead><tbody>
          {rec.map(n => { const a = x.acts.find(y => y.id === n.act)!; return <tr key={n.act + n.fecha + n.autor}><td style={{ whiteSpace: 'nowrap' }}>{fmtHora(n.fecha)}</td><td>{n.autor}</td><td>{a.actividad.split('\n')[0]}<div className="sub">{negocioDe(a)}</div></td><td className="txt">{n.texto}</td></tr>; })}</tbody></table></div></>}
    </>
  );
}
