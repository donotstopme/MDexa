import { useEffect, useRef, useState } from 'react';
import { NOMBRE_APP, VERSION_TXT } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { ICONO_APP } from '../original/iconoApp';
import type { Tema } from '../estado/ui';

export const TEMAS: Record<Tema, { ic: string; t: string; d: string }> = {
  auto: { ic: 'auto', t: 'Automático', d: 'Sigue el tema de tu sistema' }, claro: { ic: 'sol', t: 'Claro', d: 'Siempre claro' }, oscuro: { ic: 'luna', t: 'Oscuro', d: 'Siempre oscuro' },
};
export const SIG: Record<Tema, Tema> = { auto: 'claro', claro: 'oscuro', oscuro: 'auto' };

export interface Props {
  /** Estado del archivo compartido (<Banner/>), al centro de la barra */
  estado?: React.ReactNode;
  titulo: string; archivo: string; usuario: string; hayArchivo: boolean;
  novedades: number; menciones: number; tema: Tema;
  onAbrir(): void; onRefrescar(): void; onNovedades(): void; onBitacora(): void; onHitos?(): void; logo?: string; onReporte(): void; onManual(): void; onTema(t: Tema): void; onUsuario(): void;
  extras: { titulo: string; desc: string; onClick(): void }[];
  version?: string;
}

/** Recuadro que aparece bajo un botón de la cabecera y explica qué hace */
const Pista = ({ t, d }: { t: string; d: string }) => <span className="pista" role="tooltip"><b>{t}</b><small>{d}</small></span>;

export const alternarPantalla = () => {
  if (!document.fullscreenEnabled) return;
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {});
};

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
        <button onClick={p.onAbrir} aria-label="Abrir .md"><Ico n="carpeta" /><Pista t="Abrir .md" d="Elegir otro archivo de proyecto" /></button>
        <button onClick={p.onRefrescar} aria-label="Refrescar"><Ico n="refrescar" /><Pista t="Refrescar" d="Volver a leer el archivo para ver los cambios de otras personas" /></button>
        <button className={p.novedades ? 'hay' : ''} aria-label="Novedades" onClick={p.onNovedades}>
          <Ico n="campana" />{p.novedades > 0 && <span className={`nov-badge ${p.menciones ? 'con-men' : ''}`}>{(p.menciones ? '@ ' : '') + (p.novedades > 99 ? '99+' : p.novedades)}</span>}
          <Pista t="Novedades" d={p.novedades ? `${p.novedades} ${p.novedades === 1 ? 'novedad' : 'novedades'} desde tu última visita${p.menciones ? ` · te mencionaron ${p.menciones === 1 ? 'una vez' : `${p.menciones} veces`}` : ''}` : 'Sin cambios desde tu última visita'} />
        </button>
        <button onClick={p.onBitacora} aria-label="Bitácora" disabled={!p.hayArchivo}><Ico n="reloj" /><Pista t="Bitácora" d="Quién cambió qué y cuándo" /></button>
        <button onClick={p.onHitos} aria-label="Hitos" disabled={!p.hayArchivo}><Ico n="bandera" /><Pista t="Hitos" d="Fechas, avance y estado de los hitos y fases" /></button>
        <button onClick={p.onReporte} aria-label="Reporte" disabled={!p.hayArchivo}><Ico n="grafica" /><Pista t="Reporte" d="Avance del proyecto para ver, imprimir o descargar" /></button>
        <button onClick={p.onManual} aria-label="Manual"><Ico n="libro" /><Pista t="Manual" d="Guía de uso con buscador" /></button>
        <button className="btn-tema" aria-label="Tema" onClick={() => p.onTema(SIG[p.tema])}>
          <Ico n={TEMAS[p.tema].ic} t={17} /><Pista t={`Tema: ${TEMAS[p.tema].t}`} d={`${TEMAS[p.tema].d}. Clic para cambiar a ${TEMAS[SIG[p.tema]].t}`} /></button>
        <button className="btn-tema" aria-label="Pantalla completa" aria-pressed={pantalla} onClick={alternarPantalla}>
          <Ico n={pantalla ? 'contraer' : 'expandir'} t={17} /><Pista t={pantalla ? 'Salir de pantalla completa' : 'Pantalla completa'} d={pantalla ? 'Tecla F o Esc' : 'Ocupa todo el monitor · tecla F'} /></button>
        <div className="menu-wrap" ref={raiz}>
          <button aria-label="Más" aria-haspopup="true" aria-expanded={menu} onClick={() => setMenu(m => !m)}><Ico n="puntos" /><Pista t="Más opciones" d="Archivo nuevo, sprint, importar, exportar, respaldos y atajos" /></button>
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
