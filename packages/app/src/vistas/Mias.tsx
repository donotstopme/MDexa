import { useState } from 'react';
import { EST, normaliza, resumenMias, type Actividad, type Documento, type Estado, type Novedades } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { fmtCorta } from '../original/piezas';
import type { Edicion } from './Lista';
import type { Acciones, Seleccion } from './acciones';
import { TarjetaK } from './TarjetaK';
import { conEstado, nomCorto, pendientesAlMover } from '@mdexa/core';

const SEC: Record<string, { ic: string; c: string }> = {
  venc: { ic: 'alerta', c: 'rojo' }, hoy: { ic: 'reloj', c: 'amar' }, sem: { ic: 'calendario', c: 'azul' }, prox: { ic: 'calendario', c: 'azul' },
  luego: { ic: 'bandera', c: 'gris' }, sinf: { ic: 'calendario', c: 'gris' }, term: { ic: 'check', c: 'verde' },
};

export function Mias({ sel, doc, lista, quien, usuario, hoy, edicion, novIds, favs, onFav, acc, onEditar, onNombre, hayFiltros, msgVacio }: {
  doc: Documento; lista: Actividad[]; quien: string; usuario: string; hoy: string; edicion?: Edicion; novIds?: Novedades['porId'];
  favs: Set<number>; onFav(id: number): void; acc: Acciones; sel?: Seleccion; onEditar(id: number): void; onNombre(): void; hayFiltros: boolean; msgVacio: string;
}) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());   // secciones "plegadas" invertidas: term empieza plegada
  const ed = !!edicion;
  if (!lista.length && !doc.actividades.length) return <div className="mias"><div className="vacio">{msgVacio}</div></div>;
  if (!quien) return (
    <div className="mias"><div className="vacio"><Ico n="usuario" t={28} /><p>Indica tu nombre para ver tus actividades.</p><button className="prim" onClick={onNombre}><Ico n="usuario" /> Indicar mi nombre</button></div></div>
  );
  const r = resumenMias(lista, quien, hoy, normaliza), esYo = normaliza(quien) === normaliza(usuario);
  const cab = <div className="m-quien"><Ico n="usuario" t={20} /><b>{quien}</b>{esYo && <span className="nd">(tú)</span>}</div>;
  if (!r.mias.length) return (
    <div className="mias">{cab}<div className="vacio">No hay actividades asignadas a <b>{quien}</b>{lista.length < doc.actividades.length ? ' con los filtros actuales' : ''}.
      <div className="nd" style={{ marginTop: 6 }}>El responsable de cada actividad debe escribirse igual que el nombre. Puedes elegir otra persona en "Ver actividades de".</div></div></div>
  );
  const mover = (id: number, e: Estado) => {
    const a = doc.actividades.find(x => x.id === id);
    if (!a || !edicion) return;
    const pend = pendientesAlMover(doc.actividades, a, e);
    if (pend.length && !window.confirm(`"${nomCorto(a)}" depende de:\n\n${pend.map(d => `• #${d.id} ${nomCorto(d)} (${EST(d)})`).join('\n')}\n\n${pend.length === 1 ? 'Esa actividad aún no termina' : 'Esas actividades aún no terminan'}. ¿Pasarla a ${e} de todos modos?`)) return;
    edicion.editar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === id ? conEstado(x, e) : x)) }));
  };
  const tile = (n: string | number, l: string, c = '') => <div className={`m-tile ${c}`}><b>{n}</b><span>{l}</span></div>;
  const alternar = (k: string) => setAbiertos(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <div className="mias">
      <div className="m-cab">{cab}<div className="m-tiles">
        {tile(r.porHacer, 'Por hacer')}{tile(r.enProgreso, 'En progreso', 'amar')}{tile(r.vencidas, 'Vencidas', r.vencidas ? 'rojo' : '')}{tile(r.vencenSemana, 'Vencen esta semana', 'azul')}
        {tile(`${r.horas} h`, 'Esfuerzo máx. por hacer')}{tile(r.medibles ? `${Math.round(r.terminadas * 100 / r.medibles)}%` : '—', `Terminadas (${r.terminadas} de ${r.medibles})`, 'verde')}
      </div></div>
      {!r.abiertas.length && <div className="m-libre"><Ico n="check" t={22} /> <b>¡Nada pendiente!</b> No tienes actividades abiertas{lista.length < doc.actividades.length ? ' con los filtros actuales' : ''}.</div>}
      {r.secciones.filter(s => s.items.length).map(s => {
        const cerrado = s.plegada ? !abiertos.has(s.k) : abiertos.has(s.k), { ic, c } = SEC[s.k];
        return (
          <section key={s.k} className="m-sec" style={{ '--k': `var(--c-${c})` } as React.CSSProperties}>
            <h3 className={`m-tit ${cerrado ? 'cerrado' : ''}`} onClick={() => alternar(s.k)}>
              <span className="flecha">▾</span><span className="m-ic"><Ico n={ic} t={17} /></span>{s.t}<span className="m-n">{s.items.length}</span>
              {s.desde && s.hasta && <span className="nd">{s.k === 'sem' ? `hasta el ${fmtCorta(s.hasta)}` : `${fmtCorta(s.desde)} – ${fmtCorta(s.hasta)}`}</span>}
            </h3>
            {!cerrado && <div className="m-grid">{s.items.map(a => (
              <TarjetaK key={a.id} a={a} doc={doc} tagNeg mostrarEstado rapidas editable={ed} nov={novIds?.[a.id]} fav={favs.has(a.id)}
                onFav={() => onFav(a.id)} acc={acc} sel={sel} onAbrir={() => onEditar(a.id)} onMover={mover} />))}</div>}
          </section>
        );
      })}
      <div className="g-leyenda">{ed
        ? <span className="g-ayuda" style={{ marginLeft: 0 }}><Ico n="lapiz" t={13} /> Usa Iniciar y Terminar para avanzar rápido · clic en una tarjeta para editarla</span>
        : <span className="g-ayuda" style={{ marginLeft: 0 }}><Ico n="candado" t={13} /> Toma el archivo para usar Iniciar y Terminar</span>}</div>
      <span hidden>{hayFiltros}</span>
    </div>
  );
}
