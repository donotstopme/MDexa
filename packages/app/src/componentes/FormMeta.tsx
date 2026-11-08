import { useEffect, useRef, useState } from 'react';
import { Ico } from '../original/iconos';

export function FormMeta({ meta, onCerrar, onGuardar }: { meta: { proyecto: string; inicio: string; fin: string }; onCerrar(): void; onGuardar(r: { proyecto: string; inicio: string; fin: string }): void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [f, setF] = useState({ proyecto: meta.proyecto, inicio: meta.inicio, fin: meta.fin });
  useEffect(() => { dlg.current?.showModal(); }, []);
  return (
    <dialog ref={dlg} onClose={onCerrar}>
      <form noValidate onSubmit={e => {
        e.preventDefault();
        if (!f.inicio || !f.fin) { window.alert('Las fechas de inicio y fin de la meta son obligatorias.'); return; }
        if (f.fin < f.inicio) { window.alert('La meta fin no puede ser anterior a la meta inicio.'); return; }
        onGuardar({ ...f, proyecto: f.proyecto.trim() }); onCerrar();
      }}>
        <h2><Ico n="bandera" t={20} /> Meta del proyecto</h2>
        <p>Periodo en el que se debe completar el desarrollo. Las fechas son obligatorias.</p>
        <div className="grid">
          <label className="todo">Nombre del proyecto<input placeholder="Opcional" value={f.proyecto} onChange={e => setF({ ...f, proyecto: e.target.value })} /></label>
          <label><span>Meta inicio <b>*</b></span><input type="date" value={f.inicio} autoFocus={!f.inicio} onChange={e => setF({ ...f, inicio: e.target.value })} /></label>
          <label><span>Meta fin <b>*</b></span><input type="date" value={f.fin} autoFocus={!!f.inicio} onChange={e => setF({ ...f, fin: e.target.value })} /></label>
        </div>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={onCerrar}><Ico n="x" /> Cancelar</button><button type="submit" className="prim"><Ico n="check" /> Guardar</button></div></div>
      </form>
    </dialog>
  );
}
