import { SIN_HITO, TAMANOS } from './constantes';
import type { Actividad, Documento, Hito } from './tipos';
import { EST, cerrada, dias, hoy as hoyDe, normaliza, pl } from './utilidades';

/*
 * Hitos (que también funcionan como fases): nombre, fecha objetivo, descripción y uno o varios negocios.
 * Sus actividades se eligen desde el hito: se incluyen solas las que encajan y se desmarcan las excepciones.
 * La selección queda guardada (cada actividad pertenece a lo sumo a un hito), así un atraso se nota.
 */

/** Hitos por fecha (los que no tienen fecha, al final) */
export const hitosOrdenados = (hitos: Hito[]): Hito[] =>
  [...hitos].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || a.id - b.id);

export const hitoDe = (d: Pick<Documento, 'hitos'>, a: Pick<Actividad, 'hito'>): Hito | undefined =>
  a.hito ? d.hitos.find(h => h.id === a.hito) : undefined;
export const nombreHitoDe = (d: Pick<Documento, 'hitos'>, a: Pick<Actividad, 'hito'>): string => hitoDe(d, a)?.nombre ?? SIN_HITO;

/** ¿El hito sirve para una actividad de ese negocio? (uno sin negocios, escrito a mano, sirve para todas) */
export const hitoCompatible = (h: Pick<Hito, 'negocios'>, negocio: string): boolean => !h.negocios.length || h.negocios.includes(negocio);

const sinHito = (a: Actividad): Actividad => { const { hito: _h, ...r } = a; void _h; return r; };

/** Asigna (o quita, con 0) el hito. null = el hito no es de su negocio. */
export function conHito(d: Pick<Documento, 'hitos'>, a: Actividad, id: number): Actividad | null {
  if (!id) return sinHito(a);
  const h = d.hitos.find(x => x.id === id);
  return h && hitoCompatible(h, a.negocio) ? { ...a, hito: id } : null;
}

/* ============ Qué actividades entran ============ */

/** Actividades que se muestran al elegir: las de esos negocios, sin las canceladas (salvo las que ya están) */
export const actividadesParaHito = (d: Pick<Documento, 'actividades'>, negocios: string[], id?: number): Actividad[] =>
  d.actividades.filter(a => negocios.includes(a.negocio) && (EST(a) !== 'Cancelado' || (!!id && a.hito === id)))
    .sort((a, b) => (a.fin || '9999').localeCompare(b.fin || '9999') || a.id - b.id);

/** Entra sola: sigue abierta, termina en la fecha del hito o antes y no está en otro hito */
export const encajaEnHito = (d: Pick<Documento, 'hitos'>, a: Actividad, fecha: string, id?: number): boolean =>
  !cerrada(a) && !!a.fin && !!fecha && a.fin <= fecha && (!hitoDe(d, a) || a.hito === id);

/**
 * Casillas marcadas en la ventana del hito. En uno nuevo (o en un negocio que se acaba de agregar) se marcan las
 * que encajan; en uno existente se respeta lo guardado. `manual` son las casillas que la persona cambió.
 */
export function seleccionHito(d: Documento, f: { id?: number; negocios: string[]; fecha: string }, manual: ReadonlyMap<number, boolean> = new Map()): Set<number> {
  const previo = d.hitos.find(h => h.id === f.id);
  return new Set(actividadesParaHito(d, f.negocios, f.id).filter(a => manual.get(a.id)
    ?? (previo?.negocios.includes(a.negocio) ? a.hito === previo.id : a.hito === f.id && !!f.id ? true : encajaEnHito(d, a, f.fecha, f.id))).map(a => a.id));
}

/** Actividades que encajan en un hito pendiente y todavía no están en él */
export const porIncluir = (d: Pick<Documento, 'hitos' | 'actividades'>, h: Hito): Actividad[] =>
  h.cumplido ? [] : actividadesParaHito(d, h.negocios, h.id).filter(a => a.hito !== h.id && encajaEnHito(d, a, h.fecha, h.id));

/** Tras un cambio: las actividades que cambiaron de negocio dejan el hito que ya no les corresponde */
export function quitarHitosAjenos(antes: Documento, despues: Documento): { doc: Documento; quitados: number } {
  const previo = new Map(antes.actividades.map(a => [a.id, a.negocio]));
  let quitados = 0;
  const actividades = despues.actividades.map(a => {
    if (!a.hito || !previo.has(a.id) || previo.get(a.id) === a.negocio) return a;
    const h = despues.hitos.find(x => x.id === a.hito);
    if (!h || hitoCompatible(h, a.negocio)) return a;
    quitados++; return sinHito(a);
  });
  return quitados ? { doc: { ...despues, actividades }, quitados } : { doc: despues, quitados };
}

/* ============ Administración ============ */

/** Número para un hito nuevo, sin reutilizar uno al que todavía apunte alguna actividad */
export const siguienteIdHito = (d: Pick<Documento, 'hitos' | 'actividades'>): number =>
  Math.max(0, ...d.hitos.map(h => h.id), ...d.actividades.map(a => a.hito || 0)) + 1;

const limpiaNombre = (s: string) => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim().slice(0, 120);
const limpiaDesc = (s: string) => s.replace(/\|/g, '/').replace(/\r/g, '').trim().slice(0, 600);

const anotar = (d: Documento, usuario: string, detalle: string, ahora: Date): Documento['bitacora'] =>
  [...d.bitacora, { fecha: ahora.toISOString(), autor: usuario || 'Sin nombre', act: null, accion: 'hito', campos: [], detalle }];

export type DatosHito = Omit<Hito, 'id'> & { id?: number };
export type ResultadoHito = { error: string } | { doc: Documento; id: number };

/**
 * Crea o modifica un hito. `ids` son sus actividades (las demás lo dejan; las elegidas salen de otro hito);
 * si no se indica, se conservan las que tenía, salvo las de negocios que ya no incluye.
 */
export function guardarHito(d: Documento, datos: DatosHito, usuario: string, ids?: ReadonlySet<number>, ahora: Date = new Date()): ResultadoHito {
  const nombre = limpiaNombre(datos.nombre), negocios = [...new Set(datos.negocios)].sort((a, b) => a.localeCompare(b, 'es'));
  if (!nombre) return { error: 'Escribe el nombre del hito.' };
  if (!datos.fecha) return { error: 'Elige la fecha objetivo del hito.' };
  if (!negocios.length) return { error: 'Elige al menos un negocio.' };
  if (d.hitos.some(h => h.id !== datos.id && normaliza(h.nombre) === normaliza(nombre))) return { error: `Ya existe un hito llamado «${nombre}».` };
  const previo = d.hitos.find(h => h.id === datos.id);
  const h: Hito = { id: previo?.id ?? siguienteIdHito(d), nombre, fecha: datos.fecha, negocios, cumplido: datos.cumplido, descripcion: limpiaDesc(datos.descripcion), ...(datos.color ? { color: datos.color } : {}) };
  let entran = 0, salen = 0;
  const actividades = d.actividades.map(a => {
    const estaba = !!previo && a.hito === h.id, queda = (ids ? ids.has(a.id) : estaba) && hitoCompatible(h, a.negocio);
    if (queda === estaba) return a;
    if (queda) { entran++; return { ...a, hito: h.id }; }
    salen++; return sinHito(a);
  });
  const igual = (x: Hito) => JSON.stringify([x.nombre, x.fecha, x.negocios, x.cumplido, x.descripcion, x.color || '']);
  if (previo && !entran && !salen && igual(previo) === igual(h)) return { doc: d, id: h.id };
  const movs = [entran && `entran ${pl(entran, 'actividad', 'actividades')}`, salen && `salen ${pl(salen, 'actividad', 'actividades')}`];
  const cambios = previo ? [
    previo.nombre !== h.nombre && `nombre «${previo.nombre}» → «${h.nombre}»`, previo.fecha !== h.fecha && `fecha ${previo.fecha || '—'} → ${h.fecha}`,
    previo.negocios.join(', ') !== h.negocios.join(', ') && `negocios: ${h.negocios.join(', ')}`, previo.descripcion !== h.descripcion && 'descripción', previo.color !== h.color && 'color',
    previo.cumplido !== h.cumplido && (h.cumplido ? `cumplido el ${h.cumplido}` : 'ya no está cumplido'), ...movs,
  ] : movs;
  const resumen = cambios.filter(Boolean).join(', ');
  const detalle = previo ? `Cambió «${h.nombre}»: ${resumen}` : `Creó «${h.nombre}» para el ${h.fecha}${resumen ? `: ${resumen}` : ''}`;
  const hitos = previo ? d.hitos.map(x => (x.id === h.id ? h : x)) : [...d.hitos, h];
  return { doc: { ...d, hitos, actividades, bitacora: anotar(d, usuario, detalle, ahora) }, id: h.id };
}

/** Borra el hito; sus actividades se conservan, sin hito */
export function borrarHito(d: Documento, id: number, usuario: string, ahora: Date = new Date()): Documento {
  const h = d.hitos.find(x => x.id === id);
  if (!h) return d;
  return {
    ...d, hitos: d.hitos.filter(x => x.id !== id), actividades: d.actividades.map(a => (a.hito === id ? sinHito(a) : a)),
    bitacora: anotar(d, usuario, `Eliminó «${h.nombre}»`, ahora),
  };
}

/** Al renombrar un negocio, los hitos que lo incluyen lo siguen */
export const renombrarNegocioHitos = (hitos: Hito[], viejo: string, nuevo: string): Hito[] =>
  !viejo ? hitos : hitos.map(h => (h.negocios.includes(viejo)
    ? { ...h, negocios: [...new Set(h.negocios.map(n => (n === viejo ? nuevo : n)))].sort((a, b) => a.localeCompare(b, 'es')) } : h));

/* ============ Seguimiento ============ */

export type EstadoHito = 'Cumplido' | 'En tiempo' | 'En riesgo' | 'Vencido';
export interface InfoHito {
  estado: EstadoHito;
  /** Actividades no canceladas del hito, y cuántas están terminadas */
  total: number; hechas: number;
  pct: number;
  /** Inicio de la fase: la primera fecha de inicio de sus actividades */
  inicio: string;
  detalle: string;
}

/** Estado y avance (por horas según el tamaño; si ninguna lo tiene, por número de actividades) */
export function infoHito(d: Pick<Documento, 'actividades'>, h: Hito, hoyStr: string = hoyDe()): InfoHito {
  const l = d.actividades.filter(a => a.hito === h.id && EST(a) !== 'Cancelado'), hechas = l.filter(a => EST(a) === 'Terminado');
  const horas = (x: Actividad[]) => x.reduce((s, a) => s + (a.tamano ? TAMANOS[a.tamano].h : 0), 0), th = horas(l);
  const cumplido = !!h.cumplido || (l.length > 0 && hechas.length === l.length);
  const pct = cumplido ? 100 : th ? Math.round(horas(hechas) * 100 / th) : l.length ? Math.round(hechas.length * 100 / l.length) : 0;
  const tarde = l.filter(a => EST(a) !== 'Terminado' && h.fecha && a.fin > h.fecha).length;
  const estado: EstadoHito = cumplido ? 'Cumplido' : h.fecha && h.fecha < hoyStr ? 'Vencido' : tarde ? 'En riesgo' : 'En tiempo';
  const detalle = estado === 'Cumplido' ? (h.cumplido ? `Marcado como cumplido el ${h.cumplido}` : 'Todas sus actividades terminaron')
    : estado === 'Vencido' ? `Hace ${pl(dias(h.fecha, hoyStr), 'día', 'días')} que debía cumplirse`
      : estado === 'En riesgo' ? `${pl(tarde, 'actividad termina', 'actividades terminan')} después de la fecha`
        : h.fecha ? (h.fecha === hoyStr ? 'Es hoy' : `Faltan ${pl(dias(hoyStr, h.fecha), 'día', 'días')}`) : 'Sin fecha';
  const inicios = l.map(a => a.inicio).filter(Boolean).sort();
  return { estado, total: l.length, hechas: hechas.length, pct, inicio: inicios[0] || '', detalle };
}

/* ============ Dónde se muestran ============ */

/** Clases CSS de un hito: su estado y, si se le eligió, su color (que sustituye al del estado) */
export const claseHito = (h: Pick<Hito, 'color'>, estado: EstadoHito): string =>
  `h-${estado.replace(' ', '-')}${h.color ? ` h-color etq-${h.color}` : ''}`;

/** Hitos que se ven según los filtros: de los negocios elegidos (sin elegir, todos) y de los hitos elegidos */
export function hitosVisibles(hitos: Hito[], negocios: string[] = [], elegidos: string[] = []): Hito[] {
  const nombres = elegidos.filter(v => hitos.some(h => h.nombre === v));
  return hitosOrdenados(hitos).filter(h => h.fecha && (!negocios.length || !h.negocios.length || h.negocios.some(n => negocios.includes(n)))
    && (!elegidos.length || !nombres.length || nombres.includes(h.nombre)));
}

/** Los que faltan por cumplirse (primero los de fecha más antigua, así los vencidos quedan arriba) */
export const proximosHitos = (d: Documento, hoyStr: string = hoyDe()): { h: Hito; info: InfoHito }[] =>
  hitosOrdenados(d.hitos).map(h => ({ h, info: infoHito(d, h, hoyStr) })).filter(x => x.info.estado !== 'Cumplido');

/** Reparte en carriles las etiquetas de la Línea de tiempo para que no se encimen: carril de cada posición `x` (ordenadas) */
export function carrilesHitos(xs: number[], ancho: number): number[] {
  const fin: number[] = [];
  return xs.map(x => {
    let i = fin.findIndex(f => f <= x);
    if (i < 0) i = fin.length;
    fin[i] = x + ancho; return i;
  });
}

/** Cambia la fecha (al arrastrar el rombo) conservando las actividades */
export function moverHito(d: Documento, id: number, fecha: string, usuario: string, ahora: Date = new Date()): Documento {
  const h = d.hitos.find(x => x.id === id);
  if (!h || !fecha || h.fecha === fecha) return d;
  const r = guardarHito(d, { ...h, fecha }, usuario, undefined, ahora);
  if ('doc' in r) return r.doc;
  // un hito escrito a mano sin negocios no pasa la validación: sólo se cambia la fecha
  return { ...d, hitos: d.hitos.map(x => (x.id === id ? { ...x, fecha } : x)), bitacora: anotar(d, usuario, `Cambió «${h.nombre}»: fecha ${h.fecha || '—'} → ${fecha}`, ahora) };
}

/** Para el reporte semanal: los pendientes hasta el fin de la semana siguiente y los que tocaban o se cumplieron en esta */
export function hitosSemana(d: Documento, lunes: string, domingo: string, pFin: string, hoyStr: string = hoyDe()): { h: Hito; info: InfoHito }[] {
  const dentro = (f: string) => !!f && f >= lunes && f <= domingo;
  return hitosOrdenados(d.hitos).map(h => ({ h, info: infoHito(d, h, hoyStr) }))
    .filter(({ h, info }) => (info.estado !== 'Cumplido' && !!h.fecha && h.fecha <= pFin) || dentro(h.fecha) || dentro(h.cumplido));
}
