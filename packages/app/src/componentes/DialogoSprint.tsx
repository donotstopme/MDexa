import { useMemo, useState } from 'react';
import { ESTADOS, EST, fechasSprintSugeridas, negocioDe, nombreSprintSugerido, seleccionSprint, unicos, type Documento, type OpcionesSprint } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { colorEstado } from '../original/piezas';
import { Dialogo } from './Dialogo';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Nuevo sprint: copia las actividades elegidas a un archivo nuevo (el actual no se modifica) */
export function DialogoSprint({ doc, archivo, hoy, onCrear, onCerrar }: { doc: Documento; archivo: string; hoy: string; onCrear(o: OpcionesSprint): void; onCerrar(): void }) {
  const fechas = fechasSprintSugeridas(doc.meta, hoy), negocios = useMemo(() => unicos(doc.actividades.map(negocioDe)), [doc]);
  const [nombre, setNombre] = useState(nombreSprintSugerido(doc.meta.proyecto, archivo)), [inicio, setInicio] = useState(fechas.inicio), [fin, setFin] = useState(fechas.fin);
  const [estados, setEstados] = useState<string[]>(['Backlog', 'Planeado', 'En progreso']), [negs, setNegs] = useState<string[]>(negocios);
  const [notas, setNotas] = useState(true), [quitarFechas, setQuitarFechas] = useState(false), [reiniciar, setReiniciar] = useState(false);
  const o: OpcionesSprint = { nombre: nombre.trim(), inicio, fin, estados, negocios: negs, notas, quitarFechas, reiniciar };
  const l = seleccionSprint(doc, o), nNotas = doc.notas.filter(x => l.some(a => a.id === x.act)).length;
  const alt = (lista: string[], v: string) => (lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v]);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inicio || !fin) { window.alert('Las fechas de inicio y fin de la meta son obligatorias.'); return; }
    if (fin < inicio) { window.alert('La meta fin no puede ser anterior a la meta inicio.'); return; }
    if (!l.length && !window.confirm('No elegiste ninguna actividad. ¿Crear el sprint vacío?')) return;
    onCrear(o);
  };
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={enviar}>
        <h2><Ico n="sprint" t={20} /> Nuevo sprint</h2>
        <p>Crea un archivo nuevo con las actividades que elijas de este. El archivo actual no se modifica.</p>
        <div className="grid">
          <label className="todo">Nombre del proyecto o sprint<input value={nombre} autoFocus onChange={e => setNombre(e.target.value)} /></label>
          <label><span>Meta inicio <b>*</b></span><input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></label>
          <label><span>Meta fin <b>*</b></span><input type="date" value={fin} onChange={e => setFin(e.target.value)} /></label>
        </div>
        <div className="s-sec"><div className="s-tit">Copiar las actividades en estado</div>
          <div className="s-checks">{ESTADOS.map(e => (
            <label key={e} className="check s-ck"><input type="checkbox" checked={estados.includes(e)} onChange={() => setEstados(alt(estados, e))} /><span className={`chip es-${colorEstado(e)}`}>{e}</span><span className="nd">{doc.actividades.filter(a => EST(a) === e).length}</span></label>))}</div></div>
        <div className="s-sec"><div className="s-tit">De los negocios <button type="button" className="s-todos" onClick={() => setNegs(negocios)}>Todos</button><button type="button" className="s-todos" onClick={() => setNegs([])}>Ninguno</button></div>
          <div className="s-checks">{negocios.map(n => (
            <label key={n} className="check s-ck"><input type="checkbox" checked={negs.includes(n)} onChange={() => setNegs(alt(negs, n))} />{n}<span className="nd">{doc.actividades.filter(a => negocioDe(a) === n).length}</span></label>))}</div></div>
        <div className="s-sec"><div className="s-tit">Opciones</div><div className="s-opc">
          <label className="check"><input type="checkbox" checked={notas} onChange={e => setNotas(e.target.checked)} /> Copiar sus notas</label>
          <label className="check"><input type="checkbox" checked={quitarFechas} onChange={e => setQuitarFechas(e.target.checked)} /> Quitar fechas de inicio y fin para volver a planearlas</label>
          <label className="check"><input type="checkbox" checked={reiniciar} onChange={e => setReiniciar(e.target.checked)} /> Regresar las "En progreso" a "Planeado"</label></div></div>
        <div className="s-resumen">{l.length
          ? <><Ico n="check" t={14} /> Se copiarán <b>{pl(l.length, 'actividad', 'actividades')}</b>{notas && nNotas > 0 && <> y <b>{pl(nNotas, 'nota', 'notas')}</b></>}. {ESTADOS.map(e => { const k = l.filter(a => EST(a) === e).length; return k ? <span key={e} className={`es-${colorEstado(e)}`}>{e}: {k} </span> : null; })}</>
          : <><Ico n="alerta" t={14} /> No se copiará ninguna actividad: el sprint empezará vacío.</>}</div>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="prim"><Ico n="sprint" /> Crear sprint</button></div></div>
      </form>
    </Dialogo>
  );
}
