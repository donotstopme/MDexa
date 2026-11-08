import { useState } from 'react';
import { EST, TAMANOS, calcularCarga, lunesDe, negocioDe, nivelCarga, nomCorto, type Actividad, type CeldaCarga, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { ChipEstado, fmtCorta } from '../original/piezas';

const r1 = (n: number) => Math.round(n * 10) / 10;
const SEMANAS = [4, 6, 8, 12];
const leerNum = (k: string, def: number) => { try { return parseFloat(localStorage.getItem(k) || '') || def; } catch { return def; } };
const guardar = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* sin almacenamiento local */ } };

export function Carga({ doc, lista, hoy, onIr, msgVacio }: { doc: Documento; lista: Actividad[]; hoy: string; onIr(id: number): void; msgVacio: string }) {
  const [cap, setCap] = useState(() => Math.max(1, leerNum('gestor.capacidad', 40)));
  const [nSem, setNSem] = useState(() => (SEMANAS.includes(leerNum('gestor.cargaSem', 6)) ? leerNum('gestor.cargaSem', 6) : 6));
  const [sel, setSel] = useState<string | null>(null);
  if (!doc.actividades.length) return <div className="carga"><div className="vacio">{msgVacio}</div></div>;
  const { semanas, filas } = calcularCarga(lista, hoy, nSem), l0 = lunesDe(hoy);
  const celda = (c: CeldaCarga, clave: string, clase: string) => (
    <td key={clave} className={`cg ${clase} ${sel === clave ? 'sel' : ''}`} onClick={() => setSel(sel === clave ? null : clave)}
      title={c.acts.length ? `${c.acts.length} ${c.acts.length === 1 ? 'actividad' : 'actividades'} · ${r1(c.h)} h` : 'Sin actividades'}>
      {c.acts.length ? <><b>{r1(c.h)} h</b><span>{c.acts.length} act.</span></> : <span className="nd">—</span>}
    </td>
  );
  let det: { quien: string; titulo: string; acts: Actividad[] } | null = null;
  if (sel) {
    const i = sel.lastIndexOf('|'), p = sel.slice(0, i), k = sel.slice(i + 1), f = filas.find(x => x.p === p);
    const c = f && (k === 'atr' ? f.atr : k === 'des' ? f.despues : k === 'sinf' ? f.sinf : f.celdas[+k]);
    if (c?.acts.length) det = { quien: p || 'Sin responsable', acts: c.acts, titulo: k === 'atr' ? 'atrasadas' : k === 'des' ? 'después' : k === 'sinf' ? 'sin fecha' : `semana del ${fmtCorta(semanas[+k])}` };
  }
  return (
    <div className="carga">
      <div className="cg-barra">
        <label>Capacidad por persona <input type="number" min={1} max={80} step={1} value={cap} onChange={e => { const v = Math.max(1, +e.target.value || 40); setCap(v); guardar('gestor.capacidad', v); }} /> h/semana</label>
        <label>Semanas <select value={nSem} onChange={e => { setNSem(+e.target.value); guardar('gestor.cargaSem', +e.target.value); }}>{SEMANAS.map(n => <option key={n}>{n}</option>)}</select></label>
        <span className="cg-ley"><i className="c1" />hasta 50%<i className="c2" />hasta 85%<i className="c3" />lleno<i className="c4" />saturado (más de {cap} h)</span>
      </div>
      {!filas.length
        ? <div className="vacio"><Ico n="check" t={24} /><p>No hay actividades abiertas{lista.length < doc.actividades.length ? ' con los filtros actuales' : ''}.</p></div>
        : <div className="cg-tabla-w"><table className="cg-tabla">
          <thead><tr><th>Responsable</th><th className="cg-atr" title="Debían terminar antes de esta semana">Atrasadas</th>
            {semanas.map(l => <th key={l} className={l === l0 ? 'hoy' : ''}>Sem. {fmtCorta(l)}{l === l0 ? ' · esta' : ''}</th>)}
            <th title="Después de la última semana mostrada">Después</th><th title="Sin fecha de inicio ni fin">Sin fecha</th></tr></thead>
          <tbody>{filas.map(f => {
            const sat = f.celdas.filter(c => c.h > cap).length;
            return (
              <tr key={f.p}>
                <th className="cg-nom"><Ico n="usuario" t={14} /> {f.p || 'Sin responsable'}
                  {sat > 0 && <span className="cg-sat" title={`Semanas con más de ${cap} h`}> Saturado {sat} {sat === 1 ? 'semana' : 'semanas'}</span>}
                  {f.sinTam > 0 && <span className="nd cg-sintam" title="Sin tamaño no suman horas"> · {f.sinTam} sin tamaño</span>}</th>
                {celda(f.atr, `${f.p}|atr`, f.atr.acts.length ? 'atr' : 'c0')}
                {f.celdas.map((c, i) => celda(c, `${f.p}|${i}`, nivelCarga(c.h, cap)))}
                {celda(f.despues, `${f.p}|des`, 'neutro')}{celda(f.sinf, `${f.p}|sinf`, 'neutro')}
              </tr>
            );
          })}</tbody></table></div>}
      <p className="nd cg-nota">Horas estimadas según el tamaño (XS 1 h, S 4 h, M 8 h, L 16 h, XL 40 h), repartidas en los días hábiles entre inicio y fin; lo que ya pasó no cuenta. Solo actividades abiertas (sin terminadas ni canceladas) y con los filtros actuales. Clic en una celda para ver sus actividades.</p>
      {det && (
        <div className="cg-det"><h3><Ico n="usuario" t={15} /> {det.quien} · {det.titulo} <span className="m-n">{det.acts.length}</span></h3>
          <ul>{det.acts.map(a => (
            <li key={a.id} onClick={() => onIr(a.id)}><ChipEstado e={EST(a)} /> <b>{nomCorto(a)}</b>{' '}
              <span className="nd">{negocioDe(a)} · {a.tamano ? `${a.tamano} (${TAMANOS[a.tamano].h} h)` : 'sin tamaño'} · {fmtCorta(a.inicio) || '—'} → {fmtCorta(a.fin) || '—'}</span></li>))}</ul></div>
      )}
    </div>
  );
}
