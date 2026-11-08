import { useMemo, useRef, useState } from 'react';
import { CAMPOS_CSV, PLANTILLA_CSV, filasImportar, mapaInicial, parseCSV, unicos, type Documento, type FilaImp, type Mapa } from '@gestor/core';
import { Ico } from '../original/iconos';
import { ChipEstado, EtqPill, Fecha, PriBadge, TamBadge } from '../original/piezas';
import { Dialogo } from './Dialogo';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Importar desde Excel o CSV: elegir archivo o pegar celdas, mapear columnas, revisar y cargar */
export function DialogoImportar({ doc, editando, onImportar, onCerrar }: { doc: Documento; editando: boolean; onImportar(filas: FilaImp[], mapa: Mapa): void; onCerrar(): void }) {
  const [filas, setFilas] = useState<string[][] | null>(null);
  const [mapa, setMapa] = useState<Mapa>({});
  const [encab, setEncab] = useState(true), [modo, setModo] = useState<'agregar' | 'actualizar'>('agregar'), [negDef, setNegDef] = useState('');
  const [nombre, setNombre] = useState(''), [pegado, setPegado] = useState('');
  const archivo = useRef<HTMLInputElement>(null), t = useRef<ReturnType<typeof setTimeout>>();

  const cargar = (txt: string) => {
    const f = parseCSV(txt);
    if (!f.length) { window.alert('No se encontraron datos.'); return; }
    const r = mapaInicial(f); setFilas(f); setMapa(r.mapa); setEncab(r.conEncabezado);
  };
  const elegir = async (f: File) => {
    let txt = await f.text();
    if (/�/.test(txt)) { try { txt = new TextDecoder('windows-1252').decode(await f.arrayBuffer()); } catch { /* se deja como está */ } }   // CSV de Excel sin UTF-8
    setNombre(f.name); setPegado(''); cargar(txt);
  };
  const previa = useMemo(() => (filas ? filasImportar(doc, filas, mapa, { encabezado: encab, modo, negocioDefecto: negDef }) : []), [doc, filas, mapa, encab, modo, negDef]);
  const cuenta = (a: FilaImp['accion']) => previa.filter(r => r.accion === a).length, conAviso = previa.filter(r => r.avisos.length).length, n = cuenta('agregar') + cuenta('actualizar');
  const nCols = filas ? Math.max(...filas.map(f => f.length)) : 0, enc = filas?.[0] ?? [];
  const nombreCol = (i: number) => (encab ? `${enc[i] || 'Columna ' + (i + 1)}` : `Columna ${i + 1} (${(enc[i] || '').slice(0, 18)})`);
  const vista = previa.slice(0, 200);
  const descargarPlantilla = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([PLANTILLA_CSV], { type: 'text/csv' })); a.download = 'plantilla-actividades.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };

  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra"><strong><Ico n="subir" t={18} /> Importar actividades</strong><div className="barra"><button onClick={descargarPlantilla}>Descargar plantilla</button><button onClick={onCerrar}>Cerrar</button></div></div>
      <div className="contenido">
        <div className="imp-origen">
          <div className="imp-op"><b>1. Elige el archivo</b>
            <p className="nd">Un <code>.csv</code> guardado desde Excel (Archivo → Guardar como → CSV UTF-8). Se aceptan comas, punto y coma o tabuladores.</p>
            <button className="prim" onClick={() => archivo.current?.click()}>Elegir archivo .csv</button>
            <input ref={archivo} type="file" accept=".csv,.txt,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void elegir(f); e.target.value = ''; }} />
            <span className="nd"> {nombre}</span></div>
          <div className="imp-o">o</div>
          <div className="imp-op"><b>…o pega las celdas copiadas de Excel</b>
            <textarea rows={5} value={pegado} placeholder="Selecciona las celdas en Excel (con la fila de encabezados), cópialas con Ctrl+C y pégalas aquí con Ctrl+V"
              onChange={e => { const v = e.target.value; setPegado(v); clearTimeout(t.current); t.current = setTimeout(() => { if (v.trim()) { setNombre(''); cargar(v); } }, 300); }} /></div>
        </div>
        {filas && (
          <div>
            <h3>2. Indica qué columna corresponde a cada campo</h3>
            <div className="imp-opciones">
              <label className="check"><input type="checkbox" checked={encab} onChange={e => setEncab(e.target.checked)} /> La primera fila tiene los nombres de las columnas</label>
              <label className="check"><input type="radio" name="impModo" checked={modo === 'agregar'} onChange={() => setModo('agregar')} /> Agregar todas como actividades nuevas</label>
              <label className="check"><input type="radio" name="impModo" checked={modo === 'actualizar'} onChange={() => setModo('actualizar')} /> Actualizar las que coincidan por ID y agregar el resto</label>
              <label className="imp-neg">Negocio para las filas que no traigan uno <input list="listaNegImp" placeholder="(opcional)" value={negDef} onChange={e => setNegDef(e.target.value)} /></label>
              <datalist id="listaNegImp">{unicos(doc.actividades.map(a => a.negocio)).map(x => <option key={x} value={x} />)}</datalist>
            </div>
            <div className="imp-mapa">{CAMPOS_CSV.map(c => (
              <label key={c.k}><span>{c.t}{c.req && <b> *</b>}{c.ayuda && <span className="nd"> · {c.ayuda}</span>}</span>
                <select value={mapa[c.k] ?? ''} onChange={e => setMapa(m => { const x = { ...m }; if (e.target.value === '') delete x[c.k]; else x[c.k] = +e.target.value; return x; })}>
                  <option value="">— no importar —</option>{Array.from({ length: nCols }, (_, i) => <option key={i} value={i}>{nombreCol(i)}</option>)}</select></label>))}</div>
            <h3>3. Revisa antes de importar</h3>
            <div className="imp-resumen">
              <span className="t-ok"><Ico n="mas" t={14} /> {pl(cuenta('agregar'), 'nueva', 'nuevas')}</span>
              {cuenta('actualizar') > 0 && <span className="t-warn"><Ico n="lapiz" t={14} /> {pl(cuenta('actualizar'), 'se actualizará', 'se actualizarán')}</span>}
              {cuenta('omitir') > 0 && <span className="t-dan"><Ico n="alerta" t={14} /> {pl(cuenta('omitir'), 'fila se omitirá', 'filas se omitirán')}</span>}
              {conAviso > 0 && <span className="nd">{pl(conAviso, 'fila con aviso', 'filas con avisos')}</span>}
            </div>
            <div className="scroll"><table className="imp-tabla"><thead><tr><th>Fila</th><th /><th>Negocio</th><th>Actividad</th><th>Prioridad</th><th>Tamaño</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Observaciones</th></tr></thead><tbody>
              {vista.map(r => (
                <tr key={r.fila} className={`imp-${r.accion}`}><td className="nd">{r.fila}</td>
                  <td>{r.accion === 'omitir' ? <span className="t-dan" title="Se omitirá"><Ico n="x" t={14} /></span> : r.accion === 'actualizar' ? <span className="t-warn" title={`Actualizará #${r.id}`}>#{r.id}</span> : <span className="t-ok" title="Nueva"><Ico n="mas" t={14} /></span>}</td>
                  <td>{r.a.negocio || '—'}</td><td className="txt">{r.a.actividad || '—'}{r.a.etiquetas.length > 0 && <span className="etqs">{r.a.etiquetas.map(x => <EtqPill key={x} t={x} doc={doc} />)}</span>}</td>
                  <td><PriBadge p={r.a.prioridad ?? ''} /></td><td><TamBadge t={r.a.tamano ?? ''} /></td><td>{r.a.responsable || '—'}</td><td><Fecha d={r.a.inicio ?? ''} /></td><td><Fecha d={r.a.fin ?? ''} /></td>
                  <td><ChipEstado e={r.a.estado} /></td><td className={r.errores.length ? 't-dan' : 't-warn'}>{[...r.errores, ...r.avisos].join('; ')}</td></tr>))}</tbody></table>
              {previa.length > vista.length && <p className="nd">Se muestran las primeras {vista.length} de {previa.length} filas.</p>}</div>
          </div>
        )}
      </div>
      {filas && (
        <div className="rep-barra imp-pie">
          <span className="nd">{mapa.actividad == null ? 'Elige qué columna tiene la actividad.' : editando ? 'Se guardará en el archivo al momento.' : 'Al importar se tomará el archivo para editarlo.'}</span>
          <div className="barra"><button onClick={onCerrar}>Cancelar</button>
            <button className="prim" disabled={!n || mapa.actividad == null} onClick={() => onImportar(previa, mapa)}><Ico n="subir" /> {n ? `Importar ${pl(n, 'actividad', 'actividades')}` : 'Importar'}</button></div>
        </div>
      )}
    </Dialogo>
  );
}
