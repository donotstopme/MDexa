import { useState } from 'react';
import { SIN_NEGOCIO, infoRenombrarNegocio, unicos, type Documento } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Renombrar un negocio en todas sus actividades (si el nombre ya existe, se juntan) */
export function DialogoRenombrar({ doc, inicial, onRenombrar, onCerrar }: { doc: Documento; inicial?: string; onRenombrar(viejo: string, nuevo: string): void; onCerrar(): void }) {
  const negs = unicos(doc.actividades.map(a => a.negocio)).filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')), sin = doc.actividades.some(a => !a.negocio);
  const ini = inicial === SIN_NEGOCIO ? '' : (inicial ?? negs[0] ?? '');
  const [viejo, setViejo] = useState(ini), [nuevo, setNuevo] = useState(ini);
  const i = infoRenombrarNegocio(doc, viejo, nuevo), nu = nuevo.trim();
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={e => { e.preventDefault(); if (nu && nu !== viejo) { onRenombrar(viejo, nu); onCerrar(); } }}>
        <h2><Ico n="tienda" t={20} /> Renombrar negocio</h2>
        <div className="grid">
          <label>Negocio<select value={viejo} onChange={e => setViejo(e.target.value)}>{negs.map(n => <option key={n} value={n}>{n}</option>)}{sin && <option value="">{SIN_NEGOCIO}</option>}</select></label>
          <label>Nuevo nombre<input list="listaNegRen" autoComplete="off" autoFocus value={nuevo} onChange={e => setNuevo(e.target.value)} onFocus={e => e.target.select()} /></label>
          <datalist id="listaNegRen">{negs.map(n => <option key={n} value={n} />)}</datalist>
        </div>
        <p className="nd">{!nu ? 'Escribe el nuevo nombre.' : i.mismo ? 'Es el mismo nombre.' : i.existente
          ? <><Ico n="alerta" t={14} /> <b>{i.existente}</b> ya existe: {pl(i.n, 'actividad se juntará', 'actividades se juntarán')} con sus {pl(i.m, 'actividad', 'actividades')}.</>
          : `Se cambiará el negocio de ${pl(i.n, 'actividad', 'actividades')}.`}</p>
        <div className="pie"><span className="ayuda">Se puede deshacer con Ctrl+Z</span>
          <div className="barra"><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="prim" disabled={!nu || i.mismo}><Ico n="check" /> {i.existente ? 'Juntar' : 'Renombrar'}</button></div></div>
      </form>
    </Dialogo>
  );
}
