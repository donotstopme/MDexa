import { useState } from 'react';
import { COLORES_ETQ, actividadesConEtiqueta, colorEtq, normaliza, todasEtq, type ColorEtiqueta, type Documento } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

function Nombre({ t, editable, onRenombrar }: { t: string; editable: boolean; onRenombrar(nuevo: string): void }) {
  const [v, setV] = useState(t), [ant, setAnt] = useState(t);
  if (t !== ant) { setAnt(t); setV(t); }
  return <input className="etq-adm-nom" value={v} disabled={!editable} maxLength={30} aria-label="Nombre de la etiqueta" onChange={e => setV(e.target.value)}
    onBlur={() => { if (editable && v.trim() !== t) onRenombrar(v); }} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { e.stopPropagation(); setV(t); (e.target as HTMLInputElement).blur(); } }} />;
}

/** Renombrar, recolorear o borrar etiquetas de todas las actividades */
export function DialogoEtiquetasAdmin({ doc, editando, onRenombrar, onColor, onBorrar, onCerrar }: {
  doc: Documento; editando: boolean; onRenombrar(viejo: string, nuevo: string): void; onColor(t: string, c: ColorEtiqueta): void; onBorrar(t: string): void; onCerrar(): void;
}) {
  const [colorDe, setColorDe] = useState('');
  const l = todasEtq(doc.actividades);
  return (
    <Dialogo onCerrar={onCerrar}>
      <h2><Ico n="etiqueta" t={20} /> Administrar etiquetas</h2>
      <p className="nd">{l.length ? `${pl(l.length, 'etiqueta', 'etiquetas')} en uso. Los cambios se aplican en todas las actividades.` : ''}</p>
      <div className="etq-adm">
        {l.length ? l.map(t => {
          const n = actividadesConEtiqueta(doc, t), col = colorEtq(t, doc.coloresEtq), k = normaliza(t);
          return (
            <div key={t}>
              <div className="etq-adm-fila">
                <button type="button" className={`etq-col etq-${col}`} disabled={!editando} title="Cambiar color" aria-label="Cambiar color" onClick={() => setColorDe(colorDe === k ? '' : k)} />
                <Nombre t={t} editable={editando} onRenombrar={nuevo => onRenombrar(t, nuevo)} />
                <span className={`etq etq-${col}`}>{t}</span><span className="nd">{pl(n, 'actividad', 'actividades')}</span>
                <button type="button" className="ico-btn peligro" disabled={!editando} title="Quitar de todas las actividades" aria-label="Borrar" onClick={() => onBorrar(t)}><Ico n="basura" t={14} /></button>
              </div>
              {colorDe === k && <div className="etq-paleta">{(Object.entries(COLORES_ETQ) as [ColorEtiqueta, string][]).map(([c, nom]) => (
                <button key={c} type="button" className={`etq-col etq-${c} ${c === col ? 'on' : ''}`} title={nom} aria-label={nom} onClick={() => { onColor(t, c); setColorDe(''); }} />))}</div>}
            </div>
          );
        }) : <div className="vacio"><Ico n="etiqueta" t={24} /><p>Aún no hay etiquetas.</p></div>}
      </div>
      <div className="pie"><span className="ayuda">{editando ? <><Ico n="check" t={13} /> Escribe el nuevo nombre y presiona Enter. Si ya existe, se juntan. Se puede deshacer con Ctrl+Z.</> : <><Ico n="candado" t={13} /> Toma el archivo para editar las etiquetas.</>}</span>
        <div className="barra"><button type="button" onClick={onCerrar}>Cerrar</button></div></div>
    </Dialogo>
  );
}
