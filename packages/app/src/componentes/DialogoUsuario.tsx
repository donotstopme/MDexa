import { useState } from 'react';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

/** Pide el nombre de quien edita (reemplaza a window.prompt, que no existe en Electron) */
export function DialogoUsuario({ inicial, onListo }: { inicial: string; onListo(nombre: string | null): void }) {
  const [v, setV] = useState(inicial);
  return (
    <Dialogo onCerrar={() => onListo(null)}>
      <form noValidate onSubmit={e => { e.preventDefault(); if (v.trim()) onListo(v.trim()); }}>
        <h2><Ico n="usuario" t={20} /> ¿Cómo te llamas?</h2>
        <p>Tu nombre se usa para marcar quién está editando el archivo y quién hizo cada cambio.</p>
        <div className="grid"><label className="todo">Tu nombre<input autoFocus value={v} placeholder="Nombre y apellido" onChange={e => setV(e.target.value)} /></label></div>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={() => onListo(null)}>Cancelar</button><button type="submit" className="prim" disabled={!v.trim()}><Ico n="check" /> Guardar</button></div></div>
      </form>
    </Dialogo>
  );
}
