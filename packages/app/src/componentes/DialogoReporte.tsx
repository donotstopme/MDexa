import { renderToStaticMarkup } from 'react-dom/server';
import { NOMBRE_APP, VERSION_TXT, analizarReporte, reporteMd, hoy, type Documento } from '@gestor/core';
import { Ico } from '../original/iconos';
import { CSS_REPORTE as cssReporte } from '../original/reporteCss';
import { ReporteContenido } from './ReporteContenido';
import { Dialogo } from './Dialogo';

export const VARS_IMPRESION = `:root{--bg:#fff;--card:#fff;--text:#1c2430;--muted:#667085;--line:#e3e6eb;--line2:#cfd4dc;--accent:#2f6fed;--danger:#d92d20;--ok:#079455;--warn:#dc6803;
  --c-gris:#8a94a6;--c-azul:#2f6fed;--c-amar:#e0a800;--c-verde:#079455;--c-rojo:#d92d20;--t-amar:#946200;--av-real:#079455;--av-ideal:#2f6fed}
  *{box-sizing:border-box}body{margin:0;background:#fff;color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}@page{margin:14mm}`;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const nombreReporte = (doc: Documento, ext: string) =>
  `reporte-${(doc.meta.proyecto || 'actividades').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'actividades'}-${hoy()}.${ext}`;

function descargar(nombre: string, contenido: string, tipo: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Documento HTML completo e independiente del reporte (para descargar o imprimir) */
export function documentoReporte(doc: Documento, usuario: string, archivo: string): string {
  const x = analizarReporte(doc);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.meta.proyecto || 'Reporte de actividades')} · ${hoy()}</title>
<style>${VARS_IMPRESION}.rep{max-width:1000px;margin:0 auto;padding:28px 20px}${cssReporte}</style></head>
<body><div class="rep">${renderToStaticMarkup(<ReporteContenido doc={doc} x={x} usuario={usuario} archivo={archivo} />)}</div></body></html>`;
}

export function DialogoReporte({ doc, usuario, archivo, onSemanal, onCerrar }: { doc: Documento; usuario: string; archivo: string; onSemanal(): void; onCerrar(): void }) {
  const x = analizarReporte(doc);
  const imprimir = () => {
    const w = window.open('', '_blank');
    if (!w) { window.alert('El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.'); return; }
    w.document.open(); w.document.write(documentoReporte(doc, usuario, archivo)); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };
  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra">
        <strong><Ico n="grafica" t={18} /> Reporte</strong>
        <div className="barra">
          <button onClick={onSemanal}><Ico n="correo" /> Reporte semanal</button>
          <button onClick={imprimir}><Ico n="impresora" /> Imprimir / PDF</button>
          <button onClick={() => descargar(nombreReporte(doc, 'html'), documentoReporte(doc, usuario, archivo), 'text/html')}><Ico n="descargar" /> Descargar .html</button>
          <button onClick={() => descargar(nombreReporte(doc, 'md'), reporteMd(doc, x, { usuario, nombreApp: NOMBRE_APP, version: VERSION_TXT }), 'text/markdown')}><Ico n="descargar" /> Descargar .md</button>
          <button className="prim" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
      <div className="contenido rep"><ReporteContenido doc={doc} x={x} usuario={usuario} archivo={archivo} /></div>
    </Dialogo>
  );
}
