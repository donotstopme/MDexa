import { ESTADOS, PRIORIDADES, SIN_ETQ, SIN_NEGOCIO, SIN_PRI, SIN_RESP, SIN_TAM, TAMANOS } from './constantes';
import type { Actividad, Documento, Estado } from './tipos';
import { coincideBusqueda, palabras } from './buscador';
import { bloqueada, choqueFechas } from './dependencias';
import { canonEtqEn, colorEtq, etqs, tieneEtq } from './etiquetas';
import { conEstado } from './sesion';
import { EST, cerrada, dias, hoy as hoyDe, medible, negocioDe, normaliza, unicos, vencida } from './utilidades';

/* ============ Filtros y orden ============ */

export type Agrupar = '' | 'negocio' | 'responsable' | 'prioridad' | 'estado' | 'etiqueta';
export interface Filtros {
  texto: string;
  neg: string[]; resp: string[]; est: string[]; tam: string[]; pri: string[]; etq: string[];
  verBacklog: boolean;
}
export const filtrosVacios = (): Filtros => ({ texto: '', neg: [], resp: [], est: [], tam: [], pri: [], etq: [], verBacklog: true });
export type ClaveOrden = 'negocio' | 'actividad' | 'prioridad' | 'tamano' | 'responsable' | 'inicio' | 'fin' | 'estado';
export interface Orden { k: ClaveOrden; asc: boolean }

const ORDEN_TAM = Object.keys(TAMANOS), ORDEN_PRI = Object.keys(PRIORIDADES);

/** El backlog se oculta salvo que se pida explícitamente en el filtro de estado */
export const backlogOculto = (f: Filtros): boolean => !f.verBacklog && !f.est.includes('Backlog');

export interface ContextoFiltro { hoy?: string; conNovedades?: Set<number>; ignorarResp?: boolean }

/** Actividades que pasan los filtros, ordenadas. Las vacías de un campo van al final. */
export function filtrar(doc: Documento, f: Filtros, o: Orden, ctx: ContextoFiltro = {}): Actividad[] {
  const h = ctx.hoy ?? hoyDe(), acts = doc.actividades;
  const pals = [...new Set(palabras(f.texto))];
  const notasPor = new Map<number, Documento['notas']>();
  if (pals.length) doc.notas.forEach(n => notasPor.set(n.act, [...(notasPor.get(n.act) ?? []), n]));
  const oculta = backlogOculto(f);
  const pasaEst = (a: Actividad) => !f.est.length || f.est.some(v =>
    v === 'Vencida' ? vencida(a, h) : v === 'Bloqueada' ? bloqueada(acts, a) : v === 'Recurrente' ? !!a.repite : v === 'Con novedades' ? !!ctx.conNovedades?.has(a.id) : EST(a) === v);
  const pasaEtq = (a: Actividad) => !f.etq.length || f.etq.some(v => (v === SIN_ETQ ? !etqs(a).length : tieneEtq(a, v)));
  const valor = (a: Actividad, k: ClaveOrden): string =>
    k === 'estado' ? String(ESTADOS.indexOf(EST(a))) : k === 'tamano' ? (a.tamano ? String(ORDEN_TAM.indexOf(a.tamano)) : '')
      : k === 'prioridad' ? (a.prioridad ? String(ORDEN_PRI.indexOf(a.prioridad)) : '') : k === 'negocio' ? negocioDe(a) : ((a as unknown as Record<string, string>)[k] || '');
  return acts
    .filter(a => (!pals.length || coincideBusqueda(a, pals, notasPor.get(a.id))) && (!f.neg.length || f.neg.includes(negocioDe(a)))
      && (ctx.ignorarResp || !f.resp.length || f.resp.includes(a.responsable || SIN_RESP)) && pasaEst(a)
      && (!f.tam.length || f.tam.includes(a.tamano || SIN_TAM)) && (!f.pri.length || f.pri.includes(a.prioridad || SIN_PRI)) && pasaEtq(a) && !(oculta && EST(a) === 'Backlog'))
    .sort((a, b) => {
      const va = valor(a, o.k), vb = valor(b, o.k);
      if (!va !== !vb) return va ? -1 : 1;
      return String(va).localeCompare(String(vb), 'es') * (o.asc ? 1 : -1) || a.id - b.id;
    });
}

/* ============ Grupos ============ */

/** Claves de grupo: el negocio tal cual; los demás llevan prefijo ("responsable:Ana") */
export function gruposDe(a: Actividad, por: Agrupar, todas: Actividad[]): string[] {
  if (por === 'negocio') return [negocioDe(a)];
  if (por === 'responsable') return ['responsable:' + (a.responsable || '')];
  if (por === 'prioridad') return ['prioridad:' + (a.prioridad || '')];
  if (por === 'estado') return ['estado:' + EST(a)];
  if (por === 'etiqueta') { const l = etqs(a); return l.length ? l.map(t => 'etiqueta:' + canonEtqEn(todas, t)) : ['etiqueta:']; }
  return [''];
}

export interface InfoGrupo { titulo: string; icono: 'tienda' | 'usuario' | 'prioridad' | 'estado' | 'etiqueta'; orden: string; valor: string }
export function infoGrupo(g: string, por: Agrupar): InfoGrupo {
  if (por === 'negocio') return { titulo: g || SIN_NEGOCIO, icono: 'tienda', orden: g && g !== SIN_NEGOCIO ? '0' + g : '9', valor: g };
  const i = g.indexOf(':'), valor = i < 0 ? g : g.slice(i + 1);
  if (por === 'responsable') return { titulo: valor || SIN_RESP, icono: 'usuario', orden: valor ? '0' + valor : '9', valor };
  if (por === 'prioridad') return { titulo: valor || SIN_PRI, icono: 'prioridad', orden: String(valor ? ORDEN_PRI.indexOf(valor) : 9), valor };
  if (por === 'estado') return { titulo: valor, icono: 'estado', orden: String(ESTADOS.indexOf(valor as Estado)), valor };
  if (por === 'etiqueta') return { titulo: valor || SIN_ETQ, icono: 'etiqueta', orden: valor ? '0' + normaliza(valor) : '9', valor };
  return { titulo: g, icono: 'tienda', orden: g, valor: g };
}

export interface Bloque { g: string | null; titulo: string; info?: InfoGrupo; items: Actividad[] }
/** Bloques (grupos) que comparten la lista, el tablero y la línea de tiempo */
export function armarBloques(lista: Actividad[], por: Agrupar, todas: Actividad[]): Bloque[] {
  if (!por) return [{ g: null, titulo: '', items: lista }];
  const grupos = new Map<string, Actividad[]>();
  lista.forEach(a => gruposDe(a, por, todas).forEach(k => grupos.set(k, [...(grupos.get(k) ?? []), a])));
  return [...grupos.keys()].map(g => ({ g, info: infoGrupo(g, por) }))
    .sort((a, b) => a.info.orden.localeCompare(b.info.orden, 'es'))
    .map(x => ({ g: x.g, titulo: x.info.titulo, info: x.info, items: grupos.get(x.g)! }));
}

/** "3 actividades · 1 terminada · 2 vencidas" */
export function metaGrupo(items: Actividad[], hoyStr: string = hoyDe()): { total: number; hechas: number; venc: number } {
  return { total: items.length, hechas: items.filter(a => EST(a) === 'Terminado').length, venc: items.filter(a => vencida(a, hoyStr)).length };
}

/* ============ Panel de negocios ============ */

export interface StatsNegocio { negocio: string; total: number; act: number; t: number; venc: number; pct: number; visibles: number }
export function statsNegocios(doc: Documento, visibles: Actividad[], hoyStr: string = hoyDe()): StatsNegocio[] {
  const negs = unicos(doc.actividades.map(negocioDe)).sort((a, b) => (a === SIN_NEGOCIO ? 1 : b === SIN_NEGOCIO ? -1 : a.localeCompare(b, 'es')));
  const vis = new Map<string, number>();
  visibles.forEach(a => vis.set(negocioDe(a), (vis.get(negocioDe(a)) || 0) + 1));
  return negs.map(n => {
    const l = doc.actividades.filter(a => negocioDe(a) === n), act = l.filter(medible), t = l.filter(a => EST(a) === 'Terminado').length;
    return { negocio: n, total: l.length, act: act.length, t, venc: l.filter(a => vencida(a, hoyStr)).length, pct: act.length ? Math.round(t * 100 / act.length) : 0, visibles: vis.get(n) || 0 };
  });
}

/* ============ Meta del proyecto: avance y ritmo ============ */

export interface AnalisisMeta {
  total: number; medibles: number; terminadas: number; pctAv: number; sinContar: number;
  tiempo: { totalD: number; trans: number; pct: number; terminada: boolean; iniciada: boolean } | null;
  ritmo: { txt: string; cls: 'es-verde' | 'es-rojo' | 'es-amar' | 'es-gris'; det: string } | null;
  cuenta: Record<string, number>; vencidas: number; conRetraso: number;
}
export function analizarMeta(doc: Documento, hoyStr: string = hoyDe()): AnalisisMeta {
  const acts = doc.actividades, meta = doc.meta, medibles = acts.filter(medible), comp = acts.filter(a => EST(a) === 'Terminado');
  const pctAv = medibles.length ? Math.round(comp.length * 100 / medibles.length) : 0;
  let tiempo: AnalisisMeta['tiempo'] = null;
  if (meta.inicio && meta.fin) {
    const totalD = dias(meta.inicio, meta.fin) + 1, trans = Math.min(Math.max(dias(meta.inicio, hoyStr) + 1, 0), totalD);
    tiempo = { totalD, trans, pct: Math.round(trans * 100 / totalD), terminada: hoyStr > meta.fin, iniciada: hoyStr >= meta.inicio };
  }
  let ritmo: AnalisisMeta['ritmo'] = null;
  const pl = (n: number) => `${n} ${n === 1 ? 'día' : 'días'}`;
  if (tiempo && medibles.length) {
    if (tiempo.terminada) ritmo = pctAv === 100 ? { txt: 'Meta cumplida', cls: 'es-verde', det: 'Todas las actividades se terminaron.' }
      : { txt: 'Meta vencida', cls: 'es-rojo', det: `La meta terminó hace ${pl(dias(meta.fin, hoyStr))} con ${pctAv}% terminado.` };
    else if (!tiempo.iniciada) ritmo = { txt: 'Aún no inicia', cls: 'es-gris', det: `Inicia en ${pl(dias(hoyStr, meta.inicio))}.` };
    else {
      const d = pctAv - tiempo.pct;
      ritmo = d >= 0 ? { txt: 'Al día', cls: 'es-verde', det: `Avance (${pctAv}%) igual o mayor al tiempo transcurrido (${tiempo.pct}%).` }
        : d >= -15 ? { txt: 'Ligeramente atrasado', cls: 'es-amar', det: `Avance ${pctAv}% contra ${tiempo.pct}% del tiempo.` }
          : { txt: 'Atrasado', cls: 'es-rojo', det: `Avance ${pctAv}% contra ${tiempo.pct}% del tiempo.` };
    }
  }
  const cuenta = Object.fromEntries(ESTADOS.map(e => [e, acts.filter(a => EST(a) === e).length]));
  return {
    total: acts.length, medibles: medibles.length, terminadas: comp.length, pctAv, sinContar: acts.length - medibles.length, tiempo, ritmo, cuenta,
    vencidas: acts.filter(a => !cerrada(a) && vencida(a, hoyStr)).length,
    conRetraso: comp.filter(a => a.fin && a.terminada && a.terminada > a.fin).length,
  };
}

/** Actividades que empiezan antes de que termine la que esperan (para avisos) */
export const conChoque = (doc: Documento): Actividad[] => doc.actividades.filter(a => choqueFechas(doc.actividades, a).length);

/* ============ Soltar una tarjeta en otro carril/columna (Tablero) ============ */

/** Campo y valor que representa la clave de un grupo ('' o '__fav' = ninguno) */
export function valorDeGrupo(g: string | null, por: Agrupar): { campo: string; valor: string } | null {
  if (!g || g === '__fav' || !por) return null;
  if (por === 'negocio') return { campo: 'negocio', valor: g === SIN_NEGOCIO ? '' : g };
  const i = g.indexOf(':');
  return i < 0 ? null : { campo: g.slice(0, i), valor: g.slice(i + 1) };
}

/**
 * Efecto de soltar una tarjeta en la columna `estado` del carril `g`: cambia el estado y, según cómo se agrupe,
 * el negocio, el responsable o la prioridad. Devuelve la actividad nueva y una descripción de los cambios.
 */
export function aplicarSoltar(a: Actividad, estado: Estado, g: string | null, por: Agrupar, ahora: Date = new Date()): { a: Actividad; cambios: string[] } {
  let x = a; const cambios: string[] = [];
  if (EST(a) !== estado) { x = conEstado(x, estado, undefined, ahora); cambios.push(estado); }
  const v = valorDeGrupo(g, por);
  if (v?.campo === 'negocio' && v.valor && v.valor !== negocioDe(a)) { x = { ...x, negocio: v.valor }; cambios.push(`negocio ${v.valor}`); }
  else if (v?.campo === 'responsable' && v.valor !== (a.responsable || '')) { x = { ...x, responsable: v.valor }; cambios.push(v.valor ? `responsable ${v.valor}` : 'sin responsable'); }
  else if (v?.campo === 'prioridad' && v.valor !== (a.prioridad || '')) { x = { ...x, prioridad: v.valor as Actividad['prioridad'] }; cambios.push(v.valor ? `prioridad ${v.valor}` : 'sin prioridad'); }
  return { a: x, cambios };
}
