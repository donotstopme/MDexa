import { claseHito, conSigno, recorridoHito, textoRecorrido, proximosHitos, type AnalisisMeta, type DatosAvance, type Documento, type UnidadAvance } from '@mdexa/core';
import { COLOR_HITO } from './DialogoHitos';
import { BloqueAvance } from './GraficaAvance';
import { Ico } from '../original/iconos';
import { fmtTxt } from '../original/piezas';

export function TarjetaMeta({ doc, a, editando, onEditar, verAvance, onVerAvance, unidad, onUnidad, avance, hoy, onHito, onHitos, onNuevoHito }: {
  doc: Documento; a: AnalisisMeta; editando: boolean; onEditar(): void; verAvance: boolean; onVerAvance(v: boolean): void; unidad: UnidadAvance; onUnidad(u: UnidadAvance): void; avance: DatosAvance | null;
  hoy?: string; onHito?(id: number): void; onHitos?(): void; onNuevoHito?(): void;
}) {
  const m = doc.meta, t = a.tiempo;
  const btn = editando && <button onClick={onEditar}><Ico n="calendario" /> {m.inicio ? 'Editar meta' : 'Definir meta'}</button>;
  const prox = proximosHitos(doc, hoy), MAX = 4;
  // Con el archivo tomado la sección aparece aunque no haya hitos: desde aquí se crea el primero
  const hitos = (!!doc.hitos.length || editando) && (
    <div className="m-hitos">
      <div className="m-hitos-cab"><span className="etq"><Ico n="bandera" t={13} /> Próximos hitos</span>
        <div className="barra">
          {!!doc.hitos.length && <button type="button" onClick={onHitos}>Ver todos ({doc.hitos.length})</button>}
          {editando && <button type="button" title="Crear un hito y elegir sus actividades" onClick={onNuevoHito}><Ico n="bandera" /> Nuevo hito</button>}</div></div>
      {!prox.length && <div className="nd">{doc.hitos.length ? 'Todos los hitos están cumplidos.' : 'Todavía no hay hitos.'}</div>}
      {prox.slice(0, MAX).map(({ h, info }) => (
        <button type="button" key={h.id} className="m-hito" data-hito={h.id} onClick={() => onHito?.(h.id)} title={`${h.negocios.join(', ')}${h.descripcion ? '\n' + h.descripcion : ''}${info.espera.length ? '\nEspera a: ' + info.espera.map(x => x.nombre).join(', ') : ''}`}>
          <span className="m-hito-nom"><i className={`hito-punto ${claseHito(h, info.estado)}`} />{h.nombre}</span><span className="nd">{fmtTxt(h.fecha)}{recorridoHito(h) && <span className="hito-recorrido" title={textoRecorrido(h)}> ↻{recorridoHito(h)!.veces} · {conSigno(recorridoHito(h)!.dias)}</span>}</span>
          <span className="bar"><span className="f-verde" style={{ width: `${info.pct}%` }} /></span><span className="nd">{info.hechas}/{info.total}</span>
          <b className={COLOR_HITO[info.estado]} title={info.detalle}>{info.estado}</b></button>))}
      {prox.length > MAX && <div className="nd">y {prox.length - MAX} más</div>}
    </div>
  );
  if (!t) return (
    <div className="card" id="metaCard"><div className="meta-top"><div><div className="etq"><Ico n="bandera" t={13} /> Meta del proyecto</div><div className="rango nd">Sin meta definida</div></div><div className="barra">{btn}</div></div>{hitos}</div>
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
      {hitos}
      {verAvance && <BloqueAvance d={avance} unidad={unidad} onUnidad={onUnidad} />}
    </div>
  );
}
