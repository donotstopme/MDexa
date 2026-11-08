import { useRef, useState } from 'react';
import { NOMBRE_APP, datosSemana, hoy, textoSemanal, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

/** Reporte semanal listo para pegar en un correo (copia HTML y texto plano) */
export function DialogoSemanal({ doc, archivo, aviso, onCerrar }: { doc: Documento; archivo: string; aviso(m: string): void; onCerrar(): void }) {
  const [cual, setCual] = useState(0);
  const hoja = useRef<HTMLDivElement>(null);
  const o = { archivo, nombreApp: NOMBRE_APP, hoy: hoy() };
  const s = datosSemana(doc, cual), html = textoSemanal(doc, s, true, o), texto = textoSemanal(doc, s, false, o);

  const copiar = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined') await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html.cuerpo], { type: 'text/html' }), 'text/plain': new Blob([texto.cuerpo], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(texto.cuerpo);
      aviso('Copiado. Pégalo en tu correo con Ctrl+V');
    } catch {
      if (hoja.current) { const r = document.createRange(); r.selectNodeContents(hoja.current); const g = getSelection(); g?.removeAllRanges(); g?.addRange(r); }
      aviso('Selecciona y copia con Ctrl+C (el navegador no dejó copiar solo)');
    }
  };
  const correo = () => {
    let cuerpo = texto.cuerpo; const MAX = 1800;
    if (encodeURIComponent(cuerpo).length > MAX * 3) { cuerpo = cuerpo.slice(0, MAX) + '\n…\n(El reporte es largo: usa "Copiar para correo" y pégalo completo.)'; aviso('El reporte es largo: se recortó en el correo. Usa "Copiar para correo" para pegarlo completo.'); }
    location.href = `mailto:?subject=${encodeURIComponent(texto.titulo)}&body=${encodeURIComponent(cuerpo)}`;
  };
  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra">
        <strong><Ico n="correo" t={18} /> Reporte semanal</strong>
        <div className="barra">
          <select style={{ width: 'auto' }} value={cual} onChange={e => setCual(+e.target.value)}><option value={0}>Esta semana</option><option value={-1}>Semana pasada</option></select>
          <button className="prim" onClick={() => void copiar()}><Ico n="copiar" /> Copiar para correo</button>
          <button onClick={correo}><Ico n="correo" /> Abrir en el correo</button>
          <button onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
      <div className="contenido"><div className="sem-hoja" ref={hoja} dangerouslySetInnerHTML={{ __html: html.cuerpo }} /></div>
    </Dialogo>
  );
}
