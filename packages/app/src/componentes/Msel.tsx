import { useEffect, useRef, useState } from 'react';

export interface OpcionMsel { v: string; sep?: boolean; cls?: string; c?: string }

/** Combo de filtro con selección múltiple (vacío = todos), como el del original */
export function Msel({ todos, varios, opciones, sel, onChange, icono }: {
  todos: string; varios: string; opciones: (string | OpcionMsel)[]; sel: string[]; onChange(v: string[]): void; icono?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [der, setDer] = useState(false);
  const raiz = useRef<HTMLDivElement>(null), pop = useRef<HTMLDivElement>(null);
  const ops = opciones.map(o => (typeof o === 'string' ? { v: o } : o));
  const reales = ops.filter(o => !o.sep).map(o => o.v);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setAbierto(false); e.stopPropagation(); } };
    document.addEventListener('pointerdown', fuera); document.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('pointerdown', fuera); document.removeEventListener('keydown', esc, true); };
  }, [abierto]);
  useEffect(() => { if (abierto && pop.current) setDer(pop.current.getBoundingClientRect().right > innerWidth - 8); }, [abierto]);

  const n = sel.length, texto = !n ? todos : n === 1 ? sel[0] : `${n} ${varios}`;
  const alternar = (v: string) => onChange(sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v]);
  return (
    <div ref={raiz} className={`msel ${abierto ? 'abierto' : ''} ${n ? 'activo' : ''}`}>
      <button type="button" className="msel-btn" aria-haspopup="true" aria-expanded={abierto} title={n ? sel.join(', ') : todos} onClick={() => setAbierto(a => !a)}>
        {icono}<span className="msel-txt">{texto}</span><span className="msel-car">▾</span>
      </button>
      {abierto && (
        <div ref={pop} className={`msel-pop ${der ? 'der' : ''}`}>
          <div className="msel-ops">
            {ops.length ? ops.map(o => o.sep ? <div key={o.v} className="msel-sep">{o.v}</div> : (
              <label key={o.v} className="msel-op">
                <input type="checkbox" checked={sel.includes(o.v)} onChange={() => alternar(o.v)} />
                {o.cls ? <i className={o.cls} /> : o.c ? <i className={`f-${o.c}`} /> : null}
                <span>{o.v}</span>
                <a href="#" className="msel-solo" title="Mostrar solo esta" onClick={e => { e.preventDefault(); onChange([o.v]); }}>solo</a>
              </label>
            )) : <div className="msel-sep">Sin opciones</div>}
          </div>
          <div className="msel-pie">
            <button type="button" className="msel-todo" onClick={() => onChange(reales)}>Todos</button>
            <button type="button" className="msel-nada" onClick={() => onChange([])}>Quitar filtro</button>
          </div>
        </div>
      )}
    </div>
  );
}
