import { useRef, useState } from 'react';
import { addDias, dias, etqUnidad, filasAvance, geometriaAvance, resumenAvance, type DatosAvance, type UnidadAvance } from '@mdexa/core';
import { fmtCorta, fmtTxt } from '../original/piezas';

const R = 'var(--av-real,#079455)', I = 'var(--av-ideal,#2f6fed)';
const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Gráfica de avance acumulado contra la meta; con `interactiva` muestra los valores del día bajo el ratón */
export function GraficaAvance({ d, interactiva = false, compacta = false }: { d: DatosAvance; interactiva?: boolean; compacta?: boolean }) {
  const g = geometriaAvance(d, compacta), u = d.unidad;
  const [pt, setPt] = useState<{ i: number; px: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null), svg = useRef<SVGSVGElement>(null);
  const mover = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect(), vx = (e.clientX - r.left) * (g.W / r.width);
    const i = Math.max(0, Math.min(d.nDias - 1, Math.round((vx - g.m.l) / g.pw * (d.nDias - 1))));
    setPt({ i, px: (g.m.l + i / Math.max(1, d.nDias - 1) * g.pw) / g.W * r.width });
  };
  const f = pt ? addDias(d.ini, pt.i) : '', real = pt ? d.real.find(p => p.f === f) : undefined, iv = pt ? d.ideal(f) : 0;
  const X = pt ? g.m.l + pt.i / Math.max(1, d.nDias - 1) * g.pw : 0;
  return (
    <div className="av-graf" ref={caja} style={{ position: 'relative' }}>
      <svg ref={svg} className="av-svg" viewBox={`0 0 ${g.W} ${g.H}`} role="img" aria-label="Avance acumulado contra la meta">
        {g.yTicks.map(t => <g key={t.v}><line x1={g.m.l} x2={g.m.l + g.pw} y1={t.y} y2={t.y} stroke="var(--line,#e3e6eb)" strokeWidth="1" /><text x={g.m.l - 8} y={t.y + 4} textAnchor="end" className="av-eje">{etqUnidad(t.v, u)}</text></g>)}
        {g.xTicks.map(t => <text key={t.f} x={t.x} y={g.H - 8} textAnchor="middle" className="av-eje">{fmtCorta(t.f)}</text>)}
        <rect x={g.xIni} y={g.m.t} width={g.xMeta - g.xIni} height={g.ph} fill={I} opacity=".04" />
        <line x1={g.xMeta} x2={g.xMeta} y1={g.m.t} y2={g.m.t + g.ph} stroke={I} strokeWidth="1" opacity=".5" />
        <text x={g.xMeta} y={g.m.t - 8} textAnchor={compacta ? 'end' : 'middle'} className="av-eje">{compacta ? 'Fin meta' : 'Fin meta ' + fmtCorta(d.finM)}</text>
        <line x1={g.m.l} x2={g.m.l + g.pw} y1={g.yTotal} y2={g.yTotal} stroke="var(--muted,#667085)" strokeWidth="1" opacity=".55" />
        <text x={g.m.l + g.pw + 6} y={g.yTotal + 4} className="av-eje">{compacta ? '' : 'Alcance '}{etqUnidad(d.total, u)}</text>
        {g.xHoy !== null && <><line x1={g.xHoy} x2={g.xHoy} y1={g.m.t} y2={g.m.t + g.ph} stroke="var(--c-rojo,#d92d20)" strokeWidth="1" opacity=".6" /><text x={g.xHoy} y={g.m.t - 6} dy="-2" textAnchor="middle" className="av-hoy">Hoy</text></>}
        <path d={g.idealPath} fill="none" stroke={I} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {g.realPath && <>
          <path d={g.realArea} fill={R} opacity=".1" /><path d={g.realPath} fill="none" stroke={R} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {g.proy && <path d={g.proy} fill="none" stroke={R} strokeWidth="2" strokeDasharray="5 5" opacity=".6" />}
          {g.ultimo && <><circle cx={g.ultimo.x} cy={g.ultimo.y} r="5" fill={R} stroke="var(--card,#fff)" strokeWidth="2" /><text x={g.ultimo.x + 10} y={g.ultimo.y - 9} className="av-val">{etqUnidad(g.ultimo.v, u)}</text></>}
        </>}
        {interactiva && <>
          {pt && <><line x1={X} x2={X} y1={g.m.t} y2={g.m.t + g.ph} stroke="var(--muted,#667085)" strokeWidth="1" />
            <circle cx={X} cy={g.y(iv)} r="4" fill={I} stroke="var(--card,#fff)" strokeWidth="2" />
            {real && <circle cx={X} cy={g.y(real.v)} r="4" fill={R} stroke="var(--card,#fff)" strokeWidth="2" />}</>}
          <rect x={g.m.l} y={g.m.t} width={g.pw} height={g.ph} fill="transparent" onPointerMove={mover} onPointerLeave={() => setPt(null)} />
        </>}
      </svg>
      {interactiva && pt && (
        <div className="av-tip" style={{ left: Math.min(Math.max(8, pt.px + 14), (caja.current?.clientWidth ?? 600) - 190) }}>
          <b>{fmtTxt(f)}</b>{f === d.hoy ? ' · hoy' : ''}{f === d.finM ? ' · fin de la meta' : ''}
          {real ? <div><i className="av-k real" />Terminadas <b>{etqUnidad(real.v, u)}</b></div> : <div className="nd">Aún no llega esta fecha</div>}
          <div><i className="av-k ideal" />Ideal <b>{etqUnidad(iv, u)}</b></div>
          {real && <div className={real.v - iv >= -0.5 ? 't-ok' : 't-dan'}>{real.v - iv >= 0 ? '+' : ''}{etqUnidad(real.v - iv, u)} contra lo ideal</div>}
        </div>
      )}
    </div>
  );
}

export function LeyendaAvance({ d }: { d: DatosAvance }) {
  return <div className="av-ley"><span><i className="av-k real" />Terminadas</span><span><i className="av-k ideal" />Ideal hacia la meta</span>{d.estimada && d.estimada !== 'completo' && <span><i className="av-k proy" />Proyección al ritmo actual</span>}<span><i className="av-k hoy" />Hoy</span></div>;
}

export function ResumenAvance({ d }: { d: DatosAvance }) {
  const r = resumenAvance(d);
  if (r.tipo === 'texto') return <>{r.txt.replace(/(\d{4}-\d{2}-\d{2})/, m => fmtTxt(m))}</>;
  return (
    <>Hoy: <b>{r.actual}</b> de {r.total} terminadas; lo ideal serían <b>{r.ideal}</b> · <span className={r.dif.cls === 't-ok-plano' ? 't-ok' : r.dif.cls}>{r.dif.txt}</span>
      {r.fin.tipo === 'completo' && <> · <span className="t-ok">¡Todo terminado!</span></>}
      {r.fin.tipo === 'fecha' && <> · Al ritmo actual se terminaría el <b>{fmtTxt(r.fin.f)}</b>{r.fin.vs > 0 ? <> <span className="t-dan">({pl(r.fin.vs, 'día', 'días')} después de la meta)</span></> : r.fin.vs < 0 ? <> <span className="t-ok">({pl(-r.fin.vs, 'día', 'días')} antes de la meta)</span></> : ' (justo en la meta)'}</>}
      {r.fin.tipo === 'sin-ritmo' && <> · Aún no hay {r.fin.unidades} terminadas para estimar el ritmo.</>}.</>
  );
}

export function TablaAvance({ d }: { d: DatosAvance }) {
  return (
    <table className="av-tabla"><thead><tr><th>Fecha</th><th className="num">Terminadas</th><th className="num">Ideal</th><th className="num">Diferencia</th></tr></thead><tbody>
      {filasAvance(d).map(r => (
        <tr key={r.f}><td>{fmtTxt(r.f)}{r.marca}</td><td className="num">{r.real == null ? '—' : etqUnidad(r.real, d.unidad)}</td><td className="num">{etqUnidad(r.ideal, d.unidad)}</td>
          <td className={`num ${r.dif == null ? '' : r.dif >= -0.5 ? 't-ok' : 't-dan'}`}>{r.dif == null ? '—' : (r.dif > 0 ? '+' : '') + etqUnidad(r.dif, d.unidad)}</td></tr>))}
    </tbody></table>
  );
}

/** Bloque de la tarjeta de meta: selector de unidad, resumen, gráfica y tabla */
export function BloqueAvance({ d, unidad, onUnidad }: { d: DatosAvance | null; unidad: UnidadAvance; onUnidad(u: UnidadAvance): void }) {
  if (!d) return <div className="av-bloque"><p className="nd">Define la meta (inicio y fin) para ver la gráfica de avance.</p></div>;
  return (
    <div className="av-bloque">
      <div className="av-cab"><b>Avance acumulado contra la meta</b>
        <div className="seg av-seg"><button className={unidad === 'act' ? 'on' : ''} onClick={() => onUnidad('act')}>Actividades</button>
          <button className={unidad === 'h' ? 'on' : ''} title="Horas máximas estimadas según el tamaño" onClick={() => onUnidad('h')}>Horas</button></div></div>
      <p className="av-res"><ResumenAvance d={d} /></p>
      {d.total > 0 && <><LeyendaAvance d={d} /><GraficaAvance d={d} interactiva compacta={typeof innerWidth === 'number' && innerWidth <= 700} />
        <details className="av-det"><summary>Ver como tabla</summary><TablaAvance d={d} /></details></>}
      <p className="nd av-nota">Solo cuentan las actividades Planeadas, En progreso y Terminadas. Cada una suma el día en que se marcó como terminada.</p>
    </div>
  );
}
export { dias };
