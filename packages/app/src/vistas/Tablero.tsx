import { useState } from 'react';
import {
  ESTADOS, EST, aplicarSoltar, metaGrupo, nomCorto, palabras, pendientesAlMover, valorDeGrupo, type Actividad, type Agrupar, type Bloque, type Documento, type Estado, type Novedades,
} from '@mdexa/core';
import { Estrella, Ico } from '../original/iconos';
import { colorEstado } from '../original/piezas';
import type { Edicion } from './Lista';
import type { Acciones, Seleccion } from './acciones';
import { CajaGrupo } from './Cajas';
import { TarjetaK } from './TarjetaK';

const AYUDA: Record<string, string> = { negocio: '; a otro carril para cambiarla de negocio', responsable: '; a otro carril para cambiar el responsable', prioridad: '; a otro carril para cambiar la prioridad' };

export interface PropsTablero {
  sel?: Seleccion;
  renombrar?(g: string): void;
  doc: Documento; bloques: Bloque[]; texto: string; agrupar: Agrupar; ocultaBacklog: boolean; edicion?: Edicion; novIds?: Novedades['porId'];
  colapsados: Set<string>; onGrupo(g: string): void; favs: Set<number>; onFav(id: number): void; acc: Acciones; onEditar(id: number): void;
  aviso?(m: string): void; msgVacio: string; icono(b: Bloque): React.ReactNode;
}

export function Tablero(p: PropsTablero) {
  const { doc, edicion, ocultaBacklog } = p;
  const [arr, setArr] = useState<number | null>(null);
  const [sobre, setSobre] = useState('');
  const pals = [...new Set(palabras(p.texto))], lista = p.bloques.flatMap(b => b.items), ed = !!edicion;
  if (!lista.length) return <div className="kanban"><div className="vacio">{p.msgVacio}</div></div>;
  const COLS = ESTADOS.filter(e => !(ocultaBacklog && e === 'Backlog'));
  const tot = (e: Estado) => lista.filter(a => EST(a) === e).length;

  const confirmarDeps = (a: Actividad, nuevo: Estado) => {
    const pend = pendientesAlMover(doc.actividades, a, nuevo);
    return !pend.length || window.confirm(`"${nomCorto(a)}" depende de:\n\n${pend.map(d => `• #${d.id} ${nomCorto(d)} (${EST(d)})`).join('\n')}\n\n${pend.length === 1 ? 'Esa actividad aún no termina' : 'Esas actividades aún no terminan'}. ¿Pasarla a ${nuevo} de todos modos?`);
  };
  const soltar = (estado: Estado, g: string) => {
    const a = doc.actividades.find(x => x.id === arr);
    setArr(null); setSobre('');
    if (!a || !edicion) return;
    if (EST(a) !== estado && !confirmarDeps(a, estado)) return;
    const r = aplicarSoltar(a, estado, g || null, p.agrupar);
    if (!r.cambios.length) return;
    edicion.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === a.id ? r.a : x)) }));
    p.aviso?.(`${nomCorto(a)} → ${r.cambios.join(' · ')}`);
  };
  const mover = (id: number, e: Estado) => {
    const a = doc.actividades.find(x => x.id === id);
    if (!a || !confirmarDeps(a, e)) return;
    const r = aplicarSoltar(a, e, null, '');
    edicion?.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === id ? r.a : x)) }));
  };
  const tarjeta = (a: Actividad, tagNeg: boolean) => (
    <TarjetaK key={a.id} a={a} doc={doc} tagNeg={tagNeg} editable={ed} arrastrable={ed} pals={pals} nov={p.novIds?.[a.id]} fav={p.favs.has(a.id)}
      onFav={() => p.onFav(a.id)} acc={p.acc} onAbrir={() => p.onEditar(a.id)} onMover={mover} sel={p.sel} onArrastrar={setArr} onSoltar={() => { setArr(null); setSobre(''); }} />
  );

  return (
    <div className={`kanban ${ed ? 'editable' : ''} ${arr !== null ? 'soltando' : ''}`} style={{ '--kcols': COLS.length } as React.CSSProperties}>
      <div className="k-cab">{COLS.map(e => <div key={e} className="k-col-cab" style={{ '--k': `var(--c-${colorEstado(e)})` } as React.CSSProperties}><i /><span className={`es-${colorEstado(e)}`}>{e}</span><b>{tot(e)}</b></div>)}</div>
      {p.bloques.map(b => {
        const cerrado = b.g !== null && p.colapsados.has(b.g), fav = b.g === '__fav', m = metaGrupo(b.items);
        return (
          <section key={b.g ?? ''} className={`k-carril ${cerrado ? 'cerrado' : ''}`} data-g={b.g ?? ''}>
            {b.g !== null && (
              <div className={`k-carril-cab ${fav ? 'g-fav' : ''} ${cerrado ? 'cerrado' : ''}`} data-g={b.g} onClick={() => p.onGrupo(b.g!)}>
                <CajaGrupo ids={b.items.map(a => a.id)} sel={p.sel} /><span className="flecha">▾</span>{p.icono(b)}<b>{b.titulo}</b>{p.renombrar && !fav && <button className="ico-btn g-ren" title="Renombrar este negocio" aria-label="Renombrar negocio" onClick={e => { e.stopPropagation(); p.renombrar!(b.g!); }}><Ico n="lapiz" t={13} /></button>}
                <span className="meta">{m.total} {m.total === 1 ? 'actividad' : 'actividades'} · {m.hechas} terminada{m.hechas === 1 ? '' : 's'}{m.venc > 0 && <> · <span className="es-rojo">{m.venc} vencida{m.venc === 1 ? '' : 's'}</span></>}{fav && ' · sólo las ves tú'}</span>
              </div>
            )}
            {!cerrado && (
              <div className="k-celdas">{COLS.map(e => {
                const items = b.items.filter(a => EST(a) === e), clave = `${b.g ?? ''}|${e}`;
                return (
                  <div key={e} className={`k-celda ${sobre === clave ? 'sobre' : ''}`} data-estado={e} data-g={b.g ?? ''} style={{ '--k': `var(--c-${colorEstado(e)})` } as React.CSSProperties}
                    onDragOver={ev => { if (arr !== null) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'move'; setSobre(clave); } }}
                    onDragLeave={ev => { if (!(ev.currentTarget as HTMLElement).contains(ev.relatedTarget as Node)) setSobre(s => (s === clave ? '' : s)); }}
                    onDrop={ev => { ev.preventDefault(); soltar(e, b.g ?? ''); }}>
                    <div className={`k-celda-tit es-${colorEstado(e)}`}>{e} · {items.length}</div>
                    {items.length ? items.map(a => tarjeta(a, b.g === null || fav || p.agrupar !== 'negocio')) : <div className="k-vacia">{ed ? 'Suelta aquí' : 'Sin actividades'}</div>}
                  </div>
                );
              })}</div>
            )}
          </section>
        );
      })}
      <div className="g-leyenda">{ed
        ? <span className="g-ayuda" style={{ marginLeft: 0 }}><Ico n="lapiz" t={13} /> Arrastra una tarjeta a otra columna para cambiar su estado{AYUDA[p.agrupar] ?? ''} · Usa Iniciar y Terminar para avanzar rápido · clic en una tarjeta para editarla</span>
        : <span className="g-ayuda" style={{ marginLeft: 0 }}><Ico n="candado" t={13} /> Toma el archivo para mover las tarjetas</span>}</div>
    </div>
  );
}
export { Estrella, valorDeGrupo };
