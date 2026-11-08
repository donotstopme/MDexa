import { useState } from 'react';
import { actividadesIcs, generarICS, normaliza, type Actividad, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/** Exportar las fechas fin al calendario (.ics para Outlook, Google o Apple) */
export function DialogoIcs({ doc, archivo, usuario, visibles, onExportar, onCerrar }: { doc: Documento; archivo: string; usuario: string; visibles: Actividad[]; onExportar(nombre: string, contenido: string, n: number): void; onCerrar(): void }) {
  const [que, setQue] = useState<'mias' | 'filtradas' | 'todas'>(usuario ? 'mias' : 'todas'), [term, setTerm] = useState(false), [alarma, setAlarma] = useState(true);
  const { lista, sinFin } = actividadesIcs(doc, que, visibles, usuario, term);
  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lista.length) return;
    const slug = (s: string) => normaliza(s).replace(/[^a-z0-9]+/g, '-');
    const nombre = `${slug(doc.meta.proyecto || archivo.replace(/\.md$/i, '')) || 'actividades'}${que === 'mias' ? '-' + slug(usuario) : ''}.ics`;
    onExportar(nombre, generarICS(doc, lista, alarma, archivo), lista.length);
  };
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={enviar}>
        <h2><Ico n="calendario" t={20} /> Exportar al calendario</h2>
        <p className="nd" style={{ marginTop: 0 }}>Genera un archivo <b>.ics</b>: ábrelo con doble clic y Outlook agrega las fechas fin como eventos de todo el día (también sirve para Google Calendar o Apple).</p>
        <div className="ics-op">
          <label className="check"><input type="radio" name="icsQue" checked={que === 'mias'} disabled={!usuario} onChange={() => setQue('mias')} /> Solo las mías <span className="nd">{usuario ? `(${usuario})` : '(indica tu nombre primero)'}</span></label>
          <label className="check"><input type="radio" name="icsQue" checked={que === 'filtradas'} onChange={() => setQue('filtradas')} /> Las que se ven con los filtros actuales</label>
          <label className="check"><input type="radio" name="icsQue" checked={que === 'todas'} onChange={() => setQue('todas')} /> Todas</label>
          <label className="check"><input type="checkbox" checked={term} onChange={e => setTerm(e.target.checked)} /> Incluir terminadas y canceladas</label>
          <label className="check"><input type="checkbox" checked={alarma} onChange={e => setAlarma(e.target.checked)} /> Recordatorio la tarde anterior (9:00 p.m.)</label>
        </div>
        <p className="nd"><Ico n="calendario" t={14} /> Se exportarán <b>{pl(lista.length, 'actividad', 'actividades')}</b> como eventos de todo el día en su fecha fin.{sinFin > 0 && ` ${pl(sinFin, 'no tiene', 'no tienen')} fecha fin y se omitirá${sinFin === 1 ? '' : 'n'}.`}</p>
        <p className="nd" style={{ fontSize: 12 }}>Si vuelves a importar el archivo después, Outlook actualiza los eventos que ya tenía en lugar de duplicarlos.</p>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="prim" disabled={!lista.length}><Ico n="descargar" /> Descargar .ics</button></div></div>
      </form>
    </Dialogo>
  );
}
