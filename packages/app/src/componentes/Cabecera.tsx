import { useEffect, useRef, useState } from 'react';
import { NOMBRE_APP, VERSION_TXT } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { ICONO_APP } from '../original/iconoApp';
import type { Tema } from '../estado/ui';

const TEMAS: Record<Tema, { ic: string; t: string; d: string }> = {
  auto: { ic: 'auto', t: 'Automático', d: 'Sigue el tema de tu sistema' }, claro: { ic: 'sol', t: 'Claro', d: 'Siempre claro' }, oscuro: { ic: 'luna', t: 'Oscuro', d: 'Siempre oscuro' },
};
const SIG: Record<Tema, Tema> = { auto: 'claro', claro: 'oscuro', oscuro: 'auto' };

export interface Props {
  /** Estado del archivo compartido (<Banner/>), al centro de la barra */
  estado?: React.ReactNode;
  titulo: string; archivo: string; usuario: string; hayArchivo: boolean;
  novedades: number; menciones: number; tema: Tema;
  onAbrir(): void; onRefrescar(): void; onNovedades(): void; onBitacora(): void; onHitos?(): void; logo?: string; onReporte(): void; onManual(): void; onTema(t: Tema): void; onUsuario(): void;
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
          {/* logo.png junto a la app (o junto al .md en el escritorio); si no existe, el ícono de MDexa */}
          <img key={p.logo || 'logo.png'} src={p.logo || 'logo.png'} alt="" className="marca-logo" onError={e => { if (e.currentTarget.src !== ICONO_APP) e.currentTarget.src = ICONO_APP; }} />
          <span className="marca-txt"><b>{NOMBRE_APP}</b><span className="marca-ver">v{p.version ?? VERSION_TXT}</span></span>
        </div>
        <div className="cabeza-proy">
          <h1 title={p.titulo}>{p.titulo}</h1>
          <div className="archivo">
            <Ico n="archivo" t={14} /> {p.hayArchivo ? <b>{p.archivo}</b> : 'Sin archivo abierto'} · <Ico n="usuario" t={14} />{' '}
            {p.usuario ? <>{p.usuario} · <a href="#" onClick={e => { e.preventDefault(); p.onUsuario(); }}>cambiar</a></> : <a href="#" onClick={e => { e.preventDefault(); p.onUsuario(); }}>indicar tu nombre</a>}
          </div>
        </div>
      </div>
      {p.estado}
      <div className="barra">
        <button className="cede" onClick={p.onAbrir} title="Abrir .md" aria-label="Abrir .md"><Ico n="carpeta" /><span className="t">Abrir .md</span></button>
        <button className="solo-ico" onClick={p.onRefrescar} title="Refrescar: volver a leer el archivo" aria-label="Refrescar"><Ico n="refrescar" /><span className="t">Refrescar</span></button>
        <button className={`solo-ico ${p.novedades ? 'hay' : ''}`} aria-label="Novedades" onClick={p.onNovedades} title={p.novedades ? `${p.novedades} ${p.novedades === 1 ? 'novedad' : 'novedades'} desde tu última visita` : 'Novedades: sin cambios desde tu última visita'}>
          <Ico n="campana" /><span className="t">Novedades</span>{p.novedades > 0 && <span className={`nov-badge ${p.menciones ? 'con-men' : ''}`}>{(p.menciones ? '@ ' : '') + (p.novedades > 99 ? '99+' : p.novedades)}</span>}
        </button>
        <button className="solo-ico" onClick={p.onBitacora} title="Bitácora: quién cambió qué y cuándo" aria-label="Bitácora" disabled={!p.hayArchivo}><Ico n="reloj" /><span className="t">Bitácora</span></button>
        <button className="cede" onClick={p.onHitos} title="Hitos y fases: fechas, avance y estado" aria-label="Hitos" disabled={!p.hayArchivo}><Ico n="bandera" /><span className="t">Hitos</span></button>
        <button className="cede" onClick={p.onReporte} title="Reporte" aria-label="Reporte" disabled={!p.hayArchivo}><Ico n="grafica" /><span className="t">Reporte</span></button>
        <button className="solo-ico" onClick={p.onManual} title="Manual de uso" aria-label="Manual"><Ico n="libro" /><span className="t">Manual</span></button>
        <button className="btn-tema" aria-label="Tema" onClick={() => p.onTema(SIG[p.tema])}
          title={`Tema: ${TEMAS[p.tema].t} (${TEMAS[p.tema].d.toLowerCase()}) · clic para cambiar a ${TEMAS[SIG[p.tema]].t}`}><Ico n={TEMAS[p.tema].ic} t={17} /></button>
        <button className="btn-tema" aria-label="Pantalla completa" aria-pressed={pantalla} onClick={alternarPantalla}
          title={pantalla ? 'Salir de pantalla completa' : 'Pantalla completa'}><Ico n={pantalla ? 'contraer' : 'expandir'} t={17} /></button>
        <div className="menu-wrap" ref={raiz}>
          <button className="cede" title="Más opciones" aria-label="Más" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Ico n="puntos" /><span className="t">Más</span></button>
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
