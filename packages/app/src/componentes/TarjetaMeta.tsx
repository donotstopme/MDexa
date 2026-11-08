import type { AnalisisMeta, DatosAvance, Documento, UnidadAvance } from '@gestor/core';
import { BloqueAvance } from './GraficaAvance';
import { Ico } from '../original/iconos';
import { fmtTxt } from '../original/piezas';

export function TarjetaMeta({ doc, a, editando, onEditar, verAvance, onVerAvance, unidad, onUnidad, avance }: {
  doc: Documento; a: AnalisisMeta; editando: boolean; onEditar(): void; verAvance: boolean; onVerAvance(v: boolean): void; unidad: UnidadAvance; onUnidad(u: UnidadAvance): void; avance: DatosAvance | null;
}) {
  const m = doc.meta, t = a.tiempo;
  const btn = editando && <button onClick={onEditar}><Ico n="calendario" /> {m.inicio ? 'Editar meta' : 'Definir meta'}</button>;
  if (!t) return (
    <div className="card" id="metaCard"><div className="meta-top"><div><div className="etq"><Ico n="bandera" t={13} /> Meta del proyecto</div><div className="rango nd">Sin meta definida</div></div><div className="barra">{btn}</div></div></div>
  );
  return (
    <div className="card" id="metaCard">
      <div className="meta-top">
        <div><div className="etq"><Ico n="bandera" t={13} /> Meta del proyecto</div>
          <div className="rango">{fmtTxt(m.inicio)} → {fmtTxt(m.fin)} <span className="nd" style={{ fontWeight: 400, fontSize: 14 }}>· {t.totalD} {t.totalD === 1 ? 'día' : 'días'}</span></div></div>
        <div className="barra">{btn}</div>
      </div>
      <div className="progresos">
        <div><div className="fila-p"><span>Tiempo transcurrido</span><span>{!t.iniciada ? 'aún no inicia' : t.terminada ? 'terminó' : `día ${t.trans} de ${t.totalD}`} · {t.pct}%</span></div>
          <div className="bar"><div className="f-azul" style={{ width: `${t.pct}%` }} /></div></div>
        <div><div className="fila-p"><span title="No cuentan las actividades en Backlog ni las canceladas">Actividades terminadas</span>
          <span>{a.terminadas} de {a.medibles}{a.sinContar ? ` (sin contar ${a.sinContar} en backlog o canceladas)` : ''} · {a.pctAv}%</span></div>
          <div className="bar"><div className="f-verde" style={{ width: `${a.pctAv}%` }} /></div></div>
      </div>
      <div className="meta-pie">{a.ritmo ? <div className={`ritmo ${a.ritmo.cls}`} title={a.ritmo.det}>{a.ritmo.txt}</div> : <span />}
        <button className="av-toggle" aria-expanded={verAvance} onClick={() => onVerAvance(!verAvance)}><Ico n="grafica" t={14} /> {verAvance ? 'Ocultar gráfica de avance' : 'Ver gráfica de avance'}</button></div>
      {verAvance && <BloqueAvance d={avance} unidad={unidad} onUnidad={onUnidad} />}
    </div>
  );
}
