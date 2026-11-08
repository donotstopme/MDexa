import { useEffect, useRef, useState } from 'react';
import { COLORES_ETQ, colorEtq, limpiaEtq, normaliza, tieneEtq, todasEtq, type ColorEtiqueta, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { EtqPill } from '../original/piezas';
import { PopFlotante } from './PopFlotante';

/** Etiquetas de una o varias actividades: marcar/quitar, crear y cambiar colores (el color vale para todos) */
export function PopEtiquetas({ doc, ids, ancla, onPoner, onColor, onCerrar, onAdministrar }: {
  doc: Documento; ids: number[]; ancla: HTMLElement; onPoner(t: string, poner: boolean): void; onColor(t: string, c: ColorEtiqueta): void; onCerrar(): void; onAdministrar?(): void;
}) {
  const [q, setQ] = useState('');
  const [colorDe, setColorDe] = useState('');
  const buscar = useRef<HTMLInputElement>(null);
  useEffect(() => { buscar.current?.focus(); }, []);
  const acts = doc.actividades.filter(a => ids.includes(a.id)), todas = todasEtq(doc.actividades), nueva = limpiaEtq(q);
  const lista = todas.filter(t => !q.trim() || normaliza(t).includes(normaliza(q)));
  const existe = todas.some(t => normaliza(t) === normaliza(nueva));
  if (!acts.length) return null;
  return (
    <PopFlotante ancla={ancla} className="etq-pop" onCerrar={onCerrar} etiqueta="Etiquetas">
      <div className="etq-pop-cab"><span>{acts.length === 1 ? `Etiquetas de #${acts[0].id}` : `Etiquetas de ${acts.length} actividades`}</span></div>
      <input ref={buscar} placeholder="Buscar o crear etiqueta…" autoComplete="off" value={q} onChange={e => setQ(e.target.value)}
        onKeyDown={e => { if (e.key !== 'Enter') return; e.preventDefault(); const t = limpiaEtq(q); if (!t) return; setQ(''); onPoner(t, !acts.every(a => tieneEtq(a, t))); }} />
      <div className="etq-lista">
        {lista.map(t => {
          const n = acts.filter(a => tieneEtq(a, t)).length, col = colorEtq(t, doc.coloresEtq);
          return (
            <div key={t}>
              <div className="etq-fila">
                <label><input type="checkbox" checked={n === acts.length} ref={el => { if (el) el.indeterminate = n > 0 && n < acts.length; }} onChange={e => onPoner(t, e.target.checked)} /><EtqPill t={t} doc={doc} /></label>
                <button type="button" className={`etq-col etq-${col}`} title={`Cambiar el color de «${t}»`} aria-label="Cambiar color" onClick={() => setColorDe(colorDe === normaliza(t) ? '' : normaliza(t))} />
              </div>
              {colorDe === normaliza(t) && <div className="etq-paleta">{(Object.entries(COLORES_ETQ) as [ColorEtiqueta, string][]).map(([c, nom]) => (
                <button key={c} type="button" className={`etq-col etq-${c} ${c === col ? 'on' : ''}`} title={nom} aria-label={nom} onClick={() => { onColor(t, c); setColorDe(''); }} />))}</div>}
            </div>
          );
        })}
        {nueva && !existe && <button type="button" className="etq-crear" onClick={() => { setQ(''); onPoner(nueva, true); buscar.current?.focus(); }}><Ico n="mas" t={14} /> Crear <span className={`etq etq-${colorEtq(nueva, doc.coloresEtq)}`}>{nueva}</span></button>}
        {!lista.length && (!nueva || existe) && <div className="nd" style={{ padding: '6px 4px' }}>Aún no hay etiquetas. Escribe una para crearla.</div>}
      </div>
      <p className="etq-ayuda">Marca para poner o quitar · <span className="etq-ayuda-c">●</span> cambia el color para todos{onAdministrar && <> · <a href="#" onClick={e => { e.preventDefault(); onCerrar(); onAdministrar(); }}>Administrar etiquetas…</a></>}</p>
    </PopFlotante>
  );
}
