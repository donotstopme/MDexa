import { useEffect, useRef, useState } from 'react';
import {
  EST, colorAutor, iniciales, insertarMencion, mencionaA, mencionesEn, negocioDe, nomCorto, notasDe, personasConocidas, sugerirMencion, claveNota,
  type Documento, type Nota,
} from '@mdexa/core';
import { Ico } from '../original/iconos';
import { colorEstado, fmtHora, haceLargo } from '../original/piezas';
import { Dialogo } from './Dialogo';

function TextoConMenciones({ n, personas, usuario }: { n: Nota; personas: string[]; usuario: string }) {
  const chars = [...n.texto], out: React.ReactNode[] = []; let pos = 0;
  mencionesEn(n.texto, personas).forEach((m, k) => {
    out.push(chars.slice(pos, m.i).join(''));
    const yo = usuario && m.nombre.toLowerCase() === usuario.toLowerCase();
    out.push(<span key={k} className={`mencion ${yo ? 'yo' : ''}`} title={yo ? 'Te mencionaron a ti' : 'Mención a ' + m.nombre}>{chars.slice(m.i, m.i + m.len).join('')}</span>);
    pos = m.i + m.len;
  });
  out.push(chars.slice(pos).join(''));
  return <>{out}</>;
}

/** Ventana de notas de una actividad: conversación, @menciones con autocompletar, y nota nueva */
export function DialogoNotas({ doc, id, usuario, escritura, nuevas, onAgregar, onBorrar, onCerrar }: {
  doc: Documento; id: number; usuario: string; escritura: { ok: boolean; msg: string }; nuevas: Set<string>;
  onAgregar(texto: string): Promise<boolean>; onBorrar(n: Nota): void; onCerrar(): void;
}) {
  const a = doc.actividades.find(x => x.id === id);
  const [texto, setTexto] = useState('');
  const [sug, setSug] = useState<{ ini: number; lista: string[]; sel: number } | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null), lista = useRef<HTMLDivElement>(null);
  const notas = notasDe(doc, id), personas = personasConocidas(doc, usuario);
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight; }, [notas.length]);
  if (!a) return null;
  const est = EST(a);

  const revisarSug = (t: string, cursor: number) => { const s = sugerirMencion(t, cursor, personas); setSug(s ? { ...s, sel: 0 } : null); };
  const elegir = (nombre: string) => {
    if (!sug || !ta.current) return;
    const r = insertarMencion(texto, sug.ini, ta.current.selectionStart, nombre);
    setTexto(r.texto); setSug(null);
    setTimeout(() => { ta.current?.setSelectionRange(r.cursor, r.cursor); ta.current?.focus(); }, 0);
  };
  const agregar = async () => {
    if (!texto.trim() || ocupado) return;
    setOcupado(true);
    const ok = await onAgregar(texto);
    setOcupado(false);
    if (ok) { setTexto(''); setSug(null); }
  };
  const tecla = (e: React.KeyboardEvent) => {
    if (sug) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setSug({ ...sug, sel: (sug.sel + (e.key === 'ArrowDown' ? 1 : -1) + sug.lista.length) % sug.lista.length }); return; }
      if ((e.key === 'Enter' && !e.ctrlKey && !e.metaKey) || e.key === 'Tab') { e.preventDefault(); elegir(sug.lista[sug.sel]); return; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setSug(null); return; }
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void agregar(); }
  };

  return (
    <Dialogo onCerrar={onCerrar}>
      <h2><Ico n="nota" t={20} /> {nomCorto(a)}</h2>
      <p>{negocioDe(a)} · <span className={`es-${colorEstado(est)}`}>{est}</span>{a.responsable ? ' · ' + a.responsable : ''} · {notas.length} {notas.length === 1 ? 'nota' : 'notas'}</p>
      <div className="notas-lista" ref={lista}>
        {notas.length ? notas.map(n => {
          const mia = n.autor === usuario;
          return (
            <div key={claveNota(n)} className={`nota ${mia ? 'mia' : ''}`}>
              <span className="avatar" style={{ '--h': colorAutor(n.autor) } as React.CSSProperties} title={n.autor}>{iniciales(n.autor) || '?'}</span>
              <div className="nota-cuerpo">
                <div className="nota-cab"><b>{n.autor}</b><span className="nd" title={fmtHora(n.fecha)}>{haceLargo(n.fecha)}</span>
                  {nuevas.has(claveNota(n)) && <span className="nov-mark nueva">Nueva</span>}
                  {mia && escritura.ok && <button className="ico-btn peligro nota-borrar" title="Eliminar mi nota" aria-label="Eliminar mi nota" onClick={() => onBorrar(n)}><Ico n="basura" t={13} /></button>}</div>
                <div className={`nota-txt ${mencionaA(n, usuario, personas) && n.autor !== usuario ? 'me-mencionan' : ''}`}><TextoConMenciones n={n} personas={personas} usuario={usuario} /></div>
              </div>
            </div>
          );
        }) : <div className="vacio"><Ico n="nota" t={24} /><p>Aún no hay notas en esta actividad.</p></div>}
      </div>
      <div className="nota-nueva">
        <div className="men-wrap">
          <textarea ref={ta} rows={3} value={texto} disabled={!escritura.ok} autoFocus
            placeholder={escritura.ok ? `Escribe una nota${usuario ? ` como ${usuario}` : ''}… Usa @ para mencionar a alguien. (Ctrl+Enter para agregar)` : 'No se pueden agregar notas en este momento'}
            onChange={e => { setTexto(e.target.value); revisarSug(e.target.value, e.target.selectionStart); }} onKeyDown={tecla} onClick={e => revisarSug(texto, (e.target as HTMLTextAreaElement).selectionStart)}
            onBlur={() => setTimeout(() => setSug(null), 150)} />
          {sug && (
            <div className="men-sug" role="listbox" aria-label="Personas">
              <div className="men-tit">Mencionar a…</div>
              {sug.lista.map((p, i) => (
                <button key={p} type="button" role="option" className={i === sug.sel ? 'sel' : ''} onMouseDown={e => { e.preventDefault(); elegir(p); }}>
                  <span className="avatar" style={{ '--h': colorAutor(p) } as React.CSSProperties}>{iniciales(p)}</span>{p}{p === usuario && <span className="nd"> (tú)</span>}</button>
              ))}
            </div>
          )}
        </div>
        <div className="pie">
          <span className="ayuda"><Ico n={escritura.ok ? 'check' : 'candado'} t={13} /> {escritura.msg}</span>
          <div className="barra"><button type="button" onClick={onCerrar}>Cerrar</button>
            <button type="button" className="prim" disabled={!escritura.ok || ocupado || !texto.trim()} onClick={() => void agregar()}>Agregar nota</button></div>
        </div>
      </div>
    </Dialogo>
  );
}
