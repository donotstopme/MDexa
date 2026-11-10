import { useEffect, useRef, useState } from 'react';
import { Ico } from '../original/iconos';
import { manualHtml, marcarCoincidencias, normaliza } from '../original/manual';
import { VARS_IMPRESION } from './DialogoReporte';
import { Dialogo } from './Dialogo';

/** Manual de uso con buscador: muestra sólo las secciones que contienen todas las palabras y las resalta */
export function DialogoManual({ onCerrar }: { onCerrar(): void }) {
  const cont = useRef<HTMLDivElement>(null), campo = useRef<HTMLInputElement>(null), t = useRef<ReturnType<typeof setTimeout>>();
  const marcas = useRef<HTMLElement[]>([]), actual = useRef(-1);
  const [q, setQ] = useState(''), [res, setRes] = useState('');

  // El HTML del manual se inyecta una vez; la búsqueda lo modifica a mano (secciones ocultas y resaltado)
  useEffect(() => {
    const c = cont.current; if (!c) return;
    c.innerHTML = manualHtml();
    const m = c.querySelector('.manual')!; let sec: HTMLElement | null = null;
    [...m.children].forEach(el => {
      if (el.tagName === 'H2') { sec = document.createElement('section'); sec.className = 'man-sec'; el.before(sec); }
      if (sec) sec.appendChild(el);
    });
    m.querySelectorAll<HTMLElement>('.man-sec').forEach(x => { x.dataset.html = x.innerHTML; });
    campo.current?.focus();
  }, []);

  const irA = (i: number) => {
    if (!marcas.current.length) return;
    actual.current = (i + marcas.current.length) % marcas.current.length;
    marcas.current.forEach((k, j) => k.classList.toggle('actual', j === actual.current));
    marcas.current[actual.current].scrollIntoView({ block: 'center', behavior: 'smooth' });
    setRes(r => (marcas.current.length > 1 ? `${actual.current + 1} de ${r.replace(/^\d+ de /, '')}` : r));
  };
  const buscar = (texto: string) => {
    const c = cont.current, m = c?.querySelector<HTMLElement>('.manual'); if (!c || !m) return;
    const secs = [...m.querySelectorAll<HTMLElement>('.man-sec')];
    secs.forEach(x => { x.innerHTML = x.dataset.html ?? ''; x.hidden = false; });
    m.querySelector('#manVacio')?.remove(); marcas.current = []; actual.current = -1;
    m.classList.toggle('buscando', !!texto.trim());
    if (!texto.trim()) { setRes(''); c.scrollTop = 0; return; }
    const palabras = [...new Set(normaliza(texto).split(/\s+/).filter(Boolean))];
    // También se resaltan los pedazos ("Ctrl+Z" está en dos teclas: se resaltan "Ctrl" y "Z" por separado)
    const paraMarcar = [...new Set(palabras.flatMap(p => [p, ...p.split(/[^a-z0-9ñ]+/).filter(x => x.length > 1 || (x && x !== p && p.length <= 8))]))];
    let nSec = 0;
    secs.forEach(x => { const ok = palabras.every(p => normaliza(x.textContent ?? '').includes(p)); x.hidden = !ok; if (ok) { nSec++; marcarCoincidencias(x, paraMarcar); } });
    marcas.current = [...m.querySelectorAll<HTMLElement>('mark.man-hit')];
    const n = marcas.current.length;
    setRes(nSec ? `${n} ${n === 1 ? 'coincidencia' : 'coincidencias'} en ${nSec} ${nSec === 1 ? 'sección' : 'secciones'}${n > 1 ? ' · Enter para la siguiente' : ''}` : 'Sin resultados');
    if (!nSec) { const d = document.createElement('div'); d.id = 'manVacio'; d.className = 'vacio'; d.textContent = `No encontré «${texto.trim()}» en el manual. Prueba con otra palabra o con menos palabras.`; m.append(d); }
    else { c.scrollTop = 0; setTimeout(() => irA(0), 0); }
  };
  const cambia = (v: string) => { setQ(v); clearTimeout(t.current); t.current = setTimeout(() => buscar(v), 180); };

  const imprimir = () => {
    const w = window.open('', '_blank');
    if (!w) { window.alert('El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.'); return; }
    const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules].map(r => r.cssText); } catch { return []; } }).join('\n');
    w.document.open();
    w.document.write(`<!doctype html><html lang="es" data-tema="claro"><head><meta charset="utf-8"><title>Manual de uso · MDexa</title><style>${css}${VARS_IMPRESION}.manual{padding:24px 20px;font-size:14px}.manual nav{display:none}</style></head><body>${manualHtml()}</body></html>`);
    w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); campo.current?.focus(); campo.current?.select(); } }}>
        <strong><Ico n="libro" t={18} /> Manual de uso</strong>
        <div className="buscar man-buscar"><Ico n="buscar" />
          <input ref={campo} type="search" placeholder="Buscar en el manual… (ej. candado, sprint, deshacer)" autoComplete="off" aria-label="Buscar en el manual" value={q} onChange={e => cambia(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t.current); if (!marcas.current.length) buscar(q); else irA(actual.current + (e.shiftKey ? -1 : 1)); }
              if (e.key === 'Escape' && q) { e.preventDefault(); e.stopPropagation(); cambia(''); }
            }} /></div>
        <span className="man-res" aria-live="polite">{res}</span>
        <div className="barra"><button onClick={imprimir}><Ico n="impresora" /> Imprimir</button><button className="prim" onClick={onCerrar}>Cerrar</button></div>
      </div>
      <div className="contenido" ref={cont} onClick={e => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#man-"]'); if (!a) return;
        e.preventDefault(); cont.current?.querySelector(a.getAttribute('href')!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }} />
    </Dialogo>
  );
}
