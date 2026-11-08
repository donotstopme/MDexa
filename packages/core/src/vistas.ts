import { TAMANOS } from './constantes';
import type { Actividad } from './tipos';
import { EST, addDias, cerrada, medible } from './utilidades';

const dow = (f: string) => new Date(f + 'T00:00').getDay();
const cmpFin = (a: Actividad, b: Actividad) => (a.fin || '9').localeCompare(b.fin || '9') || (a.inicio || '9').localeCompare(b.inicio || '9');

export const abrevNeg = (n: string): string => {
  const w = String(n).split(/\s+/).filter(Boolean);
  return (w.length > 1 ? w[0][0] + w[1][0] : String(n).slice(0, 2)).toUpperCase();
};

/* ============ Mis actividades ============ */

export interface SeccionMias { k: 'venc' | 'hoy' | 'sem' | 'prox' | 'luego' | 'sinf' | 'term'; t: string; items: Actividad[]; desde?: string; hasta?: string; plegada?: boolean }
export interface ResumenMias {
  mias: Actividad[];
  abiertas: Actividad[];
  secciones: SeccionMias[];
  porHacer: number; enProgreso: number; vencidas: number; vencenSemana: number;
  /** Esfuerzo máximo (horas) de lo que está por hacer */
  horas: number;
  terminadas: number; medibles: number;
}

/** Actividades de una persona, ordenadas por urgencia en secciones (el sábado cuenta como "esta semana") */
export function resumenMias(acts: Actividad[], quien: string, hoyStr: string, norm: (s: string) => string): ResumenMias {
  const mias = acts.filter(a => norm(a.responsable || '') === norm(quien));
  const domingo = addDias(hoyStr, (7 - dow(hoyStr)) % 7), domingoProx = addDias(domingo, 7);
  const abiertas = mias.filter(a => !cerrada(a)).sort(cmpFin);
  const venc = abiertas.filter(a => a.fin && a.fin < hoyStr), hoy = abiertas.filter(a => a.fin === hoyStr);
  const secciones: SeccionMias[] = [
    { k: 'venc', t: 'Vencidas', items: venc },
    { k: 'hoy', t: 'Vencen hoy', items: hoy },
    { k: 'sem', t: 'Esta semana', desde: addDias(hoyStr, 1), hasta: domingo, items: abiertas.filter(a => a.fin > hoyStr && a.fin <= domingo) },
    { k: 'prox', t: 'Próxima semana', desde: addDias(domingo, 1), hasta: domingoProx, items: abiertas.filter(a => a.fin > domingo && a.fin <= domingoProx) },
    { k: 'luego', t: 'Más adelante', items: abiertas.filter(a => a.fin > domingoProx) },
    { k: 'sinf', t: 'Sin fecha fin', items: abiertas.filter(a => !a.fin) },
    { k: 'term', t: 'Terminadas en los últimos 7 días', plegada: true,
      items: mias.filter(a => EST(a) === 'Terminado' && a.terminada && a.terminada >= addDias(hoyStr, -7)).sort((a, b) => b.terminada.localeCompare(a.terminada)) },
  ];
  const medibles = mias.filter(medible);
  return {
    mias, abiertas, secciones,
    porHacer: abiertas.length, enProgreso: abiertas.filter(a => EST(a) === 'En progreso').length,
    vencidas: venc.length, vencenSemana: hoy.length + secciones[2].items.length,
    horas: abiertas.filter(medible).reduce((s, a) => s + (a.tamano ? TAMANOS[a.tamano].h : 0), 0),
    terminadas: medibles.filter(a => EST(a) === 'Terminado').length, medibles: medibles.length,
  };
}

/* ============ Calendario mensual (por fecha fin) ============ */

/** Días que se muestran para un mes `AAAA-MM`: de lunes a domingo, completando las semanas */
export function diasDelMes(mes: string): { dias: string[]; primero: string; ultimo: string } {
  const [Y, M] = mes.split('-').map(Number);
  const primero = `${mes}-01`, ultimo = `${mes}-${String(new Date(Y, M, 0).getDate()).padStart(2, '0')}`;
  const ini = addDias(primero, -((dow(primero) + 6) % 7)), fin = addDias(ultimo, (7 - dow(ultimo)) % 7);
  const dias: string[] = [];
  for (let d = ini; d <= fin; d = addDias(d, 1)) dias.push(d);
  return { dias, primero, ultimo };
}
export const mesMas = (mes: string, n: number): string => {
  const [y, m] = mes.split('-').map(Number), d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
/** Mueve la fecha fin; si el inicio quedaría después, se alinea con el nuevo fin. '' quita la fecha. */
export function moverFin(a: Actividad, nuevo: string): Actividad {
  if ((a.fin || '') === nuevo) return a;
  if (!nuevo) return { ...a, fin: '' };
  return { ...a, fin: nuevo, inicio: a.inicio && a.inicio > nuevo ? nuevo : a.inicio };
}

/* ============ Carga por persona y semana ============ */

export const lunesDe = (f: string): string => addDias(f, -((dow(f) + 6) % 7));
export const habil = (f: string): boolean => { const d = dow(f); return d !== 0 && d !== 6; };

export interface CeldaCarga { h: number; acts: Actividad[] }
export interface FilaCarga { p: string; celdas: CeldaCarga[]; atr: CeldaCarga; sinf: CeldaCarga; despues: CeldaCarga; sinTam: number }

/**
 * Horas pendientes por persona y semana, según el tamaño de cada actividad abierta (XS 1 h … XL 40 h), repartidas en los
 * días hábiles entre inicio y fin. Lo que ya pasó no cuenta: se reparte desde hoy. Las atrasadas, las posteriores a la
 * ventana y las sin fecha van en columnas aparte. Las actividades sin responsable van con p = ''.
 */
export function calcularCarga(acts: Actividad[], hoyStr: string, nSemanas: number): { semanas: string[]; filas: FilaCarga[] } {
  const l0 = lunesDe(hoyStr), semanas = Array.from({ length: nSemanas }, (_, i) => addDias(l0, 7 * i)), finVent = addDias(semanas[semanas.length - 1], 6);
  const abiertas = acts.filter(a => !cerrada(a));
  const personas = [...new Set(abiertas.map(a => a.responsable || ''))].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b, 'es')));
  const vacia = (): CeldaCarga => ({ h: 0, acts: [] });
  const filas: FilaCarga[] = personas.map(p => ({ p, celdas: semanas.map(vacia), atr: vacia(), sinf: vacia(), despues: vacia(), sinTam: 0 }));
  const idx = new Map(filas.map(f => [f.p, f]));
  for (const a of abiertas) {
    const f = idx.get(a.responsable || '')!, horas = a.tamano ? TAMANOS[a.tamano].h : 0;
    if (!a.tamano) f.sinTam++;
    if (!a.fin && !a.inicio) { f.sinf.h += horas; f.sinf.acts.push(a); continue; }
    const fin = a.fin || a.inicio, ini = a.inicio && a.fin ? a.inicio : fin;
    if (fin < l0) { f.atr.h += horas; f.atr.acts.push(a); continue; }
    if (ini > finVent) { f.despues.h += horas; f.despues.acts.push(a); continue; }
    const desde = ini < hoyStr ? hoyStr : ini, ds: string[] = [];
    for (let d = desde; d <= fin && ds.length < 400; d = addDias(d, 1)) if (habil(d)) ds.push(d);
    if (!ds.length) ds.push(fin < hoyStr ? hoyStr : fin);
    const porDia = horas / ds.length, tocadas = new Set<number>();
    for (const d of ds) {
      const k = semanas.indexOf(lunesDe(d));
      if (k >= 0) { f.celdas[k].h += porDia; tocadas.add(k); } else if (d > finVent) f.despues.h += porDia;
    }
    tocadas.forEach(k => f.celdas[k].acts.push(a));
    if (!tocadas.size && fin > finVent) f.despues.acts.push(a);
  }
  return { semanas, filas };
}

/** c0 vacío · c1 hasta 50 % · c2 hasta 85 % · c3 lleno · c4 saturado */
export const nivelCarga = (horas: number, cap: number): 'c0' | 'c1' | 'c2' | 'c3' | 'c4' =>
  horas <= 0 ? 'c0' : horas <= cap * 0.5 ? 'c1' : horas <= cap * 0.85 ? 'c2' : horas <= cap ? 'c3' : 'c4';
