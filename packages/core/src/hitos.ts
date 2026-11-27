import { JUNTAR_BIT, SIN_HITO, TAMANOS } from './constantes';
import type { Actividad, CambioHito, Documento, Hito, Meta } from './tipos';
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

/* ============ Orden entre hitos ============ */

/** Hitos de los que depende (los que todavía existen), por fecha */
export const previosDe = (hitos: Hito[], h: Pick<Hito, 'depende'>): Hito[] => hitosOrdenados(hitos.filter(x => h.depende?.includes(x.id)));

/** ¿Hacer que `id` dependa de `previo` cerraría un círculo? (o es él mismo) */
export function creaCicloHito(hitos: Hito[], id: number, previo: number): boolean {
  const vistos = new Set<number>(), cola = [previo];
  while (cola.length) {
    const n = cola.pop()!;
    if (n === id) return true;
    if (vistos.has(n)) continue;
    vistos.add(n); cola.push(...(hitos.find(h => h.id === n)?.depende || []));
  }
  return false;
}

/* ============ Historial de fechas ============ */

/** Anota que la fecha se recorrió; los ajustes seguidos de la misma persona (p. ej. al arrastrar) se juntan en uno */
export function anotarCambioFecha(cambios: CambioHito[], antes: string, despues: string, usuario: string, ahora: Date = new Date()): CambioHito[] {
  if (!antes || !despues || antes === despues) return cambios;
  const autor = usuario || 'Sin nombre', ult = cambios[cambios.length - 1];
  if (ult && ult.autor === autor && ahora.getTime() - Date.parse(ult.cuando) < JUNTAR_BIT) {
    const resto = cambios.slice(0, -1);
    return ult.antes === despues ? resto : [...resto, { ...ult, despues, cuando: ahora.toISOString() }];   // regresó a donde estaba: no cuenta
  }
  return [...cambios, { cuando: ahora.toISOString(), autor, antes, despues }];
}

export interface Recorrido { veces: number; /** días netos desde la primera fecha (negativo = se adelantó) */ dias: number; original: string }
export const recorridoHito = (h: Pick<Hito, 'cambios' | 'fecha'>): Recorrido | null =>
  (h.cambios?.length ? { veces: h.cambios.length, dias: dias(h.cambios[0].antes, h.fecha), original: h.cambios[0].antes } : null);
export const conSigno = (n: number): string => `${n > 0 ? '+' : ''}${n} ${Math.abs(n) === 1 ? 'día' : 'días'}`;
/** "Recorrido 2 veces (+14 días)" o '' */
export function textoRecorrido(h: Pick<Hito, 'cambios' | 'fecha'>): string {
  const r = recorridoHito(h);
  return r ? `Recorrido ${pl(r.veces, 'vez', 'veces')} (${conSigno(r.dias)})` : '';
}

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
  const id = previo?.id ?? siguienteIdHito(d);
  const depende = [...new Set(datos.depende || [])].filter(x => d.hitos.some(y => y.id === x)).sort((a, b) => a - b);
  const ciclo = depende.find(x => creaCicloHito(d.hitos, id, x));
  if (ciclo !== undefined) return { error: `No puede depender de «${d.hitos.find(x => x.id === ciclo)?.nombre}»: ese hito ya depende de éste.` };
  // el historial lo lleva la aplicación: no se toma de lo que llega
  const cambiosF = previo ? anotarCambioFecha(previo.cambios || [], previo.fecha, datos.fecha, usuario, ahora) : [];
  const h: Hito = { id, nombre, fecha: datos.fecha, negocios, cumplido: datos.cumplido, descripcion: limpiaDesc(datos.descripcion), ...(datos.color ? { color: datos.color } : {}),
    ...(depende.length ? { depende } : {}), ...(cambiosF.length ? { cambios: cambiosF } : {}) };
  let entran = 0, salen = 0;
  const actividades = d.actividades.map(a => {
    const estaba = !!previo && a.hito === h.id, queda = (ids ? ids.has(a.id) : estaba) && hitoCompatible(h, a.negocio);
    if (queda === estaba) return a;
    if (queda) { entran++; return { ...a, hito: h.id }; }
    salen++; return sinHito(a);
  });
  const igual = (x: Hito) => JSON.stringify([x.nombre, x.fecha, x.negocios, x.cumplido, x.descripcion, x.color || '', x.depende || []]);
  if (previo && !entran && !salen && igual(previo) === igual(h)) return { doc: d, id: h.id };
  const movs = [entran && `entran ${pl(entran, 'actividad', 'actividades')}`, salen && `salen ${pl(salen, 'actividad', 'actividades')}`];
  const cambios = previo ? [
    previo.nombre !== h.nombre && `nombre «${previo.nombre}» → «${h.nombre}»`, previo.fecha !== h.fecha && `fecha ${previo.fecha || '—'} → ${h.fecha}`,
    previo.negocios.join(', ') !== h.negocios.join(', ') && `negocios: ${h.negocios.join(', ')}`, previo.descripcion !== h.descripcion && 'descripción', previo.color !== h.color && 'color',
    (previo.depende || []).join() !== depende.join() && (depende.length ? `depende de ${previosDe(d.hitos, h).map(x => `«${x.nombre}»`).join(', ')}` : 'ya no depende de otros'),
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
    ...d, hitos: d.hitos.filter(x => x.id !== id).map(x => {
      if (!x.depende?.includes(id)) return x;
      const { depende, ...resto } = x, quedan = depende!.filter(n => n !== id);
      return quedan.length ? { ...resto, depende: quedan } : resto;
    }), actividades: d.actividades.map(a => (a.hito === id ? sinHito(a) : a)),
    bitacora: anotar(d, usuario, `Eliminó «${h.nombre}»`, ahora),
  };
}

/** Hitos que pasan a un sprint nuevo: los que usan las actividades copiadas; empiezan sin historial */
export function hitosDeSprint(hitos: Hito[], actividades: Actividad[]): Hito[] {
  const quedan = hitos.filter(h => actividades.some(a => a.hito === h.id));
  return quedan.map(h => {
    const { depende, cambios: _c, ...resto } = h, dep = (depende || []).filter(x => quedan.some(y => y.id === x));
    void _c; return dep.length ? { ...resto, depende: dep } : resto;
  });
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
  /** Hitos de los que depende y que aún no se cumplen */
  espera: Hito[];
}

type ParaEstado = Pick<Documento, 'actividades'> & Partial<Pick<Documento, 'hitos'>>;
const susActividades = (d: ParaEstado, h: Hito) => d.actividades.filter(a => a.hito === h.id && EST(a) !== 'Cancelado');
export const hitoCumplido = (d: ParaEstado, h: Hito): boolean => {
  if (h.cumplido) return true;
  const l = susActividades(d, h);
  return l.length > 0 && l.every(a => EST(a) === 'Terminado');
};

/** Estado y avance (por horas según el tamaño; si ninguna lo tiene, por número de actividades) */
export function infoHito(d: ParaEstado, h: Hito, hoyStr: string = hoyDe()): InfoHito {
  const l = susActividades(d, h), hechas = l.filter(a => EST(a) === 'Terminado');
  const horas = (x: Actividad[]) => x.reduce((s, a) => s + (a.tamano ? TAMANOS[a.tamano].h : 0), 0), th = horas(l);
  const cumplido = hitoCumplido(d, h);
  const pct = cumplido ? 100 : th ? Math.round(horas(hechas) * 100 / th) : l.length ? Math.round(hechas.length * 100 / l.length) : 0;
  const tarde = l.filter(a => EST(a) !== 'Terminado' && h.fecha && a.fin > h.fecha).length;
  const espera = previosDe(d.hitos || [], h).filter(x => !hitoCumplido(d, x));
  // un hito previo estorba si ya venció o si está programado después de éste
  const estorba = cumplido ? undefined : espera.find(x => !!x.fecha && (x.fecha < hoyStr || (!!h.fecha && x.fecha > h.fecha)));
  const estado: EstadoHito = cumplido ? 'Cumplido' : h.fecha && h.fecha < hoyStr ? 'Vencido' : tarde || estorba ? 'En riesgo' : 'En tiempo';
  const detalle = estado === 'Cumplido' ? (h.cumplido ? `Marcado como cumplido el ${h.cumplido}` : 'Todas sus actividades terminaron')
    : estado === 'Vencido' ? `Hace ${pl(dias(h.fecha, hoyStr), 'día', 'días')} que debía cumplirse`
      : estorba ? (estorba.fecha < hoyStr ? `Espera a «${estorba.nombre}», que está vencido` : `«${estorba.nombre}», del que depende, está programado después`)
        : tarde ? `${pl(tarde, 'actividad termina', 'actividades terminan')} después de la fecha`
          : h.fecha ? (h.fecha === hoyStr ? 'Es hoy' : `Faltan ${pl(dias(hoyStr, h.fecha), 'día', 'días')}`) : 'Sin fecha';
  const inicios = l.map(a => a.inicio).filter(Boolean).sort();
  return { estado, total: l.length, hechas: hechas.length, pct, inicio: inicios[0] || '', detalle, espera };
}

/* ============ Mis hitos ============ */

export interface MiHito { h: Hito; info: InfoHito; mias: Actividad[]; pendientes: Actividad[] }
/** Los hitos sin cumplir a los que aporta una persona, por fecha */
export function misHitos(d: Documento, quien: string, hoyStr: string = hoyDe()): MiHito[] {
  const q = normaliza(quien);
  if (!q) return [];
  return hitosOrdenados(d.hitos).flatMap(h => {
    const mias = susActividades(d, h).filter(a => normaliza(a.responsable || '') === q)
      .sort((a, b) => (a.fin || '9999').localeCompare(b.fin || '9999') || a.id - b.id);
    if (!mias.length) return [];
    const info = infoHito(d, h, hoyStr);
    return info.estado === 'Cumplido' ? [] : [{ h, info, mias, pendientes: mias.filter(a => EST(a) !== 'Terminado') }];
  });
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
  const cambios = anotarCambioFecha(h.cambios || [], h.fecha, fecha, usuario, ahora);
  return { ...d, hitos: d.hitos.map(x => (x.id === id ? { ...x, fecha, ...(cambios.length ? { cambios } : {}) } : x)), bitacora: anotar(d, usuario, `Cambió «${h.nombre}»: fecha ${h.fecha || '—'} → ${fecha}`, ahora) };
}

/** Para el reporte semanal: los pendientes hasta el fin de la semana siguiente y los que tocaban o se cumplieron en esta */
export function hitosSemana(d: Documento, lunes: string, domingo: string, pFin: string, hoyStr: string = hoyDe()): { h: Hito; info: InfoHito }[] {
  const dentro = (f: string) => !!f && f >= lunes && f <= domingo;
  return hitosOrdenados(d.hitos).map(h => ({ h, info: infoHito(d, h, hoyStr) }))
    .filter(({ h, info }) => (info.estado !== 'Cumplido' && !!h.fecha && h.fecha <= pFin) || dentro(h.fecha) || dentro(h.cumplido));
}

/* ============ Meta compacta ============ */

/** Cuántos días faltan o pasaron: «hoy», «mañana», «en 5 días», «hace 2 días» */
export function cuandoEs(fecha: string, hoyStr: string = hoyDe()): string {
  const n = dias(hoyStr, fecha);
  return n === 0 ? 'hoy' : n === 1 ? 'mañana' : n === -1 ? 'ayer' : n > 0 ? `en ${n} días` : `hace ${-n} días`;
}

/** Lo que le queda a la meta, para el encabezado compacto */
export function plazoMeta(inicio: string, fin: string, hoyStr: string = hoyDe()): string {
  if (hoyStr < inicio) return `inicia ${cuandoEs(inicio, hoyStr)}`;
  if (hoyStr > fin) return `terminó ${cuandoEs(fin, hoyStr)}`;
  const n = dias(hoyStr, fin);
  return n === 0 ? 'termina hoy' : n === 1 ? 'queda 1 día' : `quedan ${n} días`;
}

export interface MarcaMeta {
  /** Posición en la barra de tiempo, de 0 a 100 */
  x: number;
  hitos: { h: Hito; info: InfoHito }[];
  /** Todos sus hitos caen antes o después del periodo de la meta */
  fuera: '' | 'antes' | 'después';
  /** Estado que la colorea: el más grave de los que agrupa */
  estado: EstadoHito;
}

const GRAVEDAD: EstadoHito[] = ['Vencido', 'En riesgo', 'En tiempo', 'Cumplido'];

/**
 * Hitos colocados sobre la barra de tiempo de la meta, en la misma escala que el tiempo transcurrido.
 * Los que quedan a menos de `juntar` puntos se agrupan en una sola marca; los de fuera, en el extremo.
 */
export function marcasMeta(d: ParaEstado & { meta: Meta; hitos: Hito[] }, hoyStr: string = hoyDe(), juntar = 2): MarcaMeta[] {
  const { inicio, fin } = d.meta;
  if (!inicio || !fin || fin < inicio) return [];
  const total = dias(inicio, fin) + 1, marcas: (MarcaMeta & { desde: number })[] = [];
  for (const h of hitosOrdenados(d.hitos).filter(x => x.fecha)) {
    const fuera = h.fecha < inicio ? 'antes' as const : h.fecha > fin ? 'después' as const : '' as const;
    const x = fuera === 'antes' ? 0 : fuera === 'después' ? 100 : Math.round((dias(inicio, h.fecha) + 1) * 1000 / total) / 10;
    const info = infoHito(d, h, hoyStr), u = marcas[marcas.length - 1];
    if (u && x - u.desde < juntar) {
      if (u.fuera !== fuera) u.fuera = '';
      u.hitos.push({ h, info }); u.x = Math.round((u.desde + x) * 5) / 10;
      if (GRAVEDAD.indexOf(info.estado) < GRAVEDAD.indexOf(u.estado)) u.estado = info.estado;
    } else marcas.push({ x, desde: x, hitos: [{ h, info }], fuera, estado: info.estado });
  }
  return marcas.map(({ desde: _d, ...m }) => m);
}
