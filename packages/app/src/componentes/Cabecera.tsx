import { useEffect, useRef, useState } from 'react';
import { NOMBRE_APP, VERSION_TXT } from '@gestor/core';
import { Ico } from '../original/iconos';
import type { Tema } from '../estado/ui';

const TEMAS: Record<Tema, { ic: string; t: string; d: string }> = {
  auto: { ic: 'auto', t: 'Automático', d: 'Sigue el tema de tu sistema' }, claro: { ic: 'sol', t: 'Claro', d: 'Siempre claro' }, oscuro: { ic: 'luna', t: 'Oscuro', d: 'Siempre oscuro' },
};
const SIG: Record<Tema, Tema> = { auto: 'claro', claro: 'oscuro', oscuro: 'auto' };

export interface Props {
  titulo: string; archivo: string; usuario: string; hayArchivo: boolean;
  novedades: number; menciones: number; tema: Tema;
  onAbrir(): void; onRefrescar(): void; onNovedades(): void; onBitacora(): void; onReporte(): void; onManual(): void; onTema(t: Tema): void; onUsuario(): void;
  extras: { titulo: string; desc: string; onClick(): void }[];
  version?: string;
}

export function Cabecera(p: Props) {
  const [menu, setMenu] = useState(false);
  const [pantalla, setPantalla] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = () => setPantalla(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', f); return () => document.removeEventListener('fullscreenchange', f);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const f = (e: PointerEvent) => { if (!raiz.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f);
  }, [menu]);
  const alternarPantalla = () => {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {});
  };
  return (
    <header>
      <div className="cabeza">
        <div className="marca" title={NOMBRE_APP}>
          <span className="marca-txt"><b>{NOMBRE_APP}</b><span className="marca-ver">v{p.version ?? VERSION_TXT}</span></span>
        </div>
        <div className="cabeza-proy">
          <h1>{p.titulo}</h1>
          <div className="archivo">
            <Ico n="archivo" t={14} /> {p.hayArchivo ? <b>{p.archivo}</b> : 'Sin archivo abierto'} · <Ico n="usuario" t={14} />{' '}
            {p.usuario ? <>{p.usuario} · <a href="#" onClick={e => { e.preventDefault(); p.onUsuario(); }}>cambiar</a></> : <a href="#" onClick={e => { e.preventDefault(); p.onUsuario(); }}>indicar tu nombre</a>}
          </div>
        </div>
      </div>
      <div className="barra">
        <button onClick={p.onAbrir}><Ico n="carpeta" /> Abrir .md</button>
        <button onClick={p.onRefrescar} title="Volver a leer el archivo"><Ico n="refrescar" /> Refrescar</button>
        <button className={p.novedades ? 'hay' : ''} onClick={p.onNovedades} title={p.novedades ? `${p.novedades} ${p.novedades === 1 ? 'novedad' : 'novedades'} desde tu última visita` : 'Sin cambios desde tu última visita'}>
          <Ico n="campana" /> Novedades{p.novedades > 0 && <span className={`nov-badge ${p.menciones ? 'con-men' : ''}`}>{(p.menciones ? '@ ' : '') + (p.novedades > 99 ? '99+' : p.novedades)}</span>}
        </button>
        <button onClick={p.onBitacora} title="Quién cambió qué y cuándo" disabled={!p.hayArchivo}><Ico n="reloj" /> Bitácora</button>
        <button onClick={p.onReporte} disabled={!p.hayArchivo}><Ico n="grafica" /> Reporte</button>
        <button onClick={p.onManual} title="Manual de uso"><Ico n="libro" /> Manual</button>
        <button className="btn-tema" aria-label="Tema" onClick={() => p.onTema(SIG[p.tema])}
          title={`Tema: ${TEMAS[p.tema].t} (${TEMAS[p.tema].d.toLowerCase()}) · clic para cambiar a ${TEMAS[SIG[p.tema]].t}`}><Ico n={TEMAS[p.tema].ic} t={17} /></button>
        <button className="btn-tema" aria-label="Pantalla completa" aria-pressed={pantalla} onClick={alternarPantalla}
          title={pantalla ? 'Salir de pantalla completa' : 'Pantalla completa'}><Ico n={pantalla ? 'contraer' : 'expandir'} t={17} /></button>
        <div className="menu-wrap" ref={raiz}>
          <button aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Ico n="puntos" /> Más</button>
          {menu && (
            <div className="menu">
              {p.extras.map(x => <button key={x.titulo} onClick={() => { setMenu(false); x.onClick(); }}><span><b>{x.titulo}</b><span className="menu-desc">{x.desc}</span></span></button>)}
              <div className="menu-pie">{NOMBRE_APP} · versión {VERSION_TXT}</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
