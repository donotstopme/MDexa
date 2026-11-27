import { useState } from 'react';
import { COLORES_ETQ, EST, actividadesParaHito, conSigno, creaCicloHito, hitosOrdenados, recorridoHito, siguienteIdHito, guardarHito, hitoDe, nomCorto, pl, seleccionHito, unicos, type Actividad, type ColorEtiqueta, type Documento } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { fmtTxt } from '../original/piezas';
import { Dialogo } from './Dialogo';

/** Ventana para crear o editar un hito: nombre, fecha, descripción, negocios y las actividades que incluye */
export function FormHito({ doc, id, usuario, onGuardar, aviso, onCerrar }: {
  doc: Documento; id: number | null; usuario: string; onGuardar(fn: (d: Documento) => Documento): void; aviso(m: string): void; onCerrar(): void;
}) {
  const h = doc.hitos.find(x => x.id === id);
  const [f, setF] = useState(() => ({ id: h?.id, nombre: h?.nombre ?? '', fecha: h?.fecha ?? '', descripcion: h?.descripcion ?? '', negocios: h?.negocios ?? [], cumplido: h?.cumplido ?? '', color: h?.color, depende: h?.depende ?? [] }));
  /** Casillas que la persona cambió; las demás se marcan solas */
  const [manual, setManual] = useState<ReadonlyMap<number, boolean>>(new Map());
  const otros = hitosOrdenados(doc.hitos.filter(x => x.id !== f.id)), idF = f.id ?? siguienteIdHito(doc), rec = h ? recorridoHito(h) : null;
  const negocios = unicos([...doc.actividades.map(a => a.negocio), ...f.negocios]);
  const acts = actividadesParaHito(doc, f.negocios, f.id), sel = seleccionHito(doc, f, manual);
  const marcar = (l: Actividad[], v: boolean) => setManual(m => new Map([...m, ...l.map(a => [a.id, v] as const)]));
  const nota = (a: Actividad) => {
    const otro = hitoDe(doc, a);
    if (otro && otro.id !== f.id) return `en «${otro.nombre}»`;
    if (EST(a) === 'Terminado') return 'terminada';
    if (EST(a) === 'Cancelado') return 'cancelada';
    if (!a.fin) return 'sin fecha fin';
    return f.fecha && a.fin > f.fecha ? 'después de la fecha' : '';
  };
  const guardar = (e: React.FormEvent) => {
    e.preventDefault();
    const r = guardarHito(doc, f, usuario, sel);
    if ('error' in r) { window.alert(r.error); return; }
    onGuardar(d => { const x = guardarHito(d, f, usuario, sel); return 'doc' in x ? x.doc : d; });
    aviso(`${h ? 'Hito guardado' : 'Hito creado'} · ${pl(sel.size, 'actividad', 'actividades')}`); onCerrar();
  };
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={guardar} id="formHito">
        <h2><Ico n="bandera" t={20} /> {h ? 'Editar hito' : 'Nuevo hito'}</h2>
        <div className="grid">
          <label><span>Nombre <b>*</b></span><input autoFocus placeholder="Ej. Diseño aprobado" value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} /></label>
          <label><span>Fecha <b>*</b></span><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></label>
          <label className="todo">Descripción<textarea rows={2} placeholder="Qué se entrega y cómo se sabe que está cumplido" value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></label>
          <div className="todo"><span className="hito-cab"><span>Color</span></span>
            <div className="hito-colores" role="group" aria-label="Color del hito">
              <button type="button" className={`auto ${f.color ? '' : 'on'}`} aria-pressed={!f.color} title="El color cambia según el estado del hito" onClick={() => setF({ ...f, color: undefined })}>Según el estado</button>
              {(Object.entries(COLORES_ETQ) as [ColorEtiqueta, string][]).map(([c, nom]) => (
                <button key={c} type="button" className={`etq-col etq-${c} ${f.color === c ? 'on' : ''}`} title={nom} aria-label={nom} aria-pressed={f.color === c} onClick={() => setF({ ...f, color: c })} />))}</div></div>
          <div className="todo"><span className="hito-cab"><span>Negocios <b>*</b></span></span>
            <div className="hito-negs">{!negocios.length && <span className="nd">Todavía no hay actividades con negocio.</span>}
              {negocios.map(n => <label key={n} className="check s-ck"><input type="checkbox" checked={f.negocios.includes(n)}
                onChange={e => setF({ ...f, negocios: e.target.checked ? [...f.negocios, n] : f.negocios.filter(x => x !== n) })} /> {n}</label>)}</div></div>
          <div className="todo">
            <span className="hito-cab"><span>Actividades incluidas <span className="nd">({sel.size} de {acts.length})</span></span>
              {!!acts.length && <span><button type="button" onClick={() => marcar(acts, true)}>Todas</button> <button type="button" onClick={() => marcar(acts, false)}>Ninguna</button></span>}</span>
            {!f.negocios.length ? <p className="nd">Elige uno o varios negocios: se incluyen solas sus actividades abiertas que terminan en la fecha del hito o antes.</p> : (
              <div className="hito-arbol">{f.negocios.slice().sort((a, b) => a.localeCompare(b, 'es')).map(n => {
                const l = acts.filter(a => a.negocio === n), k = l.filter(a => sel.has(a.id)).length;
                return (
                  <details key={n} open>
                    <summary><input type="checkbox" aria-label={`Todas las de ${n}`} disabled={!l.length} checked={!!l.length && k === l.length} ref={el => { if (el) el.indeterminate = k > 0 && k < l.length; }}
                      onChange={e => marcar(l, e.target.checked)} /> <b>{n}</b> <span className="nd">{k} de {l.length}</span></summary>
                    {l.map(a => (
                      <label key={a.id} className="hito-act" data-act={a.id}><input type="checkbox" checked={sel.has(a.id)} onChange={e => marcar([a], e.target.checked)} />
                        <span className="hito-nom">#{a.id} {nomCorto(a)}</span><span className="nd">{nota(a)}</span><span className="nd">{a.fin ? fmtTxt(a.fin) : '—'}</span></label>))}
                  </details>
                );
              })}</div>)}
            {!f.fecha && !!f.negocios.length && <p className="nd">Pon la fecha para que se marquen las que encajan.</p>}
          </div>
          {!!otros.length && <div className="todo"><span className="hito-cab"><span>Depende de <span className="nd">(hitos que deben cumplirse antes)</span></span></span>
            <div className="hito-negs" id="hDeps">{otros.map(x => {
              const marcado = f.depende.includes(x.id), ciclo = !marcado && creaCicloHito(doc.hitos, idF, x.id);
              return <label key={x.id} className="check s-ck" title={ciclo ? 'Ese hito ya depende de éste' : x.fecha ? fmtTxt(x.fecha) : ''}>
                <input type="checkbox" checked={marcado} disabled={ciclo} onChange={e => setF({ ...f, depende: e.target.checked ? [...f.depende, x.id] : f.depende.filter(n => n !== x.id) })} />
                <i className={`hito-punto ${x.color ? `h-color etq-${x.color}` : 'h-En-tiempo'}`} />{x.nombre}</label>;
            })}</div></div>}
          {rec && <div className="todo hito-hist"><span className="hito-cab"><span>Historial de fechas <span className="nd">(recorrido {pl(rec.veces, 'vez', 'veces')} · {conSigno(rec.dias)} desde el {fmtTxt(rec.original)})</span></span></span>
            <ul>{[...h!.cambios!].reverse().map(c => <li key={c.cuando}>{fmtTxt(c.antes)} → <b>{fmtTxt(c.despues)}</b> <span className="nd">· {c.autor} · {new Date(c.cuando).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span></li>)}</ul></div>}
          <label>Cumplido el<input type="date" value={f.cumplido} onChange={e => setF({ ...f, cumplido: e.target.value })} />
            <span className="nota-dep">Opcional: se cumple solo cuando terminan sus actividades.</span></label>
        </div>
        <div className="pie"><span className="ayuda">* Obligatorio</span><div className="barra"><button type="button" onClick={onCerrar}><Ico n="x" /> Cancelar</button><button type="submit" className="prim"><Ico n="check" /> Guardar hito</button></div></div>
      </form>
    </Dialogo>
  );
}
