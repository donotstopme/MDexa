import { useState } from 'react';
import {
  ESTADOS, EST, PRIORIDADES, colorEtq, TAMANOS, cerrada, conEstado, metaGrupo, negocioDe, pendientesAlMover, nomCorto, palabras, vencida,
  type Actividad, type Bloque, type Documento, type Estado, type Novedades, type Orden, type Prioridad, type Tamano, type ClaveOrden, type InfoGrupo,
} from '@mdexa/core';
import { Ico, Estrella } from '../original/iconos';
import type { Acciones, Seleccion } from './acciones';
import { CajaGrupo, CajaSel } from './Cajas';
import { BotonImgs, BotonNotas, BotonSubs, ChipEstado, ChipRepite, ChipsDeps, Etqs, Fecha, IcoTam, MarcaNov, Nd, PriBadge, Resaltar, TamBadge, colorEstado, fmtTxt } from '../original/piezas';

export interface Edicion { editar(fn: (d: Documento) => Documento): void }

export interface Props {
  sel?: Seleccion;
  renombrar?(g: string): void;
  doc: Documento; bloques: Bloque[]; texto: string; edicion?: Edicion; novIds?: Novedades['porId'];
  orden: Orden; onOrden(o: Orden): void; colsOcultas: Set<string>; agrupaPorNegocio: boolean; hayAgrupacion: boolean;
  colapsados: Set<string>; onGrupo(g: string): void; favs: Set<number>; onFav(id: number): void;
  acc: Acciones; onEditar(id: number): void; onEliminar(id: number): void; onFiltrarEtq(t: string): void; msgVacio: string;
}

const COLS: [ClaveOrden, string][] = [['negocio', 'Negocio'], ['actividad', 'Actividad'], ['prioridad', 'Prioridad'], ['tamano', 'Tamaño'], ['responsable', 'Responsable'], ['inicio', 'Inicio'], ['fin', 'Fin'], ['estado', 'Estado']];

export function IconoGrupo({ info, doc }: { info: InfoGrupo; doc: Documento }) {
  if (info.icono === 'prioridad') return info.valor ? <PriBadge p={info.valor as Prioridad} corto /> : <span className="g-ico-vacio"><Ico n="prioridad" t={14} /></span>;
  if (info.icono === 'estado') return <i className={`g-punto-est f-${colorEstado(info.valor)}`} />;
  if (info.icono === 'etiqueta') return info.valor ? <i className={`g-punto-est etq-${colorEtq(info.valor, doc.coloresEtq)}`} style={{ background: 'var(--e)' }} /> : <Ico n="etiqueta" t={14} />;
  return <Ico n={info.icono} t={15} />;
}

/** Campo de texto que guarda al salir o con Enter; Escape lo deja como estaba. `list` = combo con opciones y alta libre. */
function CampoEd({ a, campo, tipo = 'text', lista, onGuardar }: { a: Actividad; campo: 'responsable' | 'inicio' | 'fin'; tipo?: string; lista?: string; onGuardar(v: string): void }) {
  const v = a[campo] || '';
  const [t, setT] = useState(v), [ant, setAnt] = useState(v);
  if (v !== ant) { setAnt(v); setT(v); }
  return <input className={`ed${v ? '' : ' sinvalor'}`} type={tipo} list={lista} value={t} placeholder="—" data-id={a.id} data-campo={campo}
    onChange={e => { setT(e.target.value); if (tipo === 'date') onGuardar(e.target.value); }}
    onBlur={() => { if (tipo !== 'date' && t.trim() !== v) onGuardar(t.trim()); }}
    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setT(v); (e.target as HTMLInputElement).blur(); } }} />;
}

export function Lista(p: Props) {
  const { doc, edicion, novIds, colsOcultas } = p;
  const pals = [...new Set(palabras(p.texto))];
  const ed = !!edicion;
  const mostrar = (k: string) => !colsOcultas.has(k);
  const conNeg = !p.agrupaPorNegocio && mostrar('negocio');
  const cols = COLS.filter(([k]) => (k === 'negocio' ? conNeg : k === 'actividad' || mostrar(k)));
  const nCols = cols.length + 1 + (ed ? 2 : 0);
  const lista = p.bloques.flatMap(b => b.items);

  const cambiar = (a: Actividad, parche: Partial<Actividad>) => edicion?.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === a.id ? { ...x, ...parche } : x)) }));
  const guardarCampo = (a: Actividad, campo: 'responsable' | 'inicio' | 'fin', v: string) => {
    if ((a[campo] || '') === v) return;
    const ini = campo === 'inicio' ? v : a.inicio, fin = campo === 'fin' ? v : a.fin;
    if (ini && fin && fin < ini) { window.alert('La fecha fin no puede ser anterior a la fecha inicio.'); return; }
    cambiar(a, { [campo]: v });
  };
  const cambiarEstado = (a: Actividad, e: Estado) => {
    const pend = pendientesAlMover(doc.actividades, a, e);
    if (pend.length && !window.confirm(`"${nomCorto(a)}" depende de:\n\n${pend.map(d => `• #${d.id} ${nomCorto(d)} (${EST(d)})`).join('\n')}\n\n${pend.length === 1 ? 'Esa actividad aún no termina' : 'Esas actividades aún no terminan'}. ¿Pasarla a ${e} de todos modos?`)) return;
    edicion?.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === a.id ? conEstado(x, e) : x)) }));
  };

  const fila = (a: Actividad, conNegocio: boolean, tagNegocio = false) => {
    const est = EST(a), color = colorEstado(est), venc = vencida(a), nov = novIds?.[a.id], fav = p.favs.has(a.id);
    const nuevasN = 0;
    return (
      <tr key={a.id} className={`e-${color}${nov ? ' con-nov' : ''}${p.sel?.ids.has(a.id) ? ' seleccionada' : ''}`} data-id={a.id}>
        {p.sel && <td className="col-sel"><CajaSel id={a.id} sel={p.sel} /></td>}
        <td className="col-fav"><button className={`estrella ${fav ? 'on' : ''}`} title={fav ? 'Quitar de mis favoritas' : 'Marcar como favorita (sólo para ti)'} onClick={() => p.onFav(a.id)}><Estrella /></button></td>
        {conNegocio && <td>{a.negocio ? <span className="tag">{a.negocio}</span> : <Nd />}</td>}
        <td className="txt">
          <Resaltar texto={a.actividad} pals={pals} /> <MarcaNov nov={nov} />
          <BotonNotas a={a} doc={doc} nuevas={nuevasN} onClick={() => p.acc.notas(a.id)} /><BotonImgs a={a} doc={doc} onClick={() => p.acc.imgs(a.id)} />
          {!(a.subtareas?.length) && <BotonSubs a={a} onClick={el => p.acc.subs(a.id, el)} />}
          {tagNegocio && <span className="tag tag-neg">{negocioDe(a)}</span>}
          {!!a.subtareas?.length && <BotonSubs a={a} onClick={el => p.acc.subs(a.id, el)} />}
          <ChipRepite a={a} /><ChipsDeps a={a} doc={doc} onIr={p.acc.ir} /><Etqs a={a} doc={doc} onFiltrar={p.onFiltrarEtq} onEditar={ed ? el => p.acc.etq(a.id, el) : undefined} />
        </td>
        {mostrar('prioridad') && <td>{ed
          ? <div className="celda-tam"><PriBadge p={a.prioridad} corto /><select className="ed" title={a.prioridad ? 'Prioridad ' + a.prioridad : 'Sin prioridad'} value={a.prioridad} onChange={e => cambiar(a, { prioridad: e.target.value as Prioridad | '' })}>
            <option value="">—</option>{Object.keys(PRIORIDADES).map(x => <option key={x}>{x}</option>)}</select></div>
          : <PriBadge p={a.prioridad} />}</td>}
        {mostrar('tamano') && <td>{ed
          ? <div className="celda-tam">{a.tamano && <span className={`tam tam-${a.tamano}`} title={TAMANOS[a.tamano].txt}><IcoTam t={a.tamano} /></span>}
            <select className="ed" title={a.tamano ? TAMANOS[a.tamano].txt : 'Sin tamaño'} value={a.tamano} onChange={e => cambiar(a, { tamano: e.target.value as Tamano | '' })}>
              <option value="">—</option>{Object.keys(TAMANOS).map(x => <option key={x}>{x}</option>)}</select>{a.tamano === 'XL' && <span className="tam tam-XL" title="Debería partirse">⚠</span>}</div>
          : <TamBadge t={a.tamano} />}</td>}
        {mostrar('responsable') && <td>{ed ? <CampoEd a={a} campo="responsable" lista="listaResp" onGuardar={v => guardarCampo(a, 'responsable', v)} /> : a.responsable || <Nd />}</td>}
        {mostrar('inicio') && <td>{ed ? <CampoEd a={a} campo="inicio" tipo="date" onGuardar={v => guardarCampo(a, 'inicio', v)} /> : <Fecha d={a.inicio} />}</td>}
        {mostrar('fin') && <td>{ed ? <CampoEd a={a} campo="fin" tipo="date" onGuardar={v => guardarCampo(a, 'fin', v)} /> : <Fecha d={a.fin} />}</td>}
        {mostrar('estado') && <td><div className="celda-est">
          {ed ? <select className={`ed est es-${color}`} value={est} onChange={e => cambiarEstado(a, e.target.value as Estado)}>{ESTADOS.map(e => <option key={e}>{e}</option>)}</select> : <ChipEstado e={est} />}
          {venc && <span className="chip venc" title="La fecha fin ya pasó">Vencida</span>}
          {a.terminada && <span className="term">✓ {fmtTxt(a.terminada)}</span>}</div></td>}
        {ed && <td className="acc"><button className="ico-btn" title="Editar" aria-label="Editar" onClick={() => p.onEditar(a.id)}><Ico n="lapiz" /></button>
          <button className="ico-btn peligro" title="Eliminar" aria-label="Eliminar" onClick={() => p.onEliminar(a.id)}><Ico n="basura" /></button></td>}
      </tr>
    );
  };

  return (
    <div id="vistaLista">
      <table>
        <thead><tr>
          {p.sel && <th className="col-sel"><CajaGrupo ids={lista.map(a => a.id)} sel={p.sel} todo /></th>}
          <th className="col-fav" title="Mis favoritas"><span className="estrella" style={{ color: 'var(--muted)', cursor: 'default' }}><Estrella /></span></th>
          {cols.map(([k, t]) => <th key={k} data-k={k} onClick={() => p.onOrden({ k, asc: p.orden.k === k ? !p.orden.asc : true })}>{t}{p.orden.k === k ? (p.orden.asc ? ' ↑' : ' ↓') : ''}</th>)}
          {ed && <th />}
        </tr></thead>
        <tbody id="tabla">
          {!lista.length && <tr><td colSpan={nCols} className="vacio">{p.msgVacio}</td></tr>}
          {p.bloques.map(b => {
            if (b.g === null) return b.items.map(a => fila(a, conNeg));
            const cerrado = p.colapsados.has(b.g), m = metaGrupo(b.items);
            return [
              <tr key={'g' + b.g} className={`grupo ${b.g === '__fav' ? 'g-fav' : ''} ${cerrado ? 'cerrado' : ''}`} data-g={b.g} onClick={() => p.onGrupo(b.g!)}><td colSpan={nCols}>
                {p.sel && <CajaGrupo ids={b.items.map(a => a.id)} sel={p.sel} />}<span className="flecha">▾</span>{b.g === '__fav' ? <span className="ico-fav"><Estrella relleno /></span> : b.info && <IconoGrupo info={b.info} doc={doc} />}{b.titulo}
                {p.renombrar && b.g !== '__fav' && <button className="ico-btn g-ren" title="Renombrar este negocio" aria-label="Renombrar negocio" onClick={e => { e.stopPropagation(); p.renombrar!(b.g!); }}><Ico n="lapiz" t={13} /></button>}
                <span className="meta">{m.total} {m.total === 1 ? 'actividad' : 'actividades'} · {m.hechas} terminada{m.hechas === 1 ? '' : 's'}
                  {m.venc > 0 && <> · <span className="es-rojo">{m.venc} vencida{m.venc === 1 ? '' : 's'}</span></>}{b.g === '__fav' && ' · sólo las ves tú'}</span>
              </td></tr>,
              ...(cerrado ? [] : b.items.map(a => fila(a, conNeg, b.g === '__fav' && !p.agrupaPorNegocio))),
            ];
          })}
        </tbody>
      </table>
    </div>
  );
}
export { cerrada };

/** Icono de encabezado de un bloque (para Lista, Tablero y Línea de tiempo) */
export function IconoBloque({ b, doc }: { b: Bloque; doc: Documento }) {
  if (b.g === '__fav') return <span className="ico-fav"><Estrella relleno /></span>;
  return b.info ? <IconoGrupo info={b.info} doc={doc} /> : <Ico n="tienda" t={15} />;
}
