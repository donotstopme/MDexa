import { useEffect, useRef } from 'react';

/** `<dialog>` modal que se abre al montarse; `onCerrar` se llama al cerrarse (Escape o código) */
export function Dialogo({ className, onCerrar, children }: { className?: string; onCerrar(): void; children: React.ReactNode }) {
  const r = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = r.current; if (d && !d.open) d.showModal(); }, []);
  return <dialog ref={r} className={className} onClose={onCerrar}>{children}</dialog>;
}
