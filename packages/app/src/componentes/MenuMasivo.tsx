import { useState } from 'react';
import { ESTADOS, PRIORIDADES, TAMANOS, normaliza, unicos, type CambioFechas, type Documento, type Estado, type OpcionesCopia, type Prioridad, type Tamano } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { IcoPri, IcoTam, colorEstado } from '../original/piezas';
import { PopFlotante } from './PopFlotante';

export type TipoMasivo = 'estado' | 'prioridad' | 'tamano' | 'responsable' | 'negocio' | 'fechas' | 'duplicar';
export type CambioMasivo =
  | { tipo: 'estado'; valor: Estado } | { tipo: 'prioridad'; valor: Prioridad | '' } | { tipo: 'tamano'; valor: Tamano | '' }
  | { tipo: 'responsable'; valor: string } | { tipo: 'negocio'; valor: string } | { tipo: 'fechas'; cambio: CambioFechas } | { tipo: 'duplicar'; opciones: OpcionesCopia };
const TITULOS: Record<TipoMasivo, string> = { estado: 'Estado', prioridad: 'Prioridad', tamano: 'Tamaño', responsable: 'Responsable', negocio: 'Mover al negocio', fechas: 'Fechas', duplicar: 'Duplicar' };

/** Menú que se abre sobre la barra de selección múltiple: un clic aplica el cambio a todas */
export function MenuMasivo({ doc, ids, tipo, ancla, onAplicar, onCerrar }: {
  doc: Documento; ids: ReadonlySet<number>; tipo: TipoMasivo; ancla: HTMLElement; onAplicar(c: CambioMasivo): void; onCerrar(): void;
}) {
  const sel = doc.actividades.filter(a => ids.has(a.id));
  /** El valor que ya tienen todas las seleccionadas, para marcarlo */
  const comun = tipo === 'fechas' || tipo === 'duplicar' || !sel.length ? null : sel.every(a => (a[tipo] || '') === (sel[0]![tipo] || '')) ? sel[0]![tipo] || '' : null;
  const op = (valor: string, contenido: React.ReactNode, c: CambioMasivo) => (
    <button key={valor || '__sin'} type="button" className="ms-op" data-v={valor} onClick={() => onAplicar(c)}>{contenido}{comun === valor && <span className="ms-ok"><Ico n="check" t={14} /></span>}</button>
  );
  return (
    <PopFlotante ancla={ancla} className="ms-pop" onCerrar={onCerrar} etiqueta={TITULOS[tipo]}>
      <div className="ms-pop-tit">{TITULOS[tipo]} · {sel.length} {sel.length === 1 ? 'actividad' : 'actividades'}</div>
      {tipo === 'estado' && ESTADOS.map(e => op(e, <span className={`chip es-${colorEstado(e)}`}>{e}</span>, { tipo, valor: e }))}
      {tipo === 'prioridad' && <>
        {(Object.keys(PRIORIDADES) as Prioridad[]).map(p => op(p, <span className={`pri pri-${p}`}><IcoPri p={p} /><b>{p}</b></span>, { tipo, valor: p }))}
        {op('', <span className="nd">Sin prioridad</span>, { tipo, valor: '' })}</>}
      {tipo === 'tamano' && <>
        {(Object.keys(TAMANOS) as Tamano[]).map(t => op(t, <><span className={`tam tam-${t}`}><IcoTam t={t} /><b>{t}</b></span><span className="nd">{TAMANOS[t].txt}</span></>, { tipo, valor: t }))}
        {op('', <span className="nd">Sin tamaño</span>, { tipo, valor: '' })}</>}
      {(tipo === 'responsable' || tipo === 'negocio') && <Nombres tipo={tipo} lista={unicos(doc.actividades.map(a => a[tipo]))} comun={comun} onAplicar={onAplicar} />}
      {tipo === 'fechas' && <Fechas onAplicar={onAplicar} />}
      {tipo === 'duplicar' && <Duplicar n={sel.length} negocios={unicos(doc.actividades.map(a => a.negocio))} onAplicar={onAplicar} />}
    </PopFlotante>
  );
}

/** Lista de nombres existentes con buscador; lo que se escriba puede usarse como nombre nuevo */
function Nombres({ tipo, lista, comun, onAplicar }: { tipo: 'responsable' | 'negocio'; lista: string[]; comun: string | null; onAplicar(c: CambioMasivo): void }) {
  const [q, setQ] = useState('');
  const t = q.trim(), n = normaliza(t), igual = lista.find(x => normaliza(x) === n), vistos = lista.filter(x => !t || normaliza(x).includes(n));
  const usar = (valor: string) => onAplicar({ tipo, valor });
  return (
    <>
      <form noValidate onSubmit={e => { e.preventDefault(); if (t) usar(igual ?? vistos[0] ?? t); }}>
        <input autoFocus placeholder="Buscar o escribir uno nuevo…" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
      </form>
      <div className="ms-lista">
        {vistos.map(x => <button key={x} type="button" className="ms-op" data-v={x} onClick={() => usar(x)}><span>{x}</span>{comun === x && <span className="ms-ok"><Ico n="check" t={14} /></span>}</button>)}
        {!!t && !igual && <button type="button" className="ms-op ms-nuevo" onClick={() => usar(t)}><Ico n="mas" t={14} /> <span>Usar «{t}»</span></button>}
        {tipo === 'responsable' && !t && <button type="button" className="ms-op" data-v="" onClick={() => usar('')}><span className="nd">Sin responsable</span>{comun === '' && <span className="ms-ok"><Ico n="check" t={14} /></span>}</button>}
      </div>
    </>
  );
}

function Fechas({ onAplicar }: { onAplicar(c: CambioMasivo): void }) {
  const [dias, setDias] = useState('7'), [ini, setIni] = useState(''), [fin, setFin] = useState('');
  const fila = (titulo: string, campo: React.ReactNode, boton: string, enviar: () => void) => (
    <form className="ms-fecha" noValidate onSubmit={e => { e.preventDefault(); enviar(); }}><span>{titulo}</span>{campo}<button type="submit">{boton}</button></form>
  );
  const aplicar = (cambio: CambioFechas) => onAplicar({ tipo: 'fechas', cambio });
  return (
    <>
      {fila('Mover', <><input autoFocus type="number" aria-label="Días a mover" value={dias} onChange={e => setDias(e.target.value)} /> <span className="nd">días</span></>, 'Mover', () => {
        const d = parseInt(dias, 10); if (!d) window.alert('Escribe cuántos días mover (por ejemplo 7 o -3).'); else aplicar({ op: 'mover', dias: d }); })}
      <div className="ms-ayuda">Un número negativo adelanta las fechas.</div>
      {fila('Inicio', <input type="date" aria-label="Fecha de inicio" value={ini} onChange={e => setIni(e.target.value)} />, 'Fijar', () => { if (!ini) window.alert('Elige la fecha de inicio.'); else aplicar({ op: 'ini', fecha: ini }); })}
      {fila('Fin', <input type="date" aria-label="Fecha fin" value={fin} onChange={e => setFin(e.target.value)} />, 'Fijar', () => { if (!fin) window.alert('Elige la fecha fin.'); else aplicar({ op: 'fin', fecha: fin }); })}
      <button type="button" className="ms-op" onClick={() => aplicar({ op: 'quitar' })}><span className="nd">Quitar fechas de inicio y fin</span></button>
    </>
  );
}

function Duplicar({ n, negocios, onAplicar }: { n: number; negocios: string[]; onAplicar(c: CambioMasivo): void }) {
  const [mismo, setMismo] = useState(true), [destinos, setDestinos] = useState<string[]>([]), [dias, setDias] = useState('0'), [estado, setEstado] = useState<Estado>('Planeado');
  const total = n * (mismo ? 1 : destinos.length);
  return (
    <form className="ms-dup" noValidate onSubmit={e => { e.preventDefault(); if (total) onAplicar({ tipo: 'duplicar', opciones: { negocios: mismo ? null : negocios.filter(x => destinos.includes(x)), dias: parseInt(dias, 10) || 0, estado } }); }}>
      <div className="ms-dup-tit">Negocio destino</div>
      <label className="ms-dup-op"><input type="radio" name="dupNeg" checked={mismo} onChange={() => setMismo(true)} /> El mismo de cada una</label>
      <label className="ms-dup-op"><input type="radio" name="dupNeg" checked={!mismo} onChange={() => setMismo(false)} /> Estos:</label>
      <div className="ms-dup-negs">{negocios.map(x => <label key={x} className="ms-dup-op"><input type="checkbox" value={x} checked={destinos.includes(x)}
        onChange={e => { setMismo(false); setDestinos(l => (e.target.checked ? [...l, x] : l.filter(y => y !== x))); }} /> {x}</label>)}</div>
      <div className="ms-fecha"><span>Mover fechas</span><input type="number" aria-label="Días que se mueven las fechas" value={dias} onChange={e => setDias(e.target.value)} /> <span className="nd">días</span></div>
      <div className="ms-fecha"><span>Estado</span><select aria-label="Estado de las copias" value={estado} onChange={e => setEstado(e.target.value as Estado)}>{ESTADOS.map(x => <option key={x}>{x}</option>)}</select></div>
      <button type="submit" className="prim" disabled={!total}><Ico n="copiar" /> {total ? `Crear ${total} ${total === 1 ? 'copia' : 'copias'}` : 'Elige un negocio'}</button>
    </form>
  );
}
