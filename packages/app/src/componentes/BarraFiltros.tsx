import { useEffect, useRef, useState } from 'react';
import { ESTADOS, PRIORIDADES, SIN_ETQ, SIN_NEGOCIO, SIN_PRI, SIN_RESP, SIN_TAM, TAMANOS, colorEtq, etqs, negocioDe, todasEtq, unicos, type Agrupar, type Documento } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { COLS_OPC, VISTAS, type UI, type Vista } from '../estado/ui';
import { Msel } from './Msel';

const ICO_VISTA: Record<Vista, string> = { lista: 'lista', gantt: 'gantt', kanban: 'tablero', cal: 'calendario', mias: 'usuario', carga: 'carga' };
const TIT_VISTA: Record<Vista, string> = {
  lista: 'Vista de lista', gantt: 'Vista de línea de tiempo', kanban: 'Tablero por estado', cal: 'Calendario mensual por fecha fin',
  mias: 'Las actividades asignadas a ti', carga: 'Carga de trabajo por persona y semana',
};

function Columnas({ ui }: { ui: UI }) {
  const [abierto, setAbierto] = useState(false);
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const f = (e: PointerEvent) => { if (!r.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f);
  }, [abierto]);
  const n = ui.colsOcultas.size;
  return (
    <div ref={r} className={`msel cols ${abierto ? 'abierto' : ''} ${n ? 'activo' : ''}`}>
      <button type="button" className="msel-btn" aria-haspopup="true" onClick={() => setAbierto(a => !a)}>
        <Ico n="columnas" t={15} /><span className="msel-txt">{n ? `Columnas · ${n} oculta${n === 1 ? '' : 's'}` : 'Columnas'}</span><span className="msel-car">▾</span></button>
      {abierto && (
        <div className="msel-pop">
          <div className="msel-sep">Mostrar en la lista</div>
          <label className="msel-op"><input type="checkbox" checked disabled /><span>Actividad</span></label>
          {COLS_OPC.map(([k, t]) => (
            <label key={k} className="msel-op"><input type="checkbox" checked={!ui.colsOcultas.has(k)} onChange={e => ui.setCol(k, e.target.checked)} />
              <span>{t}{k === 'negocio' && <span className="nd"> (si no agrupas por negocio)</span>}</span></label>
          ))}
          <div className="msel-pie"><button type="button" onClick={ui.mostrarTodasCols}>Mostrar todas</button></div>
        </div>
      )}
    </div>
  );
}

export function BarraFiltros({ doc, ui, personas, persona, editando, nBacklog, onNueva, onPresentar }: {
  doc: Documento; ui: UI; personas: string[]; persona: string; editando: boolean; nBacklog: number; onNueva(): void; onPresentar(): void;
}) {
  const f = ui.filtros, v = ui.vista, acts = doc.actividades;
  const negs = unicos(acts.map(a => a.negocio)), resp = unicos(acts.map(a => a.responsable)), etiquetas = todasEtq(acts);
  const enM = v === 'mias';
  return (
    <div className="filtros">
      <div className="seg" role="tablist">
        {(Object.keys(VISTAS) as Vista[]).map((k, i) => (
          <button key={k} role="tab" aria-selected={v === k} className={v === k ? 'on' : ''} title={`${TIT_VISTA[k]} (tecla ${i + 1})`} onClick={() => ui.setVista(k)}>
            <Ico n={ICO_VISTA[k]} /> {VISTAS[k]}</button>
        ))}
      </div>
      {enM && <label className="check">Ver actividades de <select style={{ width: 'auto' }} value={persona} onChange={e => ui.setPersona(e.target.value)}>
        {!personas.length && <option value="">—</option>}{personas.map(p => <option key={p}>{p}</option>)}</select></label>}
      {v === 'gantt' && <select title="Escala de la línea de tiempo" value={ui.zoom} onChange={e => ui.setZoom(e.target.value as 'dia' | 'semana' | 'mes')}>
        <option value="dia">Por día</option><option value="semana">Por semana</option><option value="mes">Por mes</option></select>}
      <div className="buscar"><Ico n="buscar" />
        <input placeholder="Buscar en actividades, notas, subtareas…  ( / )" value={f.texto} onChange={e => ui.setFiltros({ texto: e.target.value })}
          title="Busca en el nombre, negocio, responsable, etiquetas, subtareas, notas y #número. Varias palabras: deben estar todas." /></div>
      <Msel todos="Todos los negocios" varios="negocios" sel={f.neg} onChange={neg => ui.setFiltros({ neg })} opciones={acts.some(a => !a.negocio) ? [...negs, SIN_NEGOCIO] : negs} />
      {!enM && <Msel todos="Todos los responsables" varios="responsables" sel={f.resp} onChange={r => ui.setFiltros({ resp: r })} opciones={acts.some(a => !a.responsable) ? [...resp, SIN_RESP] : resp} />}
      <Msel todos="Todos los estados" varios="estados" sel={f.est} onChange={est => ui.setFiltros({ est })}
        opciones={[...ESTADOS.map(e => ({ v: e, c: ({ Backlog: 'gris', Planeado: 'azul', 'En progreso': 'amar', Terminado: 'verde', Cancelado: 'rojo' } as Record<string, string>)[e] })),
          { v: 'Otros', sep: true }, 'Vencida', 'Bloqueada', 'Recurrente', 'Con novedades']} />
      <Msel todos="Todos los tamaños" varios="tamaños" sel={f.tam} onChange={tam => ui.setFiltros({ tam })} opciones={[...Object.keys(TAMANOS), SIN_TAM]} />
      <Msel todos="Todas las prioridades" varios="prioridades" sel={f.pri} onChange={pri => ui.setFiltros({ pri })} opciones={[...Object.keys(PRIORIDADES).map(p => ({ v: p, cls: `pri-punto pri-${p}` })), SIN_PRI]} />
      <Msel todos="Todas las etiquetas" varios="etiquetas" sel={f.etq} onChange={etq => ui.setFiltros({ etq })}
        opciones={[...etiquetas.map(t => ({ v: t, cls: `etq-punto etq-${colorEtq(t, doc.coloresEtq)}` })), ...(acts.some(a => !etqs(a).length) ? [SIN_ETQ] : [])]} />
      <label className="check" title="Mostrar u ocultar las actividades en Backlog">
        <input type="checkbox" checked={f.verBacklog} onChange={e => ui.setFiltros({ verBacklog: e.target.checked })} /> <span>Mostrar backlog{nBacklog ? ` (${nBacklog})` : ''}</span></label>
      {v === 'lista' && <Columnas ui={ui} />}
      <button title="Modo presentación para juntas (tecla P)" onClick={onPresentar}><Ico n="presentar" /> Presentar</button>
      {!['mias', 'cal', 'carga'].includes(v) && (
        <label className="check">Agrupar por <select className="sel-agrupar" title="Agrupa la lista, el tablero y la línea de tiempo" value={ui.agrupar} onChange={e => ui.setAgrupar(e.target.value as Agrupar)}>
          <option value="negocio">Negocio</option><option value="responsable">Responsable</option><option value="prioridad">Prioridad</option>
          <option value="estado">Estado</option><option value="etiqueta">Etiqueta</option><option value="">Sin agrupar</option></select></label>
      )}
      {editando && <button className="prim" title="Nueva actividad (tecla N)" onClick={onNueva}><Ico n="mas" /> Nueva actividad</button>}
    </div>
  );
}
export { negocioDe };
