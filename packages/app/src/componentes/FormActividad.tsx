import { useEffect, useMemo, useRef, useState } from 'react';
import {
  EST, ESTADOS, PRIORIDADES, REPITE, TAMANOS, actividadNueva, avanceSubs, cerrada, colorEtq, conEstado, creaCiclo, dependientesDe, descRepite, deps, etqs,
  hoy, leerEtqs, limpiaEtq, limpiaSub, negocioDe, nomCorto, normaliza, pendientesAlMover, todasEtq, unicos, type Actividad, type Documento, type Estado, type Repite,
} from '@mdexa/core';
import { Ico } from '../original/iconos';

export interface Preset { negocio?: string; responsable?: string; fin?: string }
interface Props {
  doc: Documento; id: number | null; preset?: Preset; nNotas?: number;
  onCerrar(): void; onGuardar(fn: (d: Documento) => Documento): void; onEliminar(id: number): void; onNotas(id: number): void; onImagenes(id: number): void; nImgs?: number; onHistorial(id: number): void;
}

const separarLineas = (txt: string) => txt.split(/\r?\n/).map(l => l.replace(/^\s*(?:[-*•·]|\d+[.)])\s+/, '').trim()).filter(Boolean);

/** Ventana de actividad: negocio y responsable son combos con alta libre (se elige uno existente o se escribe uno nuevo) */
export function FormActividad({ doc, id, preset = {}, nNotas = 0, onCerrar, onGuardar, onEliminar, onNotas, onImagenes, nImgs = 0, onHistorial }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const a = id ? doc.actividades.find(x => x.id === id) ?? null : null;
  const [f, setF] = useState(() => ({
    negocio: a?.negocio ?? preset.negocio ?? '', actividad: a?.actividad ?? '', responsable: a?.responsable ?? preset.responsable ?? '', tamano: a?.tamano ?? '',
    inicio: a?.inicio ?? '', fin: a?.fin ?? preset.fin ?? '', estado: (a ? EST(a) : 'Backlog') as Estado, terminada: a?.terminada ?? '', prioridad: a?.prioridad ?? '',
    repite: a?.repite ?? '' as Repite | '',
  }));
  const [etiquetas, setEtiquetas] = useState<string[]>(a ? [...etqs(a)] : []);
  const [depende, setDepende] = useState<number[]>(a ? [...deps(doc.actividades, a)] : []);
  const [subs, setSubs] = useState(a?.subtareas?.map(x => ({ ...x })) ?? []);
  const [etqTxt, setEtqTxt] = useState(''), [depTxt, setDepTxt] = useState(''), [subTxt, setSubTxt] = useState('');
  const [varias, setVarias] = useState<{ lineas: string[]; seguir: boolean } | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }));

  useEffect(() => { dlg.current?.showModal(); }, []);

  const negocios = useMemo(() => unicos(doc.actividades.map(x => x.negocio)), [doc]);
  const responsables = useMemo(() => unicos(doc.actividades.map(x => x.responsable)), [doc]);
  const todasE = useMemo(() => todasEtq(doc.actividades), [doc]);
  const otras = doc.actividades.filter(x => x.id !== id && !depende.includes(x.id)).sort((x, y) => x.id - y.id);
  const quienesDependen = id ? dependientesDe(doc.actividades, id) : [];
  const term = f.estado === 'Terminado';
  const nuevoResp = !!f.responsable.trim() && !responsables.some(r => normaliza(r) === normaliza(f.responsable));

  const agregarEtq = () => {
    const t = limpiaEtq(etqTxt); setEtqTxt('');
    if (t && !etiquetas.some(x => normaliza(x) === normaliza(t))) setEtiquetas([...etiquetas, todasE.find(x => normaliza(x) === normaliza(t)) || t]);
  };
  const agregarDep = (): boolean => {
    const t = depTxt.trim(); if (!t) return true;
    let n = +((t.match(/^#?\s*(\d+)/) || [])[1] || 0);
    if (!n) { const m = doc.actividades.filter(x => normaliza(nomCorto(x)).includes(normaliza(t))); if (m.length === 1) n = m[0].id; }
    const d = doc.actividades.find(x => x.id === n);
    if (!d) { window.alert(`No encontré la actividad "${t}". Escribe su número, por ejemplo #9.`); return false; }
    if (n === id) { window.alert('Una actividad no puede depender de sí misma.'); return false; }
    if (id && creaCiclo(doc.actividades, id, n)) { window.alert(`#${n} ya depende (directa o indirectamente) de esta actividad, así que no puede ser su antecesora.`); return false; }
    if (!depende.includes(n)) setDepende([...depende, n]);
    setDepTxt(''); return true;
  };
  const agregarSubs = (texto: string) => {
    const l = texto.split(/\r?\n/).map(t => limpiaSub(t.replace(/^\s*([-*•]|\[[ xX]?\]|\d+[.)])\s*/, ''))).filter(Boolean);
    if (l.length) setSubs(s => [...s, ...l.map(t => ({ t, ok: false }))]);
    return l.length;
  };

  /** Valida y arma el cambio; si el texto trae varias líneas, primero pregunta si son varias actividades */
  const guardar = (seguir: boolean, forzar?: 'una' | 'varias') => {
    const negocio = f.negocio.trim(), texto = f.actividad.trim();
    if (!negocio) { window.alert('El negocio es obligatorio.'); return; }
    if (!texto) { window.alert('Escribe al menos una actividad.'); return; }
    agregarEtq(); if (!agregarDep()) return;
    if (f.inicio && f.fin && f.fin < f.inicio) { window.alert('La fecha fin no puede ser anterior a la fecha inicio.'); return; }
    const base = a ?? ({ ...actividadNueva(doc, { actividad: texto }), id: -1 });
    const pend = pendientesAlMover(doc.actividades, { ...base, depende }, f.estado);
    if (pend.length && !window.confirm(`"${texto.split('\n')[0]}" depende de:\n\n${pend.map(d => `• #${d.id} ${nomCorto(d)} (${EST(d)})`).join('\n')}\n\n${pend.length === 1 ? 'Esa actividad aún no termina' : 'Esas actividades aún no terminan'}. ¿Pasarla a ${f.estado} de todos modos?`)) return;
    const lineas = separarLineas(texto);
    if (lineas.length > 1 && !forzar) { setVarias({ lineas, seguir }); return; }
    const textos = forzar === 'varias' ? lineas : [texto.replace(/\n\s*\n+/g, '\n')];
    const subsF = subs.map(x => ({ t: limpiaSub(x.t), ok: !!x.ok })).filter(x => x.t);
    const etqF = [...new Set([...etiquetas, ...leerEtqs(etqTxt)])];
    const comunes = { negocio, responsable: f.responsable.trim(), inicio: f.inicio, fin: f.fin, tamano: f.tamano, prioridad: f.prioridad, repite: f.repite };
    onGuardar(d => {
      let acts = [...d.actividades];
      textos.forEach((t, i) => {
        const datos: Partial<Actividad> = { ...comunes, actividad: t, etiquetas: [...etqF], depende: [...depende], ...(subsF.length ? { subtareas: subsF.map(x => ({ ...x })) } : {}) };
        if (i === 0 && id) acts = acts.map(x => { if (x.id !== id) return x; const { subtareas: _s, ...resto } = x; void _s; return conEstado({ ...resto, ...datos } as Actividad, f.estado, f.terminada); });
        else acts.push(conEstado(actividadNueva({ ...d, actividades: acts }, { ...datos, actividad: t }), f.estado, f.terminada));
      });
      return { ...d, actividades: acts };
    });
    if (seguir) {
      setF(x => ({ ...x, actividad: '', inicio: '', fin: '', tamano: '', estado: 'Backlog', terminada: '', repite: '' }));
      setDepende([]); setSubs([]); setVarias(null);
    } else onCerrar();
  };

  const enter = (e: React.KeyboardEvent, fn: () => void) => { if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === ',') { e.preventDefault(); e.stopPropagation(); fn(); } };

  return (
    <>
      <dialog ref={dlg} onClose={onCerrar} onCancel={e => { if (varias) e.preventDefault(); }}>
        <form noValidate onSubmit={e => { e.preventDefault(); guardar(((e.nativeEvent as SubmitEvent).submitter as HTMLElement | null)?.id === 'btnOtra'); }}>
          <h2>{a ? 'Editar actividad' : 'Nueva actividad'}</h2>
          <div className="grid">
            <label><span>Negocio <b>*</b></span><input list="listaNeg" placeholder="Ej. Tienda Centro" value={f.negocio} onChange={e => set('negocio', e.target.value)} autoFocus={!f.negocio} /></label>
            <label>Responsable<input list="listaResp" placeholder="Elige uno o escribe uno nuevo" value={f.responsable} onChange={e => set('responsable', e.target.value)} />
              {nuevoResp && <span className="nota-dep">Se creará «{f.responsable.trim()}» como responsable nuevo.</span>}</label>
            <label>Fecha inicio<input type="date" value={f.inicio} onChange={e => set('inicio', e.target.value)} /></label>
            <label>Fecha fin<input type="date" value={f.fin} onChange={e => set('fin', e.target.value)} /></label>
            <label className="todo"><span>Actividad <b>*</b></span>
              <textarea rows={4} placeholder="Escribe una actividad, o pega varias, una por línea" value={f.actividad} onChange={e => set('actividad', e.target.value)} autoFocus={!!f.negocio}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); guardar(false); } }} /></label>
            <label>Tamaño
              <select value={f.tamano} onChange={e => set('tamano', e.target.value as typeof f.tamano)}>
                <option value="">Sin tamaño</option>{Object.entries(TAMANOS).map(([k, t]) => <option key={k} value={k}>{k} · {t.txt}</option>)}</select>
              {f.tamano === 'XL' && <span className="nota-xl">Una actividad XL debería partirse. Puedes escribir sus partes una por línea y elegir "Son varias actividades".</span>}</label>
            <label>Estado<select value={f.estado} onChange={e => { const v = e.target.value as Estado; setF(x => ({ ...x, estado: v, terminada: v === 'Terminado' && !x.terminada ? hoy() : x.terminada })); }}>
              {ESTADOS.map(e => <option key={e}>{e}</option>)}</select></label>
            <label>Prioridad<select value={f.prioridad} onChange={e => set('prioridad', e.target.value as typeof f.prioridad)}>
              <option value="">Sin prioridad</option>{Object.keys(PRIORIDADES).map(p => <option key={p}>{p}</option>)}</select></label>
            <label>Se repite<select value={f.repite} onChange={e => set('repite', e.target.value as Repite | '')}>
              <option value="">No se repite</option>{Object.entries(REPITE).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select>
              <span className="nota-dep">{f.repite ? `${descRepite({ fin: f.fin, inicio: f.inicio } as Actividad, f.repite)}${f.fin || f.inicio ? '' : ' (según la fecha de terminación)'}. Al terminarla se crea sola la siguiente.` : ''}</span></label>
            {term && <label>Fecha en que se terminó<input type="date" value={f.terminada} onChange={e => set('terminada', e.target.value)} /></label>}
            <div className="todo f-subs"><span className="f-subs-cab">Subtareas <span className="nd">{subs.length ? `${avanceSubs({ subtareas: subs } as Actividad).h}/${subs.length}` : ''}</span></span>
              <div className="sub-lista">{subs.map((x, i) => (
                <div key={i} className={`sub-fila ${x.ok ? 'ok' : ''}`}>
                  <input type="checkbox" checked={x.ok} aria-label="Lista" onChange={e => setSubs(s => s.map((y, j) => (j === i ? { ...y, ok: e.target.checked } : y)))} />
                  <input className="sub-txt" value={x.t} aria-label="Subtarea" onChange={e => setSubs(s => s.map((y, j) => (j === i ? { ...y, t: e.target.value } : y)))} />
                  <button type="button" className="etq-x" title="Quitar" aria-label="Quitar" onClick={() => setSubs(s => s.filter((_, j) => j !== i))}>×</button></div>))}</div>
              <input placeholder="Agregar subtarea y presionar Enter (puedes pegar varias, una por línea)" autoComplete="off" value={subTxt} onChange={e => setSubTxt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); agregarSubs(subTxt); setSubTxt(''); } }}
                onPaste={e => { const t = e.clipboardData.getData('text'); if (/\n/.test(t.trim())) { e.preventDefault(); agregarSubs(t); setSubTxt(''); } }} /></div>
            <label className="todo">Depende de
              <div className="etq-input"><span>{depende.map((n, i) => { const d = doc.actividades.find(x => x.id === n); return (
                <span key={n} className={`dep ${d && cerrada(d) ? 'ok' : 'bloq'}`} title={d ? `${nomCorto(d)} (${EST(d)})` : ''}>#{n}{d ? ' ' + nomCorto(d).slice(0, 32) : ''}
                  <button type="button" className="etq-x" aria-label={`Quitar #${n}`} onClick={() => setDepende(depende.filter((_, j) => j !== i))}>×</button></span>); })}</span>
                <input list="listaActs" placeholder="Escribe #número o el nombre de la actividad y presiona Enter" autoComplete="off" value={depTxt} onChange={e => setDepTxt(e.target.value)}
                  onKeyDown={e => { if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === ',') { e.preventDefault(); e.stopPropagation(); agregarDep(); } else if (e.key === 'Backspace' && !depTxt && depende.length) setDepende(depende.slice(0, -1)); }}
                  onBlur={() => { if (/^#\d+ /.test(depTxt)) agregarDep(); }} /></div>
              <span className="nota-dep">{quienesDependen.length ? `De esta actividad dependen: ${quienesDependen.map(x => '#' + x.id + ' ' + nomCorto(x)).join(', ')}` : ''}</span></label>
            <label className="todo">Etiquetas
              <div className="etq-input"><span>{etiquetas.map((t, i) => (
                <span key={t} className={`etq etq-${colorEtq(t, doc.coloresEtq)}`}>{t}<button type="button" className="etq-x" aria-label={`Quitar ${t}`} onClick={() => setEtiquetas(etiquetas.filter((_, j) => j !== i))}>×</button></span>))}</span>
                <input list="listaEtq" placeholder="Escribe una etiqueta y presiona Enter" autoComplete="off" value={etqTxt} onChange={e => setEtqTxt(e.target.value)}
                  onKeyDown={e => { if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === ',') { e.preventDefault(); e.stopPropagation(); agregarEtq(); } else if (e.key === 'Backspace' && !etqTxt && etiquetas.length) setEtiquetas(etiquetas.slice(0, -1)); }}
                  onBlur={() => { if (todasE.some(t => normaliza(t) === normaliza(etqTxt))) agregarEtq(); }} /></div></label>
          </div>
          <div className="pie">
            <span className="ayuda">* Obligatorio · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> para guardar</span>
            <div className="barra">
              {a && <button type="button" className="peligro" onClick={() => onEliminar(a.id)}><Ico n="basura" /> Eliminar</button>}
              {a && <button type="button" onClick={() => onNotas(a.id)}><Ico n="nota" /> {nNotas ? `Notas (${nNotas})` : 'Notas'}</button>}
              {a && <button type="button" onClick={() => onImagenes(a.id)}><Ico n="imagen" /> {nImgs ? `Imágenes (${nImgs})` : 'Imágenes'}</button>}
              {a && <button type="button" onClick={() => onHistorial(a.id)}><Ico n="reloj" /> Historial</button>}
              <button type="button" onClick={onCerrar}><Ico n="x" /> Cancelar</button>
              {!a && <button type="submit" id="btnOtra"><Ico n="mas" /> Guardar y agregar otra</button>}
              <button type="submit" className="prim" id="btnGuardarForm"><Ico n="check" /> Guardar</button>
            </div>
          </div>
        </form>
        <datalist id="listaNeg">{negocios.map(n => <option key={n} value={n} />)}</datalist>
        <datalist id="listaResp">{responsables.map(r => <option key={r} value={r} />)}</datalist>
        <datalist id="listaEtq">{todasE.map(t => <option key={t} value={t} />)}</datalist>
        <datalist id="listaActs">{otras.map(x => <option key={x.id} value={`#${x.id} ${nomCorto(x).slice(0, 60)}`} />)}</datalist>
      </dialog>
      {varias && (
        <dialog ref={el => { if (el && !el.open) el.showModal(); }} onClose={() => setVarias(null)}>
          <h2>El texto tiene {varias.lineas.length} líneas</h2>
          <p>{a ? '¿Es una sola actividad, o quieres dividirla? La primera línea reemplaza a la actividad que editas y el resto se agregan nuevas' : '¿Es una sola actividad con varias líneas, o son varias actividades?'} (negocio: {f.negocio.trim()}{f.responsable.trim() ? `, responsable: ${f.responsable.trim()}` : ''}).</p>
          <ol>{varias.lineas.map((l, i) => <li key={i}>{l}</li>)}</ol>
          <div className="barra">
            <button type="button" onClick={() => setVarias(null)}>Cancelar</button>
            <button type="button" onClick={() => guardar(varias.seguir, 'una')}>Es una sola</button>
            <button type="button" className="prim" autoFocus onClick={() => guardar(varias.seguir, 'varias')}>Son {varias.lineas.length} actividades</button>
          </div>
        </dialog>
      )}
    </>
  );
}
export { negocioDe };
