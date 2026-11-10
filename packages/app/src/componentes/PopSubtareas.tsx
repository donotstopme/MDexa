import { useEffect, useRef, useState } from 'react';
import { avanceSubs, cerrada, limpiaSub, nomCorto, subtareasDe, type Documento, type Subtarea } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { PopFlotante } from './PopFlotante';

/** Subtareas de una actividad en una ventana flotante: marcar, editar, quitar, agregar (pegando varias) */
export function PopSubtareas({ doc, id, ancla, escritura, editando, onCambiar, onTerminar, onCerrar }: {
  doc: Documento; id: number; ancla: HTMLElement; escritura: { ok: boolean; msg: string }; editando: boolean;
  onCambiar(fn: (l: Subtarea[]) => Subtarea[], aviso?: string): Promise<boolean>; onTerminar(): void; onCerrar(): void;
}) {
  const a = doc.actividades.find(x => x.id === id);
  const [nueva, setNueva] = useState('');
  const [edit, setEdit] = useState(-1);
  const [txt, setTxt] = useState('');
  const campo = useRef<HTMLInputElement>(null), editor = useRef<HTMLInputElement>(null);
  useEffect(() => { if (a && escritura.ok && !subtareasDe(a).length) campo.current?.focus(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (edit >= 0) { editor.current?.focus(); editor.current?.select(); } }, [edit]);
  if (!a) return null;
  const l = subtareasDe(a), { h, n } = avanceSubs(a), ok = escritura.ok;

  const agregar = async (texto: string) => {
    const nuevas = texto.split(/\r?\n/).map(t => limpiaSub(t.replace(/^\s*([-*•]|\[[ xX]?\]|\d+[.)])\s*/, ''))).filter(Boolean);
    if (!nuevas.length) return;
    setNueva('');
    await onCambiar(x => [...x, ...nuevas.map(t => ({ t, ok: false }))], nuevas.length > 1 ? `${nuevas.length} subtareas agregadas` : '');
    campo.current?.focus();
  };
  const guardarEdicion = () => {
    const i = edit; if (i < 0) return;
    const v = limpiaSub(txt); setEdit(-1);
    if (!v) { void onCambiar(x => x.filter((_, k) => k !== i)); return; }
    if (v !== l[i]?.t) void onCambiar(x => x.map((y, k) => (k === i ? { ...y, t: v } : y)));
  };

  return (
    <PopFlotante ancla={ancla} className="etq-pop sub-pop" onCerrar={onCerrar} etiqueta="Subtareas">
      <div className="etq-pop-cab sub-cab"><span>Subtareas de #{a.id} {nomCorto(a).slice(0, 40)}</span><span>{n ? `${h}/${n}` : ''}</span></div>
      <div className="sub-bar grande"><i style={{ width: n ? `${Math.round(h / n * 100)}%` : 0 }} /></div>
      <div className="sub-lista">
        {l.length ? l.map((x, i) => (
          <div key={i} className={`sub-fila ${x.ok ? 'ok' : ''}`}>
            <input type="checkbox" checked={x.ok} disabled={!ok} aria-label="Lista" onChange={e => void onCambiar(y => y.map((z, k) => (k === i ? { ...z, ok: e.target.checked } : z)))} />
            {edit === i
              ? <input ref={editor} className="sub-txt" value={txt} onChange={e => setTxt(e.target.value)} onBlur={guardarEdicion}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); guardarEdicion(); } if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setEdit(-1); } }} />
              : <span className="sub-t" title={ok ? 'Clic para editar' : ''} onClick={() => { if (ok) { setEdit(i); setTxt(x.t); } }}>{x.t}</span>}
            {ok && <button type="button" className="etq-x" title="Quitar" aria-label="Quitar" onClick={() => { setEdit(-1); void onCambiar(y => y.filter((_, k) => k !== i)); }}>×</button>}
          </div>
        )) : <div className="nd" style={{ padding: '6px 4px' }}>Aún no hay subtareas. Escribe una abajo y presiona Enter.</div>}
      </div>
      {ok && <input ref={campo} placeholder="Agregar subtarea…" autoComplete="off" value={nueva} onChange={e => setNueva(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void agregar(nueva); } }}
        onPaste={e => { const t = e.clipboardData.getData('text'); if (/\n/.test(t.trim())) { e.preventDefault(); void agregar(t); } }} />}
      <div className="sub-pie">
        {n > 0 && h === n && !cerrada(a) && ok && <button type="button" className="prim" onClick={onTerminar}><Ico n="check" t={14} /> Todo listo: marcar #{a.id} como Terminado</button>}
        <span className="etq-ayuda">{ok ? (editando ? 'Se guarda al momento' : 'Se guarda directo en el archivo, sin tomarlo') + ' · puedes pegar varias, una por línea' : escritura.msg.replace(/notas/g, 'subtareas')}</span>
      </div>
    </PopFlotante>
  );
}
