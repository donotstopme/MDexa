import { useState } from 'react';
import { unicos, type CambioFechas, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

export type TipoMasivo = 'responsable' | 'negocio' | 'fechas';
export type CambioMasivo = { tipo: 'responsable'; valor: string } | { tipo: 'negocio'; valor: string } | { tipo: 'fechas'; cambio: CambioFechas };
const TITULOS = { responsable: 'Cambiar responsable', negocio: 'Mover a otro negocio', fechas: 'Cambiar fechas' } as const;
const ICONOS = { responsable: 'usuario', negocio: 'tienda', fechas: 'calendario' } as const;

/** Cambio de responsable, negocio o fechas para varias actividades a la vez */
export function DialogoMasivo({ doc, tipo, n, onAplicar, onCerrar }: { doc: Documento; tipo: TipoMasivo; n: number; onAplicar(c: CambioMasivo): void; onCerrar(): void }) {
  const [resp, setResp] = useState(''), [sinResp, setSinResp] = useState(false), [neg, setNeg] = useState('');
  const [op, setOp] = useState<'mover' | 'ini' | 'fin' | 'quitar'>('mover'), [dias, setDias] = useState('7'), [ini, setIni] = useState(''), [fin, setFin] = useState('');
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (tipo === 'responsable') {
      if (!sinResp && !resp.trim()) { window.alert('Escribe el nombre del responsable, o marca "Dejarlas sin responsable".'); return; }
      onAplicar({ tipo, valor: sinResp ? '' : resp.trim() });
    } else if (tipo === 'negocio') {
      if (!neg.trim()) { window.alert('El negocio es obligatorio.'); return; }
      onAplicar({ tipo, valor: neg.trim() });
    } else if (op === 'mover') {
      const d = parseInt(dias, 10); if (!d) { window.alert('Escribe cuántos días mover (por ejemplo 7 o -3).'); return; }
      onAplicar({ tipo, cambio: { op: 'mover', dias: d } });
    } else if (op === 'ini') { if (!ini) { window.alert('Elige la fecha de inicio.'); return; } onAplicar({ tipo, cambio: { op: 'ini', fecha: ini } }); }
    else if (op === 'fin') { if (!fin) { window.alert('Elige la fecha fin.'); return; } onAplicar({ tipo, cambio: { op: 'fin', fecha: fin } }); }
    else onAplicar({ tipo, cambio: { op: 'quitar' } });
  };
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={enviar}>
        <h2><Ico n={ICONOS[tipo]} t={20} /> {TITULOS[tipo]}</h2>
        <p>Se aplicará a {n} {n === 1 ? 'actividad seleccionada' : 'actividades seleccionadas'}.</p>
        <div className="grid">
          {tipo === 'responsable' && <>
            <label className="todo">Nuevo responsable<input list="listaRespMas" placeholder="Elige uno o escribe uno nuevo" autoFocus value={resp} onChange={e => setResp(e.target.value)} /></label>
            <datalist id="listaRespMas">{unicos(doc.actividades.map(a => a.responsable)).map(x => <option key={x} value={x} />)}</datalist>
            <label className="check todo"><input type="checkbox" checked={sinResp} onChange={e => setSinResp(e.target.checked)} /> Dejarlas sin responsable</label></>}
          {tipo === 'negocio' && <>
            <label className="todo"><span>Negocio <b>*</b></span><input list="listaNegMas" placeholder="Ej. Tienda Centro" autoFocus value={neg} onChange={e => setNeg(e.target.value)} /></label>
            <datalist id="listaNegMas">{unicos(doc.actividades.map(a => a.negocio)).map(x => <option key={x} value={x} />)}</datalist></>}
          {tipo === 'fechas' && (
            <div className="todo m-opciones">
              <label className="check"><input type="radio" name="mF" checked={op === 'mover'} onChange={() => setOp('mover')} /> Mover las fechas
                <input type="number" value={dias} style={{ width: 80, margin: '0 6px' }} onFocus={() => setOp('mover')} onChange={e => setDias(e.target.value)} /> días <span className="nd">(negativo para adelantar)</span></label>
              <label className="check"><input type="radio" name="mF" checked={op === 'ini'} onChange={() => setOp('ini')} /> Fijar fecha de inicio <input type="date" value={ini} style={{ width: 'auto', marginLeft: 6 }} onFocus={() => setOp('ini')} onChange={e => setIni(e.target.value)} /></label>
              <label className="check"><input type="radio" name="mF" checked={op === 'fin'} onChange={() => setOp('fin')} /> Fijar fecha fin <input type="date" value={fin} style={{ width: 'auto', marginLeft: 6 }} onFocus={() => setOp('fin')} onChange={e => setFin(e.target.value)} /></label>
              <label className="check"><input type="radio" name="mF" checked={op === 'quitar'} onChange={() => setOp('quitar')} /> Quitar fechas de inicio y fin</label>
            </div>)}
        </div>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="prim"><Ico n="check" /> Aplicar</button></div></div>
      </form>
    </Dialogo>
  );
}
