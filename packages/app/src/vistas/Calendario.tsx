import { useState } from 'react';
import {
  ESTADOS, EST, abrevNeg, cerrada, diasDelMes, mesMas, moverFin, negocioDe, nomCorto, vencida, descRepite, type Actividad, type Documento, type Novedades,
} from '@gestor/core';
import { Ico } from '../original/iconos';
import { PriBadge, colorEstado, fmtTxt } from '../original/piezas';
import type { Edicion } from './Lista';

const MAX_POR_DIA = 4;
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function Calendario({ doc, lista, hoy, edicion, novIds, favs, onEditar, onNotas, onNueva, aviso, msgVacio }: {
  doc: Documento; lista: Actividad[]; hoy: string; edicion?: Edicion; novIds?: Novedades['porId']; favs: Set<number>;
  onEditar(id: number): void; onNotas(id: number): void; onNueva(fin: string): void; aviso?(m: string): void; msgVacio: string;
}) {
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [arr, setArr] = useState<number | null>(null);
  const [sobre, setSobre] = useState('');
  const ed = !!edicion;
  if (!doc.actividades.length) return <div className="cal"><div className="vacio">{msgVacio}</div></div>;

  const { dias, primero, ultimo } = diasDelMes(mes);
  const porDia = new Map<string, Actividad[]>();
  lista.forEach(a => { if (a.fin) porDia.set(a.fin, [...(porDia.get(a.fin) ?? []), a]); });
  const orden = (a: Actividad, b: Actividad) => Number(vencida(b, hoy)) - Number(vencida(a, hoy)) || Number(favs.has(b.id)) - Number(favs.has(a.id)) || Number(cerrada(a)) - Number(cerrada(b)) || a.actividad.localeCompare(b.actividad, 'es');
  const delMes = lista.filter(a => a.fin && a.fin >= primero && a.fin <= ultimo);
  const nomMes = new Date(`${mes}-01T00:00`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const sinFecha = lista.filter(a => !a.fin && EST(a) !== 'Cancelado');
  const nav = (n: number | 'hoy') => { setMes(n === 'hoy' ? hoy.slice(0, 7) : mesMas(mes, n)); setAbiertos(new Set()); };

  const soltar = (dia: string) => {
    const a = doc.actividades.find(x => x.id === arr);
    setArr(null); setSobre('');
    if (!a || !edicion || (a.fin || '') === dia) return;
    edicion.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === a.id ? moverFin(x, dia) : x)) }));
    aviso?.(dia ? `${nomCorto(a)}: fecha fin ${fmtTxt(dia)}` : `${nomCorto(a)}: sin fecha fin`);
  };
  const zona = (dia: string, clave: string) => ({
    onDragOver: (e: React.DragEvent) => { if (arr !== null) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setSobre(clave); } },
    onDragLeave: (e: React.DragEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setSobre(s => (s === clave ? '' : s)); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); soltar(dia); },
  });

  const chip = (a: Actividad) => {
    const est = EST(a), c = colorEstado(est), venc = vencida(a, hoy), nov = novIds?.[a.id], nN = doc.notas.filter(x => x.act === a.id).length;
    const tip = `${a.actividad}\n${negocioDe(a)} · ${est}${venc ? ' · Vencida' : ''}\n${fmtTxt(a.inicio) || '—'} → ${fmtTxt(a.fin) || '—'}${a.responsable ? '\n' + a.responsable : ''}${a.tamano ? '\nTamaño ' + a.tamano : ''}${ed ? '\n\nArrastra a otro día para cambiar la fecha fin · clic para editar' : ''}`;
    return (
      <div key={a.id} data-id={a.id} className={`c-chip ${venc ? 'venc' : ''} ${est === 'Cancelado' ? 'canc' : ''} ${est === 'Terminado' ? 'term' : ''}`} draggable={ed} style={{ '--k': `var(--c-${c})` } as React.CSSProperties} title={tip}
        onDragStart={e => { e.dataTransfer.setData('text/plain', String(a.id)); e.dataTransfer.effectAllowed = 'move'; setArr(a.id); }} onDragEnd={() => { setArr(null); setSobre(''); }}
        onClick={e => { e.stopPropagation(); if (ed) onEditar(a.id); else onNotas(a.id); }}>
        {nov && <span className={`c-novdot ${nov.tipo}`} title={nov.tipo === 'nueva' ? 'Nueva desde tu última visita' : 'Cambió desde tu última visita'} />}
        {favs.has(a.id) && <span className="c-fav">★</span>}<span className="c-neg">{abrevNeg(negocioDe(a))}</span><PriBadge p={a.prioridad} corto />
        {a.repite && <span className="c-rep" title={descRepite(a)}><Ico n="repetir" t={10} /></span>}<span className="c-txt">{nomCorto(a)}</span>
        {a.tamano && <span className="c-tam">{a.tamano}</span>}{nN > 0 && <span className="c-notas" title={`${nN} ${nN === 1 ? 'nota' : 'notas'}`}><Ico n="nota" t={11} />{nN}</span>}
      </div>
    );
  };

  return (
    <div className={`cal ${ed ? 'editable' : ''} ${arr !== null ? 'soltando' : ''}`}>
      <div className="c-cab">
        <div className="c-nav">
          <button title="Mes anterior" aria-label="Mes anterior" onClick={() => nav(-1)}><Ico n="ant" /></button>
          <button title="Ir al mes actual" onClick={() => nav('hoy')}>Hoy</button>
          <button title="Mes siguiente" aria-label="Mes siguiente" onClick={() => nav(1)}><Ico n="sig" /></button>
        </div>
        <h3 className="c-titulo">{nomMes.charAt(0).toUpperCase() + nomMes.slice(1)}</h3>
        <div className="c-res"><span>{delMes.length} {delMes.length === 1 ? 'actividad vence' : 'actividades vencen'} este mes</span>
          {ESTADOS.map(e => { const n = delMes.filter(a => EST(a) === e).length; return n ? <span key={e}><i className={`f-${colorEstado(e)}`} />{e}: {n}</span> : null; })}
          {delMes.some(a => vencida(a, hoy)) && <span className="es-rojo">Vencidas: {delMes.filter(a => vencida(a, hoy)).length}</span>}</div>
      </div>
      <div className="c-sem">
        {DIAS.map(d => <div key={d} className="c-dsem">{d}</div>)}
        {dias.map(d => {
          const items = (porDia.get(d) ?? []).sort(orden), wd = new Date(d + 'T00:00').getDay(), abierto = abiertos.has(d);
          const enMeta = doc.meta.inicio && doc.meta.fin && d >= doc.meta.inicio && d <= doc.meta.fin;
          return (
            <div key={d} data-dia={d} className={`c-dia ${d < primero || d > ultimo ? 'fuera' : ''} ${wd === 0 || wd === 6 ? 'finde' : ''} ${d === hoy ? 'hoy' : ''} ${enMeta ? 'en-meta' : ''} ${sobre === d ? 'sobre' : ''}`}
              title={ed ? `Clic en un espacio vacío para crear una actividad con fecha fin ${fmtTxt(d)}` : undefined} onClick={() => { if (ed) onNueva(d); }} {...zona(d, d)}>
              <div className="c-num"><b>{+d.slice(8)}</b>
                {d === doc.meta.inicio && <span className="c-marca" title="Inicio de la meta"><Ico n="bandera" t={10} /> Inicio meta</span>}
                {d === doc.meta.fin && <span className="c-marca" title="Fin de la meta"><Ico n="bandera" t={10} /> Fin meta</span>}
                {items.length > 0 && <span className="c-cuenta">{items.length}</span>}</div>
              <div className="c-items">{(abierto ? items : items.slice(0, MAX_POR_DIA)).map(chip)}
                {items.length > MAX_POR_DIA && <button className="c-mas" onClick={e => { e.stopPropagation(); setAbiertos(s => { const n = new Set(s); if (n.has(d)) n.delete(d); else n.add(d); return n; }); }}>{abierto ? 'Ver menos' : `+${items.length - MAX_POR_DIA} más`}</button>}</div>
            </div>
          );
        })}
      </div>
      <div className={`c-sinfecha ${sobre === 'sin' ? 'sobre' : ''}`} {...zona('', 'sin')}>
        <h4><Ico n="calendario" t={15} /> Sin fecha fin <span className="m-n">{sinFecha.length}</span></h4>
        {sinFecha.length ? <div className="c-sf-items">{sinFecha.map(chip)}</div> : <div className="nd" style={{ fontSize: 13 }}>Todas las actividades tienen fecha fin.</div>}
        <div className="nd" style={{ fontSize: 12, marginTop: 6 }}>{ed ? 'Arrastra una actividad de aquí a un día para darle fecha fin, o suelta aquí una del calendario para quitársela.' : 'Toma el archivo para asignarles fecha arrastrándolas al calendario.'}</div>
      </div>
      <div className="g-leyenda">{ESTADOS.map(e => <span key={e}><i className={`g-ley b-${colorEstado(e)}`} />{e}</span>)}
        <span><i className="g-ley" style={{ boxShadow: 'inset 0 0 0 2px var(--c-rojo)' }} />Vencida</span>
        {doc.meta.inicio && <span><i className="g-ley" style={{ boxShadow: 'inset 0 3px 0 var(--accent)' }} />Dentro de la meta</span>}
        <span className="g-ayuda">{ed ? <><Ico n="lapiz" t={13} /> Arrastra para cambiar la fecha fin · clic en una actividad para editarla · clic en un día vacío para crear una</> : <><Ico n="candado" t={13} /> Toma el archivo para mover actividades</>}</span></div>
    </div>
  );
}
