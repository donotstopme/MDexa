import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ESTADOS, EST, PX_DIA, addDias, avanceSubs, choqueFechas, cerrada, conDependencia, descRepite, deps, dias, diaEn, metaGrupo, moverBarra, negocioDe, nomCorto, palabras,
  problemaEnlace, programarPorClic, rangoGantt, rutaFlecha, sinDependencia, vencida, xDe, type Actividad, type Asa, type Bloque, type Documento, type Novedades, type Zoom,
} from '@mdexa/core';
import { Estrella, Ico } from '../original/iconos';
import { BotonNotas, MarcaNov, PriBadge, Resaltar, TamBadge, colorEstado, fmtTxt } from '../original/piezas';
import type { Edicion } from './Lista';
import type { Acciones, Seleccion } from './acciones';
import { CajaGrupo, CajaSel } from './Cajas';

const FILA = 46, GRUPO = 38, ENC = 48;
interface Arr { id: number; tipo: Asa; x0: number; inicio: string; fin: string; d: number }
interface Enl { src: number; x: number; y: number; dest: number | null }
type Fila = { tipo: 'grupo'; b: Bloque; y: number } | { tipo: 'act'; a: Actividad; tagNeg: boolean; y: number };

export interface PropsGantt {
  sel?: Seleccion;
  renombrar?(g: string): void;
  doc: Documento; bloques: Bloque[]; texto: string; zoom: Zoom; hoy: string; edicion?: Edicion; novIds?: Novedades['porId']; colapsados: Set<string>; onGrupo(g: string): void;
  favs: Set<number>; onFav(id: number): void; acc: Acciones; onEditar(id: number): void; aviso?(m: string): void; msgVacio: string; agrupaPorNegocio: boolean; icono(b: Bloque): React.ReactNode;
}

export function Gantt(p: PropsGantt) {
  const { doc, edicion, zoom, hoy } = p;
  const [arr, setArr] = useState<Arr | null>(null);
  const [enl, setEnl] = useState<Enl | null>(null);
  const scroll = useRef<HTMLDivElement>(null), cuerpo = useRef<HTMLDivElement>(null);
  const px = PX_DIA[zoom], ed = !!edicion, LW = typeof innerWidth === 'number' && innerWidth <= 800 ? 150 : 300;
  const pals = [...new Set(palabras(p.texto))];
  const lista = p.bloques.flatMap(b => b.items);
  const r = useMemo(() => rangoGantt(lista, doc.meta, hoy), [lista, doc.meta, hoy]);
  const W = r.nd * px, x = (f: string) => xDe(r, px, f);

  // filas con su posición vertical (alturas fijas: 46 px actividad, 38 px grupo)
  const filas = useMemo<Fila[]>(() => {
    const out: Fila[] = []; let y = 0;
    for (const b of p.bloques) {
      if (b.g !== null) { out.push({ tipo: 'grupo', b, y }); y += GRUPO; }
      if (b.g !== null && p.colapsados.has(b.g)) continue;
      for (const a of b.items) { out.push({ tipo: 'act', a, tagNeg: b.g === null || b.g === '__fav' || !p.agrupaPorNegocio, y }); y += FILA; }
    }
    return out;
  }, [p.bloques, p.colapsados, p.agrupaPorNegocio]);
  const alto = filas.reduce((m, f) => Math.max(m, f.y + (f.tipo === 'grupo' ? GRUPO : FILA)), 0);
  const filaDe = new Map(filas.flatMap(f => (f.tipo === 'act' ? [[f.a.id, f] as const] : [])));

  useEffect(() => {
    const c = scroll.current;
    if (c) c.scrollLeft = Math.max(0, x(hoy) - (c.clientWidth - LW) / 3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  if (!lista.length) return <div className="gantt"><div className="vacio">{p.msgVacio}</div></div>;
  const fechas = (a: Actividad) => (arr && arr.id === a.id ? moverBarra(arr.inicio, arr.fin, arr.tipo, arr.d) : { inicio: a.inicio, fin: a.fin });
  const cambiar = (id: number, fn: (a: Actividad) => Actividad) => edicion?.editar(d => ({ ...d, actividades: d.actividades.map(a => (a.id === id ? fn(a) : a)) }));

  /* arrastrar barras */
  const iniciarArr = (e: React.PointerEvent, a: Actividad, tipo: Asa) => {
    if (!ed || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setArr({ id: a.id, tipo, x0: e.clientX, inicio: a.inicio, fin: a.fin, d: 0 });
  };
  const moverArr = (e: React.PointerEvent) => { if (arr) setArr({ ...arr, d: Math.round((e.clientX - arr.x0) / px) }); };
  const soltarArr = () => {
    if (!arr) return;
    const { id, tipo, inicio, fin, d } = arr, n = moverBarra(inicio, fin, tipo, d);
    setArr(null);
    if (d === 0) { p.onEditar(id); return; }
    if (n.inicio !== inicio || n.fin !== fin) {
      cambiar(id, a => ({ ...a, inicio: n.inicio, fin: n.fin }));
      p.aviso?.(`${nomCorto(lista.find(a => a.id === id)!)}: ${fmtTxt(n.inicio)} → ${fmtTxt(n.fin)}`);
    }
  };

  /* enlazar dependencias */
  const punto = (e: React.PointerEvent) => { const t = cuerpo.current!.getBoundingClientRect(); return { x: e.clientX - t.left, y: e.clientY - t.top }; };
  const destino = (y: number) => { const f = filas.find(z => z.tipo === 'act' && y >= z.y && y < z.y + FILA); return f && f.tipo === 'act' ? f.a.id : null; };
  const iniciarEnl = (e: React.PointerEvent, a: Actividad) => {
    if (!ed || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setEnl({ src: a.id, ...punto(e), dest: null });
  };
  const moverEnl = (e: React.PointerEvent) => { if (enl) { const q = punto(e); setEnl({ ...enl, ...q, dest: destino(q.y) }); } };
  const soltarEnl = (e: React.PointerEvent) => {
    if (!enl) return;
    const q = punto(e), dest = destino(q.y), src = enl.src;
    setEnl(null);
    if (dest == null || dest === src) return;
    const motivo = problemaEnlace(doc.actividades, src, dest);
    if (motivo) { p.aviso?.(motivo); return; }
    cambiar(dest, a => conDependencia(a, src));
    const a = doc.actividades.find(z => z.id === dest)!;
    p.aviso?.(`#${dest} ${nomCorto(a)} ahora depende de #${src}${choqueFechas(doc.actividades, conDependencia(a, src)).some(d => d.id === src) ? ' · ojo: empieza antes de que termine' : ''}`);
  };
  const quitarDep = (id: number, dId: number) => {
    const a = doc.actividades.find(z => z.id === id), d = doc.actividades.find(z => z.id === dId);
    if (a && d && window.confirm(`¿Quitar la dependencia?\n\n#${id} ${nomCorto(a)}\nya no dependerá de\n#${dId} ${nomCorto(d)}`)) { cambiar(id, z => sinDependencia(z, dId)); p.aviso?.(`#${id} ya no depende de #${dId}`); }
  };
  const clicArea = (e: React.MouseEvent, a: Actividad) => {
    if (!ed || (a.inicio && a.fin) || (e.target as HTMLElement).closest('.g-barra')) return;
    const n = programarPorClic(a, diaEn(r, px, e.clientX - (e.currentTarget as HTMLElement).getBoundingClientRect().left));
    if ('error' in n) { p.aviso?.(n.error); return; }
    cambiar(a.id, () => n); p.aviso?.(`Programada: ${fmtTxt(n.inicio)} → ${fmtTxt(n.fin)}`);
  };

  /* escala */
  const meses: React.ReactNode[] = [], subs: React.ReactNode[] = [], fondo: React.ReactNode[] = [];
  for (let i = 0; i < r.nd;) {
    const d = new Date(addDias(r.ini, i) + 'T00:00'), n = Math.min(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate() + 1, r.nd - i);
    const nom = d.toLocaleDateString('es-MX', { month: zoom === 'mes' && n * px < 110 ? 'short' : 'long', year: 'numeric' });
    meses.push(<div key={i} className="g-mes" style={{ left: i * px, width: n * px }}>{n * px > 46 ? nom.charAt(0).toUpperCase() + nom.slice(1) : ''}</div>);
    if (i) fondo.push(<div key={'m' + i} className="g-linmes" style={{ left: i * px }} />);
    i += n;
  }
  for (let i = 0; i < r.nd; i++) {
    const f = addDias(r.ini, i), d = new Date(f + 'T00:00'), wd = d.getDay(), finde = wd === 0 || wd === 6;
    if (zoom === 'dia') subs.push(<div key={i} className={`g-dia ${finde ? 'finde' : ''} ${f === hoy ? 'hoy' : ''}`} style={{ left: i * px, width: px }}><b>{d.getDate()}</b><span>{'DLMMJVS'[wd]}</span></div>);
    else if (zoom === 'semana' && wd === 1) subs.push(<div key={i} className="g-sem" style={{ left: i * px, width: 7 * px }}>{d.getDate()} {d.toLocaleDateString('es-MX', { month: 'short' })}</div>);
    if (zoom !== 'mes' && finde) fondo.push(<div key={'f' + i} className="g-finde" style={{ left: i * px, width: px }} />);
  }

  /* flechas */
  const flechas: React.ReactNode[] = [];
  for (const [id, fa0] of filaDe) {
    const a = fa0.a, fa = fechas(a);
    if (!fa.inicio || !fa.fin) continue;
    const choque = new Set(choqueFechas(doc.actividades, a).map(d => d.id));
    for (const dId of deps(doc.actividades, a)) {
      const fd0 = filaDe.get(dId);
      if (!fd0) continue;
      const fd = fechas(fd0.a);
      if (!fd.inicio || !fd.fin) continue;
      const cls = choque.has(dId) ? 'choque' : cerrada(fd0.a) ? 'ok' : 'pend';
      const ruta = rutaFlecha(x(fd.fin) + px, fd0.y + 23, x(fa.inicio), fa0.y + 23);
      flechas.push(
        <g key={`${id}-${dId}`} className="fl" onClick={() => ed && quitarDep(id, dId)}>
          <title>{`#${id} ${nomCorto(a)} depende de #${dId} ${nomCorto(fd0.a)}${cls === 'choque' ? `\nOjo: empieza antes de que termine #${dId}` : ''}${ed ? '\nClic para quitar esta dependencia' : ''}`}</title>
          {ed && <path className="hit" d={ruta} />}<path className={`vis ${cls}`} d={ruta} markerEnd={`url(#fl-${cls})`} />
        </g>,
      );
    }
  }
  const mk = (c: string) => <marker id={`fl-${c}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" className={c} /></marker>;
  const errDest = enl && enl.dest != null && enl.dest !== enl.src ? problemaEnlace(doc.actividades, enl.src, enl.dest) : '';

  const filaAct = (f: Extract<Fila, { tipo: 'act' }>) => {
    const a = f.a, est = EST(a), c = colorEstado(est), venc = vencida(a, hoy), nov = p.novIds?.[a.id], fav = p.favs.has(a.id), fe = fechas(a);
    const completa = !!(fe.inicio && fe.fin), un = fe.inicio || fe.fin, { h, n } = avanceSubs(a);
    const tip = `${a.actividad}\n${est}${venc ? ' · Vencida' : ''}\n${fmtTxt(a.inicio) || '—'} → ${fmtTxt(a.fin) || '—'}${a.responsable ? '\n' + a.responsable : ''}${a.tamano ? '\nTamaño ' + a.tamano : ''}${a.prioridad ? '\nPrioridad ' + a.prioridad : ''}${ed ? '\n\nArrastra para mover · extremos: inicio/fin · clic para editar' : ''}`;
    return (
      <div key={a.id} data-id={a.id} className={`g-fila e-${c} ${p.sel?.ids.has(a.id) ? 'seleccionada' : ''} ${enl && enl.dest === a.id && enl.dest !== enl.src ? (errDest ? 'enlace-mal' : 'enlace-dest') : ''}`} style={{ height: FILA }}>
        <div className="g-lbl">
          <CajaSel id={a.id} sel={p.sel} />
          <button className={`estrella ${fav ? 'on' : ''}`} title={fav ? 'Quitar de mis favoritas' : 'Marcar como favorita (sólo para ti)'} onClick={() => p.onFav(a.id)}><Estrella /></button>
          <div className="g-info">
            <span className={`g-nom ${est === 'Cancelado' ? 'tachado' : ''}`} title={a.actividad}><MarcaNov nov={nov} /> <PriBadge p={a.prioridad} corto />
              {a.repite && <span className="g-rep" title={descRepite(a)}><Ico n="repetir" t={12} /></span>}<Resaltar texto={nomCorto(a)} pals={pals} /></span>
            <span className="g-det">{f.tagNeg && <>{negocioDe(a)} · </>}<span className={`es-${c}`}>{est}</span>{a.responsable ? ` · ${a.responsable}` : ''}</span>
          </div>
          <BotonNotas a={a} doc={doc} onClick={() => p.acc.notas(a.id)} />
          {ed && <button className="ico-btn g-edit" title="Editar" aria-label="Editar" onClick={() => p.onEditar(a.id)}><Ico n="lapiz" t={14} /></button>}
        </div>
        <div className={`g-area ${ed && !completa ? 'prog' : ''}`} onClick={e => clicArea(e, a)}>
          {completa && (
            <div className={`g-barra b-${c} ${venc ? 'venc' : ''} ${ed ? 'mov' : ''} ${arr?.id === a.id ? 'arrastrando' : ''}`} style={{ left: x(fe.inicio), width: (dias(fe.inicio, fe.fin) + 1) * px }} title={tip}
              onPointerDown={e => iniciarArr(e, a, 'mover')} onPointerMove={moverArr} onPointerUp={soltarArr} onPointerCancel={() => setArr(null)} onClick={e => { if (!ed) { e.stopPropagation(); p.acc.notas(a.id); } }}>
              {ed && <>
                <span className="g-asa izq" onPointerDown={e => iniciarArr(e, a, 'ini')} onPointerMove={moverArr} onPointerUp={soltarArr} />
                <span className="g-asa der" onPointerDown={e => iniciarArr(e, a, 'fin')} onPointerMove={moverArr} onPointerUp={soltarArr} />
                <span className="g-enlace" title="Arrastra hasta otra actividad para indicar que depende de esta" onPointerDown={e => iniciarEnl(e, a)} onPointerMove={moverEnl} onPointerUp={soltarEnl} onPointerCancel={() => setEnl(null)} />
              </>}
              <span className="g-txt">{n > 0 && <span className="g-chk"><Ico n="checklist" t={12} /> {h}/{n}</span>}{a.tamano && <TamBadge t={a.tamano} />}{a.responsable && <span>{a.responsable}</span>}{venc && <span className="es-rojo">Vencida</span>}{a.terminada && <span className="es-verde">✓ {fmtTxt(a.terminada)}</span>}</span>
            </div>
          )}
          {!completa && un && <>
            <div className={`g-punto b-${c}`} style={{ left: x(un) + px / 2 }} title={tip} />
            <span className="g-sin" style={{ left: x(un) + px / 2 + 14 }}>{a.inicio ? 'Sin fecha fin' : 'Sin fecha inicio'}{ed ? ' · clic en un día para completarla' : ''}</span></>}
          {!completa && !un && <span className="g-sin" style={{ left: x(hoy) + px / 2 + 10 }}>Sin fechas{ed ? ' · clic en un día para programarla' : ''}</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="gantt" ref={scroll}>
        <div className="g-tabla" style={{ width: LW + W, '--px': `${px}px`, '--lw': `${LW}px` } as React.CSSProperties}>
          <div className="g-cab"><div className="g-lbl g-esq"><Ico n="lista" t={14} /> Actividad</div>
            <div className="g-escala" style={{ width: W }}><div className="g-meses">{meses}</div><div className="g-subs">{subs}</div>
              {doc.meta.inicio && doc.meta.fin && <>
                <div className="g-marca meta" style={{ left: x(doc.meta.inicio) }} title={`Inicio de la meta: ${fmtTxt(doc.meta.inicio)}`}><Ico n="bandera" t={11} /> Meta</div>
                <div className="g-marca meta fin" style={{ left: x(doc.meta.fin) + px }} title={`Fin de la meta: ${fmtTxt(doc.meta.fin)}`}>Fin meta</div></>}
              {zoom !== 'dia' && <div className="g-marca hoy" style={{ left: x(hoy) + px / 2 }} title={`Hoy: ${fmtTxt(hoy)}`}>Hoy</div>}</div></div>
          <div className="g-cuerpo" ref={cuerpo}>
            <div className={`g-fondo z-${zoom}`} style={{ left: LW, width: W }}>{fondo}
              {doc.meta.inicio && doc.meta.fin && <div className="g-meta" style={{ left: x(doc.meta.inicio), width: (dias(doc.meta.inicio, doc.meta.fin) + 1) * px }} />}
              <div className="g-hoy" style={{ left: x(hoy) + px / 2 }} /></div>
            {filas.map(f => {
              if (f.tipo === 'act') return filaAct(f);
              const b = f.b, cerrado = p.colapsados.has(b.g!), fav = b.g === '__fav', m = metaGrupo(b.items);
              const cf = b.items.flatMap(a => [a.inicio, a.fin]).filter(Boolean).sort();
              return (
                <div key={'g' + b.g} className={`g-fila g-grupo ${fav ? 'g-fav' : ''} ${cerrado ? 'cerrado' : ''}`} data-g={b.g!} style={{ height: GRUPO }} onClick={() => p.onGrupo(b.g!)}>
                  <div className="g-lbl"><CajaGrupo ids={b.items.map(a => a.id)} sel={p.sel} /><span className="flecha">▾</span>{p.icono(b)}<span className="g-nom">{b.titulo}</span>{p.renombrar && !fav && <button className="ico-btn g-ren" title="Renombrar este negocio" aria-label="Renombrar negocio" onClick={e => { e.stopPropagation(); p.renombrar!(b.g!); }}><Ico n="lapiz" t={13} /></button>}<span className="meta">{m.total}</span></div>
                  <div className="g-area">{cf.length > 0 && <div className="g-resumen" style={{ left: x(cf[0]), width: (dias(cf[0], cf[cf.length - 1]) + 1) * px }} title={`${fmtTxt(cf[0])} → ${fmtTxt(cf[cf.length - 1])}`} />}</div>
                </div>
              );
            })}
            <svg className="g-flechas" style={{ left: 0, top: 0 }} width={LW + W} height={alto} aria-hidden="true">
              <defs>{mk('pend')}{mk('ok')}{mk('choque')}</defs><g transform={`translate(${LW} 0)`}>{flechas}
                {enl && (() => { const fo = filaDe.get(enl.src)!, fe = fechas(fo.a); const x0 = x(fe.fin) + px, y0 = fo.y + 23, ex = enl.x - LW; return <path className="g-enlazando" d={`M${x0} ${y0}C${x0 + 40} ${y0} ${ex - 40} ${enl.y} ${ex} ${enl.y}`} />; })()}</g>
            </svg>
          </div>
        </div>
      </div>
      <div className="g-leyenda">
        {ESTADOS.map(e => <span key={e}><i className={`g-ley b-${colorEstado(e)}`} />{e}</span>)}
        {lista.some(a => deps(doc.actividades, a).length) && <span><svg width="22" height="8" className="g-ley-fl"><path d="M0 4H16" className="pend" /><path d="M14 0L22 4L14 8z" className="pend rell" /></svg>Depende de</span>}
        <span><i className="g-ley-hoy" />Hoy</span>{doc.meta.inicio && <span><i className="g-ley-meta" />Periodo de la meta</span>}<span><i className="g-ley-punto" />Solo una fecha</span>
        {ed ? <span className="g-ayuda"><Ico n="lapiz" t={13} /> Arrastra una barra para moverla · arrastra sus extremos para cambiar inicio o fin · clic para editar · arrastra el punto del final de una barra hasta otra actividad para crear una dependencia · clic en una flecha para quitarla</span>
          : <span className="g-ayuda"><Ico n="candado" t={13} /> Toma el archivo para mover las barras</span>}
      </div>
      {enl && <div className="g-tip" style={{ left: 0, top: 0, position: 'static', display: 'inline-block', margin: '6px 0' }}>{enl.dest == null || enl.dest === enl.src ? `Suelta sobre la actividad que depende de #${enl.src}` : errDest || `#${enl.dest} dependerá de #${enl.src}`}</div>}
      {arr && (() => { const n = moverBarra(arr.inicio, arr.fin, arr.tipo, arr.d); return <div className="g-tip" style={{ position: 'static', display: 'inline-block', margin: '6px 0' }}>{fmtTxt(n.inicio)} → {fmtTxt(n.fin)} · {dias(n.inicio, n.fin) + 1} {dias(n.inicio, n.fin) + 1 === 1 ? 'día' : 'días'}</div>; })()}
    </>
  );
}
export { ENC };
