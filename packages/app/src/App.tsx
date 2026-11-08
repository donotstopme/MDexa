import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  ESTADOS, SIN_NEGOCIO, toMD, carpetaImagenes, datosAvance, agregarNota, analizarMeta, armarBloques, backlogOculto, claveNota, conColorEtiqueta, conEstado, conMeta, conSubtareas, estadoEscritura, mencionesEn,
  borrarEtiqueta, crearSprint, documentoNuevo, normaliza, renombrarEtiqueta, renombrarNegocio, type OpcionesSprint,
  aplicarImportacion, bloqueadasAlMover, exportarCsv, loteEliminar, loteEstado, loteFechas, loteNegocio, lotePrioridad, loteResponsable, loteTamano, rangoSeleccion, type Estado, type Prioridad, type Tamano, type FilaImp, type Mapa,
  nomCorto, pendientesAlMover, personasConocidas, ponerEtiqueta, quitarNota, subtareasDe, negocioDe, type Nota, type Subtarea, EST, fechaISO, filtrar, statsNegocios, unicos, type Bloque, type Documento,
} from '@gestor/core';
import { crearAlmacenamientoWeb } from './almacenamiento/web';
import { crearAlmacenamientoEscritorio, localEscritorio } from './almacenamiento/escritorio';
import { localWeb } from './almacenamiento/local';
import { Sesion } from './estado/sesion';
import { useUI } from './estado/ui';
import { Banner } from './componentes/Banner';
import { BarraFiltros } from './componentes/BarraFiltros';
import { Cabecera } from './componentes/Cabecera';
import { FormActividad, type Preset } from './componentes/FormActividad';
import { FormMeta } from './componentes/FormMeta';
import { PanelNegocios } from './componentes/PanelNegocios';
import { TarjetaMeta } from './componentes/TarjetaMeta';
import { Calendario } from './vistas/Calendario';
import { Carga } from './vistas/Carga';
import { Gantt } from './vistas/Gantt';
import { IconoBloque, Lista } from './vistas/Lista';
import { Mias } from './vistas/Mias';
import { BarraMasiva } from './componentes/BarraMasiva';
import { DialogoExportar } from './componentes/DialogoExportar';
import { DialogoImportar } from './componentes/DialogoImportar';
import { DialogoMasivo, type CambioMasivo, type TipoMasivo } from './componentes/DialogoMasivo';
import { BarraPresentacion } from './componentes/BarraPresentacion';
import { DialogoAtajos } from './componentes/DialogoAtajos';
import { DialogoIcs } from './componentes/DialogoIcs';
import { DialogoUsuario } from './componentes/DialogoUsuario';
import { DialogoImagenes } from './componentes/DialogoImagenes';
import { DialogoEtiquetasAdmin } from './componentes/DialogoEtiquetasAdmin';
import { DialogoRenombrar } from './componentes/DialogoRenombrar';
import { DialogoSprint } from './componentes/DialogoSprint';
import { DialogoManual } from './componentes/DialogoManual';
import { DialogoBitacora } from './componentes/DialogoBitacora';
import { DialogoSemanal } from './componentes/DialogoSemanal';
import { DialogoReporte } from './componentes/DialogoReporte';
import { DialogoNotas } from './componentes/DialogoNotas';
import { DialogoNovedades } from './componentes/DialogoNovedades';
import { DialogoRespaldos } from './componentes/DialogoRespaldos';
import { PopEtiquetas } from './componentes/PopEtiquetas';
import { PopSubtareas } from './componentes/PopSubtareas';
import type { Acciones, Seleccion } from './vistas/acciones';
import { Tablero } from './vistas/Tablero';

const AUTO_REFRESCO = 15e3;
const leerUsuario = () => { try { return localStorage.getItem('gestor.usuario') || ''; } catch { return ''; } };

export function App() {
  const [toast, setToast] = useState('');
  const [pideUsuario, setPideUsuario] = useState<{ resolver(n: string | null): void } | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const sesion = useMemo(() => { const api = window.gestorEscritorio, local = api ? localEscritorio(api) : localWeb(); return new Sesion({
    almacen: api ? crearAlmacenamientoEscritorio(api) : crearAlmacenamientoWeb(local),
    local,
    usuario: leerUsuario(),
    guardarUsuario: u => { try { localStorage.setItem('gestor.usuario', u); } catch { /* sin almacenamiento local */ } },
    ui: {
      confirmar: async m => window.confirm(m),
      avisar: m => { setToast(m); clearTimeout(t.current); t.current = setTimeout(() => setToast(''), 3500); },
      pedirUsuario: () => new Promise<string | null>(resolver => setPideUsuario({ resolver })),
    },
  }); }, []);
  const e = useSyncExternalStore(sesion.subscribe, sesion.getSnapshot);
  const { doc, modo } = e;
  const editando = modo === 'edicion';
  const ed = editando ? sesion : undefined;
  const ui = useUI(e.nombre, doc?.meta.proyecto ?? '');
  const [dlg, setDlg] = useState<'novedades' | 'respaldos' | 'bitacora' | 'reporte' | 'semanal' | 'importar' | 'exportar' | 'renombrar' | 'etqadmin' | 'sprint' | 'ics' | 'atajos' | 'manual' | null>(null);
  const [bitAct, setBitAct] = useState<number | null>(null);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const ultimoSel = useRef<number | null>(null);
  const [masivo, setMasivo] = useState<TipoMasivo | null>(null);
  const [etqMasivo, setEtqMasivo] = useState<HTMLElement | null>(null);
  const [notasId, setNotasId] = useState<number | null>(null);
  const [imgId, setImgId] = useState<number | null>(null);
  const [subs, setSubs] = useState<{ id: number; ancla: HTMLElement } | null>(null);
  const [etq, setEtq] = useState<{ id: number; ancla: HTMLElement } | null>(null);
  const [form, setForm] = useState<{ id: number | null; preset?: Preset } | null>(null);
  const [formMeta, setFormMeta] = useState<'editar' | 'nuevo' | null>(null);
  const [pres, setPres] = useState(false);
  const [presZoom, setPresZoom] = useState(() => { try { return Math.min(2, Math.max(1, parseFloat(localStorage.getItem('gestor.presZoom') || '') || 1.3)); } catch { return 1.3; } });
  const presNeg = useRef<string[] | null>(null), presFs = useRef(false);
  const [, setReloj] = useState(0);
  const [renNeg, setRenNeg] = useState<string | undefined>(undefined);
  const [negElegido, setNegElegido] = useState('');
  const hoy = fechaISO(new Date());

  useEffect(() => { void sesion.iniciar(); }, [sesion]);

  // En lectura, el archivo se vuelve a leer solo cada 15 s
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden && sesion.getSnapshot().modo === 'lectura') void sesion.refrescar({ silencioso: true }); }, AUTO_REFRESCO);
    return () => clearInterval(id);
  }, [sesion]);

  // Al cerrar la pestaña se intenta soltar el archivo; Ctrl/Cmd+Z deshace; Escape cierra paneles
  useEffect(() => {
    const salir = () => { void sesion.cerrarVisita(); void sesion.soltar(); };
    const tecla = (ev: KeyboardEvent) => {
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      const k = ev.key.toLowerCase();
      if ((k !== 'z' && k !== 'y') || (ev.target as HTMLElement).closest('input, textarea, select') || document.querySelector('dialog[open]')) return;
      ev.preventDefault();
      if (k === 'y' || ev.shiftKey) sesion.rehacer(); else sesion.deshacer();
    };
    window.addEventListener('pagehide', salir); window.addEventListener('keydown', tecla);
    return () => { window.removeEventListener('pagehide', salir); window.removeEventListener('keydown', tecla); };
  }, [sesion]);

  const porNegocio = ui.agrupar === 'negocio';
  const lista = useMemo(() => (doc ? filtrar(doc, ui.filtros, ui.orden, {
    hoy, conNovedades: new Set(Object.keys(e.novedades.porId).map(Number)), ignorarResp: ui.vista === 'mias',
  }) : []), [doc, ui.filtros, ui.orden, hoy, e.novedades, ui.vista]);
  const bloques = useMemo<Bloque[]>(() => {
    if (!doc) return [];
    const favL = lista.filter(a => ui.favs.has(a.id)), resto = lista.filter(a => !ui.favs.has(a.id));
    if (!ui.agrupar) return [{ g: null, titulo: '', items: [...favL, ...resto] }];
    return [...(favL.length ? [{ g: '__fav', titulo: 'Mis favoritas', items: favL }] : []), ...armarBloques(resto, ui.agrupar, doc.actividades)];
  }, [doc, lista, ui.agrupar, ui.favs]);
  const stats = useMemo(() => (doc ? statsNegocios(doc, lista, hoy) : []), [doc, lista, hoy]);
  const analisis = useMemo(() => (doc ? analizarMeta(doc, hoy) : null), [doc, hoy]);
  const personas = useMemo(() => unicos([e.usuario, ...(doc?.actividades.map(a => a.responsable) ?? [])]), [doc, e.usuario]);
  const nBacklog = doc ? doc.actividades.filter(a => EST(a) === 'Backlog').length : 0;

  const filtraPanel = !porNegocio || ['mias', 'cal', 'carga'].includes(ui.vista);
  const activoPanel = filtraPanel ? (ui.filtros.neg.length === 1 ? ui.filtros.neg[0] : '') : negElegido;
  const elegirNegocio = (g: string) => {
    if (filtraPanel) { ui.setFiltros({ neg: g && g !== '__fav' ? [g] : [] }); return; }
    if (!g) { window.scrollTo({ top: 0, behavior: 'smooth' }); setNegElegido(''); return; }
    ui.abrirGrupo(g);
    setNegElegido(g);
    setTimeout(() => { const el = document.querySelector(`tr.grupo[data-g="${CSS.escape(g)}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  };

  const abrirForm = (id: number | null, preset: Preset = {}) => {
    if (!editando) return;
    const unico = ui.filtros.neg.length === 1 ? ui.filtros.neg[0] : '';
    setForm({ id, preset: id ? undefined : { negocio: unico && unico !== SIN_NEGOCIO ? unico : '', ...preset } });
  };
  const eliminar = (id: number) => {
    const a = doc?.actividades.find(x => x.id === id);
    if (!a || !window.confirm(`¿Eliminar "${a.actividad.split('\n')[0]}"?\n\nSi ya no se va a hacer, considera marcarla como "Cancelado" para que quede en el reporte.`)) return;
    sesion.editar(d => ({ ...d, actividades: d.actividades.filter(x => x.id !== id), notas: d.notas.filter(n => n.act !== id) }));
    setForm(null);
  };
  const escritura = estadoEscritura({ hayArchivo: !!doc, masNuevo: e.masNuevo, modo, puedeEscribir: e.puedeEscribir, candado: doc?.candado ?? null, usuario: e.usuario, versionTxt: doc?.meta.versionTxt });

  // Selección múltiple (sólo con el archivo tomado); se limpia al soltar y se poda si las actividades desaparecen
  useEffect(() => { if (!editando) { setSeleccion(s => (s.size ? new Set() : s)); setEtqMasivo(null); } }, [editando]);
  useEffect(() => { if (doc) setSeleccion(s => { const ids = new Set(doc.actividades.map(a => a.id)), n = new Set([...s].filter(i => ids.has(i))); return n.size === s.size ? s : n; }); }, [doc]);
  useEffect(() => {
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && !document.querySelector('dialog[open]')) setSeleccion(s => (s.size ? new Set() : s)); };
    window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc);
  }, []);
  const ordenVisible = useMemo(() => lista.map(a => a.id), [lista]);
  const sel: Seleccion | undefined = editando ? {
    ids: seleccion,
    alternar: (id, marcar, mayus) => {
      setSeleccion(s => {
        const n = new Set(s), ids = mayus && ultimoSel.current != null ? rangoSeleccion(ordenVisible, ultimoSel.current, id) : [id];
        ids.forEach(i => (marcar ? n.add(i) : n.delete(i))); return n;
      });
      ultimoSel.current = id;
    },
    grupo: ids => setSeleccion(s => { const n = new Set(s), todas = ids.every(i => s.has(i)); ids.forEach(i => (todas ? n.delete(i) : n.add(i))); return n; }),
  } : undefined;
  const lote = (fn: (d: Documento) => Documento, desc: string) => {
    const n = seleccion.size; if (!n) return;
    sesion.editar(fn); sesion.avisar(`${desc} · ${n} ${n === 1 ? 'actividad' : 'actividades'}`);
  };
  const masivas = {
    estado: (est: Estado) => {
      const bl = doc ? bloqueadasAlMover(doc, seleccion, est) : [];
      if (bl.length && !window.confirm(`${bl.length} de las actividades elegidas ${bl.length === 1 ? 'depende' : 'dependen'} de otras que aún no terminan:\n\n${bl.slice(0, 8).map(a => `• #${a.id} ${nomCorto(a)} (espera a ${pendientesAlMover(doc!.actividades, a, est).map(d => '#' + d.id).join(', ')})`).join('\n')}${bl.length > 8 ? `\n… y ${bl.length - 8} más` : ''}\n\n¿Pasarlas a ${est} de todos modos?`)) return;
      lote(d => loteEstado(d, seleccion, est), `Estado: ${est}`);
    },
    tamano: (t: Tamano | '') => lote(d => loteTamano(d, seleccion, t), t ? `Tamaño: ${t}` : 'Sin tamaño'),
    prioridad: (p: Prioridad | '') => lote(d => lotePrioridad(d, seleccion, p), p ? `Prioridad: ${p}` : 'Sin prioridad'),
    etiquetas: (el: HTMLElement) => setEtqMasivo(x => (x ? null : el)),
    cambio: (t: TipoMasivo) => setMasivo(t),
    favoritas: () => { ui.alternarFavs([...seleccion]); const n = seleccion.size; sesion.avisar(`${[...seleccion].every(i => ui.favs.has(i)) ? 'Quitadas de' : 'Agregadas a'} tus favoritas · ${n} ${n === 1 ? 'actividad' : 'actividades'}`); },
    eliminar: () => {
      if (!doc || !seleccion.size) return;
      const l = doc.actividades.filter(a => seleccion.has(a.id)), nn = doc.notas.filter(n => seleccion.has(n.act)).length;
      if (!window.confirm(`¿Eliminar ${l.length} ${l.length === 1 ? 'actividad' : 'actividades'}${nn ? ` y ${nn} ${nn === 1 ? 'nota' : 'notas'}` : ''}?\n\n${l.slice(0, 8).map(a => '• ' + a.actividad.split('\n')[0]).join('\n')}${l.length > 8 ? `\n… y ${l.length - 8} más` : ''}\n\nSi te equivocas, puedes recuperarlas con Deshacer (Ctrl+Z) o desde Respaldos.`)) return;
      const k = l.length; sesion.editar(d => loteEliminar(d, seleccion)); setSeleccion(new Set()); sesion.avisar(`${k} ${k === 1 ? 'actividad eliminada' : 'actividades eliminadas'}`);
    },
    todas: () => setSeleccion(s => new Set([...s, ...ordenVisible])),
    limpiar: () => setSeleccion(new Set()),
  };
  const aplicarMasivo = (c: CambioMasivo) => {
    setMasivo(null);
    if (c.tipo === 'responsable') lote(d => loteResponsable(d, seleccion, c.valor), c.valor ? `Responsable: ${c.valor}` : 'Sin responsable');
    else if (c.tipo === 'negocio') { lote(d => loteNegocio(d, seleccion, c.valor), `Negocio: ${c.valor}`); ui.abrirGrupo(c.valor); }
    else lote(d => loteFechas(d, seleccion, c.cambio), c.cambio.op === 'mover' ? `Fechas movidas ${c.cambio.dias > 0 ? '+' : ''}${c.cambio.dias} días` : c.cambio.op === 'quitar' ? 'Fechas quitadas' : c.cambio.op === 'ini' ? `Inicio: ${c.cambio.fecha}` : `Fin: ${c.cambio.fecha}`);
  };
  const importar = async (filas: FilaImp[], mapa: Mapa) => {
    if (!doc || !filas.some(f => f.accion !== 'omitir')) return;
    setDlg(null);
    if (modo !== 'edicion') { await sesion.tomar(); if (sesion.getSnapshot().modo !== 'edicion') return; }
    await sesion.respaldar('Antes de importar');
    let r = { nuevas: 0, actualizadas: 0 };
    sesion.editar(d => { const x = aplicarImportacion(d, filas, mapa); r = x; return x.doc; });
    sesion.avisar(`Importación lista: ${r.nuevas} ${r.nuevas === 1 ? 'actividad nueva' : 'actividades nuevas'}${r.actualizadas ? `, ${r.actualizadas} ${r.actualizadas === 1 ? 'actualizada' : 'actualizadas'}` : ''}`);
  };
  const exportar = (que: 'todas' | 'filtradas', conNotas: boolean) => {
    if (!doc) return;
    const l = que === 'filtradas' ? lista : doc.actividades, nombre = `${(doc.meta.proyecto || e.nombre.replace(/\.md$/i, '')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'actividades'}-${hoy}.csv`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportarCsv(doc, l, conNotas, hoy)], { type: 'text/csv' })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setDlg(null); sesion.avisar(`${l.length} ${l.length === 1 ? 'actividad exportada' : 'actividades exportadas'}`);
  };

  /* ---------- modo presentación ---------- */
  const negociosPres = ['', ...unicos((doc?.actividades ?? []).map(negocioDe)).sort((a, b) => (a === SIN_NEGOCIO ? 1 : b === SIN_NEGOCIO ? -1 : a.localeCompare(b, 'es')))];
  const entrarPres = () => {
    if (!doc) { sesion.avisar('Abre primero un archivo .md'); return; }
    if (pres) return;
    presNeg.current = [...ui.filtros.neg]; presFs.current = !!document.fullscreenElement;
    if (ui.vista === 'mias') ui.setVista('kanban');
    setSeleccion(new Set()); setPres(true);
    if (!presFs.current) void document.documentElement.requestFullscreen?.().catch(() => {});
    sesion.avisar('Modo presentación · ← → para pasar de negocio · Esc para salir');
  };
  const salirPres = () => {
    if (!pres) return;
    setPres(false);
    if (document.fullscreenElement && !presFs.current) void document.exitFullscreen?.().catch(() => {});
    presFs.current = false;
    if (presNeg.current) { ui.setFiltros({ neg: presNeg.current }); presNeg.current = null; }
  };
  const pasarNegocio = (d: number) => {
    const act = ui.filtros.neg.length === 1 ? ui.filtros.neg[0] : '', i = Math.max(0, negociosPres.indexOf(act)), sig = negociosPres[(i + d + negociosPres.length) % negociosPres.length];
    ui.setFiltros({ neg: sig ? [sig] : [] }); window.scrollTo(0, 0);
  };
  const zoomPres = (d: number) => {
    const z = Math.round(Math.min(2, Math.max(1, presZoom + d)) * 10) / 10;
    setPresZoom(z); try { localStorage.setItem('gestor.presZoom', String(z)); } catch { /* sin almacenamiento local */ }
    sesion.avisar(`Tamaño ${Math.round(z * 100)}%`);
  };
  useEffect(() => {
    document.body.classList.toggle('presentando', pres);
    document.documentElement.style.setProperty('--pres-zoom', String(presZoom));
    if (!pres) return;
    const id = setInterval(() => setReloj(x => x + 1), 30e3);
    const fs = () => { if (!document.fullscreenElement) salirPres(); };
    document.addEventListener('fullscreenchange', fs);
    return () => { clearInterval(id); document.removeEventListener('fullscreenchange', fs); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pres, presZoom]);

  /* ---------- atajos de teclado ---------- */
  useEffect(() => {
    const VT = ['lista', 'gantt', 'kanban', 'cal', 'mias', 'carga'] as const;
    const tecla = (ev: KeyboardEvent) => {
      if (ev.isComposing) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); if (editando) { sesion.guardarAhora(); sesion.avisar('Guardado'); } return; }
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      const t = ev.target as HTMLElement;
      if (t.closest?.('input, textarea, select, [contenteditable="true"]')) {
        if (ev.key === 'Escape' && t.closest('.buscar') && ui.filtros.texto) { ui.setFiltros({ texto: '' }); (t as HTMLInputElement).blur(); }
        return;
      }
      const hayDialogo = !!document.querySelector('dialog[open]');
      if (ev.key === '?') { ev.preventDefault(); if (dlg === 'atajos') setDlg(null); else if (!hayDialogo) setDlg('atajos'); return; }
      if (pres && !hayDialogo) {
        if (ev.key === 'ArrowRight') { ev.preventDefault(); pasarNegocio(1); return; }
        if (ev.key === 'ArrowLeft') { ev.preventDefault(); pasarNegocio(-1); return; }
        if (ev.key === 'Escape') { ev.preventDefault(); salirPres(); return; }
        if (ev.key === '+' || ev.key === '=') { ev.preventDefault(); zoomPres(0.1); return; }
        if (ev.key === '-') { ev.preventDefault(); zoomPres(-0.1); return; }
      }
      if (hayDialogo || subs || etq) return;
      const k = ev.key.toLowerCase();
      if (ev.key === '/') { ev.preventDefault(); const i = document.querySelector<HTMLInputElement>('.filtros .buscar input'); i?.focus(); i?.select(); }
      else if (k === 'f') { ev.preventDefault(); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen?.().catch(() => {}); }
      else if (k === 'p') { ev.preventDefault(); if (pres) salirPres(); else entrarPres(); }
      else if (k === 'n') { ev.preventDefault(); if (!doc) sesion.avisar('Abre primero un archivo .md'); else if (!editando) sesion.avisar('Toma el archivo para agregar actividades'); else abrirForm(null); }
      else if (/^[1-6]$/.test(ev.key) && doc) { ev.preventDefault(); ui.setVista(VT[+ev.key - 1]); }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  const abrirRenombrar = (g?: string) => {
    if (!doc) return;
    if (!editando) { sesion.avisar('Toma el archivo para renombrar negocios'); return; }
    setRenNeg(g); setDlg('renombrar');
  };
  const renombrarNeg = (viejo: string, nuevo: string) => {
    const r = renombrarNegocio(doc!, viejo, nuevo);
    sesion.editar(() => r.doc);
    const vg = viejo || SIN_NEGOCIO;
    if (ui.filtros.neg.includes(vg)) ui.setFiltros({ neg: ui.filtros.neg.map(x => (x === vg ? r.nombre : x)) });
    ui.abrirGrupo(r.nombre);
    sesion.avisar(`${vg} → ${r.nombre} · ${r.n} ${r.n === 1 ? 'actividad' : 'actividades'}`);
  };
  const renombrarEtq = (viejo: string, nuevo: string) => {
    const r = renombrarEtiqueta(doc!, viejo, nuevo);
    if (r.doc === doc) return;
    if (r.existente && !window.confirm(`La etiqueta «${r.existente}» ya existe. ¿Juntar «${viejo}» con ella?`)) return;
    sesion.editar(() => r.doc);
    const k = ui.filtros.etq.find(x => normaliza(x) === normaliza(viejo)); if (k) ui.setFiltros({ etq: ui.filtros.etq.map(x => (x === k ? r.nombre : x)) });
    sesion.avisar(`«${viejo}» → «${r.nombre}» · ${r.n} ${r.n === 1 ? 'actividad' : 'actividades'}`);
  };
  const borrarEtq = (t: string) => {
    const n = doc!.actividades.filter(a => a.etiquetas.some(x => normaliza(x) === normaliza(t))).length;
    if (!window.confirm(`¿Quitar la etiqueta «${t}» de ${n} ${n === 1 ? 'actividad' : 'actividades'}?\n\nSe puede deshacer con Ctrl+Z.`)) return;
    sesion.editar(d => borrarEtiqueta(d, t));
    ui.setFiltros({ etq: ui.filtros.etq.filter(x => normaliza(x) !== normaliza(t)) });
    sesion.avisar(`Etiqueta «${t}» borrada`);
  };
  const crearSprintDe = async (o: OpcionesSprint) => {
    setDlg(null);
    const nuevo = crearSprint(doc!, o, e.usuario, e.nombre);
    const nombre = (o.nombre || 'sprint').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md';
    if (await sesion.nuevoArchivo(nuevo, nombre, 'Antes de crear el sprint')) sesion.avisar(`Sprint creado con ${nuevo.actividades.length} ${nuevo.actividades.length === 1 ? 'actividad' : 'actividades'}. Ya estás editando el archivo nuevo.`);
  };

  /** Lleva a la actividad en la vista actual (quita filtros o abre su grupo si hace falta) y la resalta */
  const irA = (id: number) => {
    const a = doc?.actividades.find(x => x.id === id);
    if (!a) return;
    if (ui.vista === 'mias' && (a.responsable || '') !== (ui.persona || e.usuario)) ui.setVista('lista');
    if (!lista.some(x => x.id === id)) { ui.limpiarFiltros(); ui.setFiltros({ verBacklog: true }); }
    ui.abrirGrupo(negocioDe(a)); ui.abrirGrupo('__fav');
    setTimeout(() => {
      const el = document.querySelector(`#tabla tr[data-id="${id}"], .k-tarjeta[data-id="${id}"], .c-chip[data-id="${id}"], .g-fila[data-id="${id}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('destello'); setTimeout(() => el.classList.remove('destello'), 2400);
    }, 60);
  };
  const acc: Acciones = {
    notas: id => { setSubs(null); setEtq(null); setNotasId(id); },
    imgs: id => { setSubs(null); setEtq(null); setImgId(id); },
    subs: (id, ancla) => { setEtq(null); setSubs(s => (s && s.id === id ? null : { id, ancla })); },
    etq: (id, ancla) => {
      if (!editando) { sesion.avisar('Toma el archivo para editar las etiquetas'); return; }
      setSubs(null); setEtq(s => (s && s.id === id ? null : { id, ancla }));
    },
    ir: irA,
  };
  const agregarNotaA = async (id: number, texto: string) => {
    const ok = await sesion.editarSinTomar(d => agregarNota(d, id, e.usuario || 'Sin nombre', texto));
    if (ok) {
      const ms = [...new Set(mencionesEn(texto, personasConocidas(doc!, e.usuario)).map(m => m.nombre))].filter(p => p !== e.usuario);
      sesion.avisar(ms.length ? `Nota agregada · ${ms.join(', ')} ${ms.length === 1 ? 'la verá' : 'la verán'} en sus Novedades` : 'Nota agregada');
    }
    return ok;
  };
  const borrarNota = async (n: Nota) => {
    if (window.confirm('¿Eliminar tu nota?') && (await sesion.editarSinTomar(d => quitarNota(d, n), 'el cambio'))) sesion.avisar('Nota eliminada');
  };
  const cambiarSubs = (id: number, fn: (l: Subtarea[]) => Subtarea[], aviso?: string) =>
    sesion.editarSinTomar(d => ({ ...d, actividades: d.actividades.map(a => (a.id === id ? conSubtareas(a, fn(subtareasDe(a).map(x => ({ ...x })))) : a)) }), 'la subtarea')
      .then(ok => { if (ok && aviso) sesion.avisar(aviso); return ok; });
  const terminarDesdeSubs = async (id: number) => {
    const a = doc?.actividades.find(x => x.id === id);
    if (!a) return;
    const pend = pendientesAlMover(doc!.actividades, a, 'Terminado');
    if (pend.length && !window.confirm(`"${nomCorto(a)}" depende de:\n\n${pend.map(d => `• #${d.id} ${nomCorto(d)} (${d.estado})`).join('\n')}\n\nAún no terminan. ¿Pasarla a Terminado de todos modos?`)) return;
    if (await sesion.editarSinTomar(d => ({ ...d, actividades: d.actividades.map(x => (x.id === id ? conEstado(x, 'Terminado') : x)) }), 'el cambio')) { sesion.avisar(`#${id} marcada como Terminado`); setSubs(null); }
  };

  const msgVacio = !e.nombre ? 'Abre un .md.' : doc?.actividades.length ? 'Nada coincide con los filtros.'
    : editando ? 'Aún no hay actividades. Usa "Nueva actividad".' : 'Aún no hay actividades. Toma el archivo para agregar.';
  const novIds = e.novedades.porId;
  
  return (
    <div className="wrap">
      {pres && doc && analisis && <BarraPresentacion proyecto={doc.meta.proyecto || e.nombre.replace(/\.md$/i, '')} pct={analisis.pctAv} ritmo={analisis.ritmo?.txt} vencidas={analisis.vencidas} vista={ui.vista} onVista={ui.setVista}
        fecha={(() => { const f = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }); return f.charAt(0).toUpperCase() + f.slice(1) + ' · ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); })()}
        negocio={ui.filtros.neg.length > 1 ? `${ui.filtros.neg.length} negocios` : ui.filtros.neg.length === 1 ? `${ui.filtros.neg[0]} · ${negociosPres.indexOf(ui.filtros.neg[0])} de ${negociosPres.length - 1}` : 'Todos los negocios'}
        onNegocio={pasarNegocio} onZoom={zoomPres} onSalir={salirPres} />}
      <Cabecera titulo={doc?.meta.proyecto || (e.nombre ? e.nombre.replace(/\.md$/i, '') : 'Sin proyecto abierto')} archivo={e.nombre} hayArchivo={!!doc} usuario={e.usuario}
        novedades={e.novedades.total} menciones={e.novedades.menciones.length} tema={ui.tema}
        onAbrir={() => sesion.abrir()} onRefrescar={() => sesion.refrescar()} onNovedades={() => setDlg(dlg === 'novedades' ? null : 'novedades')} onBitacora={() => { setBitAct(null); setDlg('bitacora'); }} onManual={() => setDlg('manual')}
        onReporte={async () => { if (modo === 'lectura') await sesion.refrescar({ silencioso: true }); setDlg('reporte'); }}
        onTema={ui.setTema} onUsuario={() => sesion.cambiarUsuario()}
        extras={[{ titulo: 'Nuevo .md', desc: 'Archivo vacío para un proyecto nuevo', onClick: () => setFormMeta('nuevo') }, ...(doc ? [{ titulo: 'Nuevo sprint', desc: 'Copia actividades elegidas a un archivo nuevo', onClick: () => setDlg('sprint') }, { titulo: 'Importar desde Excel o CSV', desc: 'Carga actividades de un archivo o pegadas de Excel', onClick: () => setDlg('importar') }, { titulo: 'Exportar a CSV', desc: 'Las actividades en un archivo para Excel', onClick: () => setDlg('exportar') }, { titulo: 'Reporte semanal', desc: 'Resumen de la semana listo para un correo', onClick: () => setDlg('semanal') }, { titulo: 'Exportar al calendario (.ics)', desc: 'Fechas fin para Outlook, Google o Apple', onClick: () => setDlg('ics') }, { titulo: 'Renombrar negocio', desc: 'Cambia el nombre en todas sus actividades', onClick: () => abrirRenombrar() }, { titulo: 'Administrar etiquetas', desc: 'Renombrar, recolorear o borrar etiquetas', onClick: () => setDlg('etqadmin') }, { titulo: 'Respaldos', desc: 'Ver o restaurar versiones anteriores', onClick: () => setDlg('respaldos') }, { titulo: 'Descargar copia .md', desc: 'Guarda la versión actual en tu computadora', onClick: () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toMD(doc)], { type: 'text/markdown' })); a.download = e.nombre || 'actividades.md'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); } }] : []), { titulo: 'Atajos de teclado', desc: 'Tecla ? en cualquier momento', onClick: () => setDlg('atajos') }]} />
      <Banner hayArchivo={!!doc} modo={modo} masNuevo={e.masNuevo} versionArchivo={doc?.meta.versionTxt || String(doc?.meta.version ?? '')} puedeEscribir={e.puedeEscribir}
        candado={doc?.candado ?? null} usuario={e.usuario} guardado={e.guardado} puedeDeshacer={e.puedeDeshacer} puedeRehacer={e.puedeRehacer}
        onTomar={() => sesion.tomar()} onSoltar={() => sesion.soltar()} onLiberar={() => sesion.liberar()} onDeshacer={() => sesion.deshacer()} onRehacer={() => sesion.rehacer()} onAbrir={() => sesion.abrir()} onManual={() => setDlg('manual')} />
      {e.error && <div className="banner otro" role="alert"><span className="b-ico" /><div>{e.error}</div></div>}

      <div className={`layout ${doc ? (ui.compacto ? 'compacto' : '') : 'sin-lateral'}`}>
        {doc && <PanelNegocios stats={stats} total={doc.actividades.length} compacto={ui.compacto} onCompacto={ui.setCompacto} activo={activoPanel} filtra={filtraPanel}
          onElegir={elegirNegocio} favs={ui.favs.size && ui.vista !== 'mias' ? { n: ui.favs.size, visible: lista.some(a => ui.favs.has(a.id)) } : null} />}
        <main>
          {doc && analisis && <TarjetaMeta doc={doc} a={analisis} editando={editando} onEditar={() => setFormMeta('editar')} verAvance={ui.verAvance} onVerAvance={ui.setVerAvance}
          unidad={ui.unidadAvance} onUnidad={ui.setUnidadAvance} avance={datosAvance(doc, ui.unidadAvance, hoy)} />}
          <div className="card">
            {doc ? (
              <>
                <BarraFiltros doc={doc} ui={ui} personas={personas} persona={ui.persona || e.usuario} editando={editando} nBacklog={nBacklog} onNueva={() => abrirForm(null)} onPresentar={entrarPres} />
                {ui.vista === 'lista' && <Lista sel={sel} renombrar={editando && porNegocio ? abrirRenombrar : undefined} doc={doc} bloques={bloques} texto={ui.filtros.texto} edicion={ed} novIds={novIds} orden={ui.orden} onOrden={ui.setOrden}
                  colsOcultas={ui.colsOcultas} agrupaPorNegocio={porNegocio} hayAgrupacion={!!ui.agrupar} colapsados={ui.colapsados} onGrupo={ui.alternarGrupo}
                  favs={ui.favs} onFav={ui.alternarFav} acc={acc} onEditar={id => abrirForm(id)} onEliminar={eliminar}
                  onFiltrarEtq={t => ui.setFiltros({ etq: [t] })} msgVacio={msgVacio} />}
                {ui.vista === 'kanban' && <Tablero sel={sel} renombrar={editando && porNegocio ? abrirRenombrar : undefined} doc={doc} bloques={bloques} texto={ui.filtros.texto} agrupar={ui.agrupar} ocultaBacklog={backlogOculto(ui.filtros)} edicion={ed} novIds={novIds}
                  colapsados={ui.colapsados} onGrupo={ui.alternarGrupo} favs={ui.favs} onFav={ui.alternarFav} acc={acc} onEditar={id => abrirForm(id)} aviso={m => sesion.avisar(m)}
                  msgVacio={msgVacio} icono={b => <IconoBloque b={b} doc={doc} />} />}
                {ui.vista === 'gantt' && <Gantt sel={sel} renombrar={editando && porNegocio ? abrirRenombrar : undefined} doc={doc} bloques={bloques} texto={ui.filtros.texto} zoom={ui.zoom} hoy={hoy} edicion={ed} novIds={novIds} colapsados={ui.colapsados} onGrupo={ui.alternarGrupo}
                  favs={ui.favs} onFav={ui.alternarFav} acc={acc} onEditar={id => abrirForm(id)} aviso={m => sesion.avisar(m)} msgVacio={msgVacio} agrupaPorNegocio={porNegocio}
                  icono={b => <IconoBloque b={b} doc={doc} />} />}
                {ui.vista === 'cal' && <Calendario doc={doc} lista={lista} hoy={hoy} edicion={ed} novIds={novIds} favs={ui.favs} onEditar={id => abrirForm(id)} onNotas={acc.notas}
                  onNueva={fin => abrirForm(null, { fin })} aviso={m => sesion.avisar(m)} msgVacio={msgVacio} />}
                {ui.vista === 'carga' && <Carga doc={doc} lista={lista} hoy={hoy} onIr={id => { ui.setVista('lista'); setTimeout(() => irA(id), 80); }} msgVacio={msgVacio} />}
                {ui.vista === 'mias' && <Mias sel={sel} doc={doc} lista={lista} quien={ui.persona || e.usuario} usuario={e.usuario} hoy={hoy} edicion={ed} novIds={novIds} favs={ui.favs} onFav={ui.alternarFav}
                  acc={acc} onEditar={id => abrirForm(id)} onNombre={() => sesion.cambiarUsuario()} hayFiltros={false} msgVacio={msgVacio} />}
                <div className="resumen">
                  <span>Total: {analisis?.total}</span><span>Negocios: {unicos(doc.actividades.map(a => a.negocio)).length}</span>
                  {ESTADOS.map(s => <span key={s}><i className={`f-${({ Backlog: 'gris', Planeado: 'azul', 'En progreso': 'amar', Terminado: 'verde', Cancelado: 'rojo' } as Record<string, string>)[s]}`} />{s}: {analisis?.cuenta[s]}</span>)}
                  <span className="es-rojo">Vencidas: {analisis?.vencidas}</span>
                </div>
              </>
            ) : <div className="vacio"><p>Abre el archivo <code>.md</code> de tu proyecto para empezar.</p></div>}
          </div>
        </main>
      </div>

      {doc && notasId !== null && <DialogoNotas key={notasId} doc={doc} id={notasId} usuario={e.usuario} escritura={escritura} nuevas={new Set(e.novedades.notas.map(claveNota))}
        onAgregar={t => agregarNotaA(notasId, t)} onBorrar={borrarNota} onCerrar={() => setNotasId(null)} />}
      {doc && dlg === 'novedades' && <DialogoNovedades doc={doc} nov={e.novedades} usuario={e.usuario} vistoFecha={e.vistoFecha} acc={acc}
        onVisto={id => sesion.marcarVisto(id)} onNotaVista={n => sesion.marcarNotasVistas([n])} onTodo={() => { sesion.marcarVisto(); setDlg(null); sesion.avisar('Todo marcado como visto'); }}
        onBitacora={() => { setBitAct(null); setDlg('bitacora'); }} onSoloNovedades={() => { ui.setFiltros({ est: ['Con novedades'] }); setDlg(null); sesion.avisar('Mostrando solo actividades con novedades'); }} onCerrar={() => setDlg(null)} />}
      {doc && imgId !== null && <DialogoImagenes key={imgId} doc={doc} id={imgId} archivo={e.nombre} almacen={sesion.almacen} escritura={escritura}
        onAgregar={f => sesion.agregarImagenes(imgId, f)} onBorrar={img => { if (window.confirm(`¿Eliminar la imagen "${img.nombre}"?\n\nTambién se borra el archivo de la carpeta ${carpetaImagenes(e.nombre)}.`)) void sesion.borrarImagen(img.archivo); }} onCerrar={() => setImgId(null)} />}
      {doc && dlg === 'bitacora' && <DialogoBitacora key={String(bitAct)} doc={doc} act={bitAct} onIr={irA} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'reporte' && <DialogoReporte doc={doc} usuario={e.usuario} archivo={e.nombre} onSemanal={() => setDlg('semanal')} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'semanal' && <DialogoSemanal doc={doc} archivo={e.nombre} aviso={m => sesion.avisar(m)} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'ics' && <DialogoIcs doc={doc} archivo={e.nombre} usuario={e.usuario} visibles={lista} onCerrar={() => setDlg(null)}
        onExportar={(nombre, contenido, n) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenido], { type: 'text/calendar' })); a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); setDlg(null); sesion.avisar(`${n} ${n === 1 ? 'evento' : 'eventos'} en ${nombre}. Ábrelo para agregarlo a Outlook`); }} />}
      {dlg === 'manual' && <DialogoManual onCerrar={() => setDlg(null)} />}
      {dlg === 'atajos' && <DialogoAtajos onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'importar' && <DialogoImportar doc={doc} editando={editando} onImportar={(f, m) => void importar(f, m)} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'exportar' && <DialogoExportar total={doc.actividades.length} visibles={lista.length} onExportar={exportar} onCerrar={() => setDlg(null)} />}
      {doc && editando && <BarraMasiva n={seleccion.size} todasFav={seleccion.size > 0 && [...seleccion].every(i => ui.favs.has(i))} hayMasVisibles={ordenVisible.some(i => !seleccion.has(i))} acc={masivas} />}
      {doc && masivo && seleccion.size > 0 && <DialogoMasivo doc={doc} tipo={masivo} n={seleccion.size} onAplicar={aplicarMasivo} onCerrar={() => setMasivo(null)} />}
      {doc && etqMasivo && editando && seleccion.size > 0 && <PopEtiquetas onAdministrar={() => setDlg('etqadmin')} doc={doc} ids={[...seleccion]} ancla={etqMasivo} onPoner={(t, poner) => sesion.editar(d => ponerEtiqueta(d, [...seleccion], t, poner))}
        onColor={(t, c) => sesion.editar(d => conColorEtiqueta(d, t, c))} onCerrar={() => setEtqMasivo(null)} />}
      {doc && dlg === 'respaldos' && <DialogoRespaldos sesion={sesion} nombre={e.nombre} onCerrar={() => setDlg(null)} />}
      {doc && subs && <PopSubtareas doc={doc} id={subs.id} ancla={subs.ancla} escritura={escritura} editando={editando} onCambiar={(fn, av) => cambiarSubs(subs.id, fn, av)}
        onTerminar={() => void terminarDesdeSubs(subs.id)} onCerrar={() => setSubs(null)} />}
      {doc && etq && editando && <PopEtiquetas onAdministrar={() => setDlg('etqadmin')} doc={doc} ids={[etq.id]} ancla={etq.ancla} onPoner={(t, poner) => sesion.editar(d => ponerEtiqueta(d, [etq.id], t, poner))}
        onColor={(t, c) => sesion.editar(d => conColorEtiqueta(d, t, c))} onCerrar={() => setEtq(null)} />}
      {doc && form && <FormActividad key={form.id ?? 'nueva'} doc={doc} id={form.id} preset={form.preset} nNotas={form.id ? doc.notas.filter(n => n.act === form.id).length : 0}
        onCerrar={() => setForm(null)} onGuardar={fn => sesion.editar(fn)} onEliminar={eliminar} onNotas={id => { setForm(null); acc.notas(id); }} onImagenes={id => { setForm(null); acc.imgs(id); }} nImgs={form.id ? doc.imagenes.filter(x => x.act === form.id).length : 0} onHistorial={id => { setForm(null); setBitAct(id); setDlg('bitacora'); }} />}
      {formMeta === 'editar' && doc && <FormMeta meta={doc.meta} onCerrar={() => setFormMeta(null)} onGuardar={r => sesion.editar(d => conMeta(d, r, e.usuario))} />}
      {formMeta === 'nuevo' && <FormMeta meta={{ proyecto: '', inicio: hoy, fin: '' }} onCerrar={() => setFormMeta(null)} onGuardar={r => void sesion.nuevoArchivo(documentoNuevo(r), 'actividades.md')} />}
      {doc && dlg === 'renombrar' && <DialogoRenombrar doc={doc} inicial={renNeg} onRenombrar={renombrarNeg} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'etqadmin' && <DialogoEtiquetasAdmin doc={doc} editando={editando} onRenombrar={renombrarEtq} onColor={(t, c) => sesion.editar(d => conColorEtiqueta(d, t, c))} onBorrar={borrarEtq} onCerrar={() => setDlg(null)} />}
      {doc && dlg === 'sprint' && <DialogoSprint doc={doc} archivo={e.nombre} hoy={hoy} onCrear={o => void crearSprintDe(o)} onCerrar={() => setDlg(null)} />}
      {pideUsuario && <DialogoUsuario inicial={e.usuario} onListo={n => { pideUsuario.resolver(n); setPideUsuario(null); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
