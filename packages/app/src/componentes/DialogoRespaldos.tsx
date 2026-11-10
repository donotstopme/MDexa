import { useEffect, useState } from 'react';
import { CAMPOS_NOV, EST, negocioDe, nomCorto, type Respaldo } from '@mdexa/core';
import { Ico } from '../original/iconos';
import type { Sesion } from '../estado/sesion';
import { colorEstado, fmtHora, fmtTxt, haceLargo } from '../original/piezas';
import { Dialogo } from './Dialogo';

/** Respaldos de este archivo (guardados en este equipo): ver diferencias, descargar y restaurar */
export function DialogoRespaldos({ sesion, nombre, onCerrar }: { sesion: Sesion; nombre: string; onCerrar(): void }) {
  const [lista, setLista] = useState<Respaldo[] | null>(null);
  const [abierto, setAbierto] = useState(-1);
  useEffect(() => { void sesion.leerRespaldos().then(setLista); }, [sesion, nombre]);
  const descargar = (r: Respaldo) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([r.texto], { type: 'text/markdown' }));
    a.download = `${nombre.replace(/\.md$/i, '')}-respaldo-${r.fecha.slice(0, 16).replace(/[:T]/g, '-')}.md`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const l = lista ?? [];
  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra">
        <strong><Ico n="capas" t={18} /> Respaldos de {nombre} <span className="nd" style={{ fontWeight: 400 }}>· {l.length} {l.length === 1 ? 'copia' : 'copias'}</span></strong>
        <div className="barra"><button className="prim" onClick={onCerrar}>Cerrar</button></div>
      </div>
      <div className="contenido">
        <p className="sub" style={{ margin: '0 0 14px', color: 'var(--muted)' }}>Este navegador guarda una copia del archivo al abrirlo, cuando llegan cambios de otras personas, antes de editar, al soltarlo y cada 10 minutos mientras editas (solo si cambió algo). Se conservan las últimas 40. Solo existen en este equipo.</p>
        {lista && !l.length && <div className="vacio" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}><Ico n="capas" t={28} /><p>Todavía no hay respaldos de este archivo en este navegador.</p></div>}
        {l.map((r, i) => {
          const c = sesion.compararRespaldo(r), abre = i === abierto;
          const dif = !c || c.igual ? <span className="t-ok">Igual a la versión actual</span> : <>{[
            c.recupera.length ? <span key="r" className="t-ok">+{c.recupera.length} recuperaría</span> : null,
            c.pierde.length ? <span key="p" className="t-dan">−{c.pierde.length} se quitaría</span> : null,
            c.cambian.length ? <span key="c" className="t-warn">{c.cambian.length} {c.cambian.length === 1 ? 'cambiaría' : 'cambiarían'}</span> : null,
            c.metaDif ? <span key="m" className="t-warn">meta distinta</span> : null,
          ].filter(Boolean).reduce<React.ReactNode[]>((acc, x, k) => (k ? [...acc, ' · ', x] : [x]), [])}</>;
          return (
            <div key={r.fecha} className={`resp-it ${abre ? 'abierto' : ''}`}>
              <div className="resp-fila">
                <div className="resp-info"><b>{fmtHora(r.fecha)}</b> <span className="nd">· {haceLargo(r.fecha)}</span>
                  <div className="nd" style={{ fontSize: 12.5 }}>{r.motivo}{r.usuario ? ' · ' + r.usuario : ''} · {r.n} {r.n === 1 ? 'actividad' : 'actividades'} · {Math.max(1, Math.round(r.texto.length / 1024))} KB</div>
                  <div className="resp-dif">{dif}</div></div>
                <div className="barra">
                  <button onClick={() => setAbierto(abre ? -1 : i)}><Ico n={abre ? 'ant' : 'buscar'} t={14} /> {abre ? 'Ocultar' : 'Ver diferencias'}</button>
                  <button title="Descargar esta copia como .md" onClick={() => descargar(r)}><Ico n="descargar" t={14} /> Descargar</button>
                  <button className="prim" disabled={!c || c.igual} onClick={async () => { if (await sesion.restaurar(r)) onCerrar(); }}><Ico n="reloj" t={14} /> Restaurar</button>
                </div>
              </div>
              {abre && c && (
                <div className="resp-det">
                  {c.igual && <p className="nd">No hay diferencias con la versión actual.</p>}
                  {c.recupera.length > 0 && <div className="resp-g"><b>Se recuperarían (existen en el respaldo, ya no ahora)</b><ul>{c.recupera.slice(0, 30).map(a => <li key={a.id}>{nomCorto(a)} <span className="nd">{negocioDe(a)} · {EST(a)}</span></li>)}</ul></div>}
                  {c.pierde.length > 0 && <div className="resp-g"><b>Se quitarían (existen ahora, no en el respaldo)</b><ul>{c.pierde.slice(0, 30).map(a => <li key={a.id}>{nomCorto(a)} <span className="nd">{negocioDe(a)} · {EST(a)}</span></li>)}</ul></div>}
                  {c.cambian.length > 0 && <div className="resp-g"><b>Regresarían a como estaban</b><ul>{c.cambian.slice(0, 30).map(x => <li key={x.a.id}>{nomCorto(x.a)} <span className="nd">{x.campos.map(k => `${CAMPOS_NOV[k.k]}: ${k.ahora ? (k.k === 'inicio' || k.k === 'fin' ? fmtTxt(k.ahora) : k.ahora) : '—'} → ${k.antes ? (k.k === 'inicio' || k.k === 'fin' ? fmtTxt(k.antes) : k.antes) : '—'}`).join(' · ')}</span></li>)}</ul></div>}
                  {c.metaDif && <div className="resp-g"><b>Meta</b><ul><li>{c.respaldo.meta.proyecto || '—'} · {fmtTxt(c.respaldo.meta.inicio) || '—'} → {fmtTxt(c.respaldo.meta.fin) || '—'}</li></ul></div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Dialogo>
  );
}
export { colorEstado };
