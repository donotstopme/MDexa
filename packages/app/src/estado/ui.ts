import { useCallback, useEffect, useMemo, useState } from 'react';
import { filtrosVacios, type Agrupar, type Filtros, type Orden } from '@mdexa/core';

export const VISTAS = { lista: 'Lista', gantt: 'Línea de tiempo', kanban: 'Tablero', cal: 'Calendario', mias: 'Mis actividades', carga: 'Carga' } as const;
export type Vista = keyof typeof VISTAS;
export type Tema = 'auto' | 'claro' | 'oscuro';
export const COLS_OPC = [['negocio', 'Negocio'], ['prioridad', 'Prioridad'], ['tamano', 'Tamaño'], ['responsable', 'Responsable'], ['inicio', 'Inicio'], ['fin', 'Fin'], ['estado', 'Estado']] as const;

const leer = (k: string): string | null => { try { return localStorage.getItem(k); } catch { return null; } };
const guardar = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* sin almacenamiento local */ } };

/** Preferencias de pantalla; se recuerdan en este navegador con las mismas claves que el HTML original */
export function useUI(archivo: string, proyecto: string) {
  const [vista, setVistaS] = useState<Vista>(() => { const v = leer('mdexa.vista') as Vista; return v in VISTAS ? v : 'lista'; });
  const [agrupar, setAgruparS] = useState<Agrupar>(() => { const v = leer('mdexa.agrupar'); return v !== null && ['', 'negocio', 'responsable', 'prioridad', 'estado', 'etiqueta'].includes(v) ? (v as Agrupar) : 'negocio'; });
  const [filtros, setFiltros] = useState<Filtros>(() => ({ ...filtrosVacios(), verBacklog: leer('mdexa.verBacklog') !== '0' }));
  const [orden, setOrden] = useState<Orden>({ k: 'inicio', asc: true });
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const [colsOcultas, setColsOcultas] = useState<Set<string>>(() => { try { return new Set(JSON.parse(leer('mdexa.colsOcultas') || '[]')); } catch { return new Set(); } });
  const [compacto, setCompactoS] = useState(() => leer('mdexa.panelCompacto') === '1');
  const [tema, setTemaS] = useState<Tema>(() => { const t = leer('mdexa.tema'); return t === 'claro' || t === 'oscuro' ? t : 'auto'; });
  const [zoom, setZoomS] = useState<'dia' | 'semana' | 'mes'>(() => { const z = leer('mdexa.zoom'); return z === 'dia' || z === 'mes' ? z : 'semana'; });
  const [persona, setPersonaS] = useState(() => leer('mdexa.persona') || '');
  const [verAvance, setVerAvanceS] = useState(() => leer('mdexa.verAvance') === '1');
  const [unidadAvance, setUnidadAvanceS] = useState<'act' | 'h'>(() => (leer('mdexa.avanceUnidad') === 'h' ? 'h' : 'act'));
  const claveFavs = `mdexa.favoritas|${archivo}|${proyecto}`;
  const [favs, setFavs] = useState<Set<number>>(new Set());
  useEffect(() => { try { setFavs(new Set(JSON.parse(leer(claveFavs) || '[]'))); } catch { setFavs(new Set()); } }, [claveFavs]);

  useEffect(() => {
    if (tema === 'auto') delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = tema;
  }, [tema]);

  const act = useMemo(() => ({
    setVista: (v: Vista) => { setVistaS(v); guardar('mdexa.vista', v); },
    setAgrupar: (a: Agrupar) => { setAgruparS(a); guardar('mdexa.agrupar', a); },
    setFiltros: (p: Partial<Filtros>) => { if (p.verBacklog !== undefined) guardar('mdexa.verBacklog', p.verBacklog ? '1' : '0'); setFiltros(f => ({ ...f, ...p })); },
    limpiarFiltros: () => setFiltros(f => ({ ...filtrosVacios(), verBacklog: f.verBacklog })),
    setOrden,
    alternarGrupo: (g: string) => setColapsados(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; }),
    abrirGrupo: (g: string) => setColapsados(s => { const n = new Set(s); n.delete(g); return n; }),
    setCol: (k: string, visible: boolean) => setColsOcultas(s => { const n = new Set(s); if (visible) n.delete(k); else n.add(k); guardar('mdexa.colsOcultas', n.size ? JSON.stringify([...n]) : null); return n; }),
    mostrarTodasCols: () => { setColsOcultas(new Set()); guardar('mdexa.colsOcultas', null); },
    setCompacto: (c: boolean) => { setCompactoS(c); guardar('mdexa.panelCompacto', c ? '1' : '0'); },
    setTema: (t: Tema) => { setTemaS(t); guardar('mdexa.tema', t === 'auto' ? null : t); },
    setZoom: (z: 'dia' | 'semana' | 'mes') => { setZoomS(z); guardar('mdexa.zoom', z); },
    setVerAvance: (v: boolean) => { setVerAvanceS(v); guardar('mdexa.verAvance', v ? '1' : '0'); },
    setUnidadAvance: (u: 'act' | 'h') => { setUnidadAvanceS(u); guardar('mdexa.avanceUnidad', u); },
    setPersona: (p: string) => { setPersonaS(p); guardar('mdexa.persona', p); },
  }), []);

  const alternarFav = useCallback((id: number) => setFavs(s => {
    const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id);
    guardar(claveFavs, JSON.stringify([...n])); return n;
  }), [claveFavs]);

  const alternarFavs = useCallback((ids: number[]) => setFavs(s => {
    const n = new Set(s), quitar = ids.every(i => s.has(i));
    ids.forEach(i => (quitar ? n.delete(i) : n.add(i)));
    guardar(claveFavs, JSON.stringify([...n])); return n;
  }), [claveFavs]);

  return { alternarFavs, vista, agrupar, filtros, orden, colapsados, colsOcultas, compacto, tema, zoom, persona, favs, alternarFav, verAvance, unidadAvance, ...act };
}
export type UI = ReturnType<typeof useUI>;
