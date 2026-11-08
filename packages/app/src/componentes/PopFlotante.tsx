import { useLayoutEffect, useRef, useState } from 'react';

/** Ventana flotante anclada a un botón (subtareas y etiquetas); se cierra al hacer clic fuera o con Escape */
export function PopFlotante({ ancla, className, onCerrar, children, etiqueta }: { ancla: HTMLElement; className: string; onCerrar(): void; children: React.ReactNode; etiqueta: string }) {
  const r = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useLayoutEffect(() => {
    const pop = r.current; if (!pop) return;
    const a = ancla.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    const left = Math.max(8, Math.min(a.left, innerWidth - w - 8));
    const top = Math.max(8, a.bottom + 6 + h > innerHeight && a.top - 6 - h > 0 ? a.top - 6 - h : Math.min(a.bottom + 6, innerHeight - h - 8));
    setPos(p => (p.left === left && p.top === top ? p : { left, top }));   // sin cambio no se vuelve a pintar
  });
  useLayoutEffect(() => {
    const fuera = (e: PointerEvent) => { const t = e.target as Node; if (!r.current?.contains(t) && !ancla.contains(t)) onCerrar(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCerrar(); } };
    document.addEventListener('pointerdown', fuera); document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc, true); };
  }, [ancla, onCerrar]);
  return <div ref={r} className={className} role="dialog" aria-label={etiqueta} style={{ left: pos.left, top: pos.top }}>{children}</div>;
}
