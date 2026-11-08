import type { Actividad, Meta } from './tipos';
import { creaCiclo, deps } from './dependencias';
import { addDias, dias } from './utilidades';

export type Zoom = 'dia' | 'semana' | 'mes';
/** Píxeles por día según el zoom */
export const PX_DIA: Record<Zoom, number> = { dia: 34, semana: 15, mes: 5 };

export interface RangoGantt { ini: string; fin: string; nd: number }

/** Rango visible: desde el lunes anterior a la primera fecha hasta 10 días después de la última */
export function rangoGantt(acts: Actividad[], meta: Pick<Meta, 'inicio' | 'fin'>, hoyStr: string): RangoGantt {
  const fechas = [hoyStr, meta.inicio, meta.fin, ...acts.flatMap(a => [a.inicio, a.fin])].filter(Boolean).sort();
  let ini = addDias(fechas[0], -3);
  ini = addDias(ini, -((new Date(ini + 'T00:00').getDay() + 6) % 7));
  const fin = addDias(fechas[fechas.length - 1], 10);
  return { ini, fin, nd: dias(ini, fin) + 1 };
}
export const xDe = (r: RangoGantt, px: number, f: string): number => dias(r.ini, f) * px;
export const diaEn = (r: RangoGantt, px: number, x: number): string => addDias(r.ini, Math.floor(x / px));

export type Asa = 'mover' | 'ini' | 'fin';
/** Nuevas fechas al arrastrar `d` días: mover desplaza ambas; un extremo nunca cruza al otro */
export function moverBarra(inicio: string, fin: string, tipo: Asa, d: number): { inicio: string; fin: string } {
  let ni = inicio, nf = fin;
  if (tipo === 'mover') { ni = addDias(ni, d); nf = addDias(nf, d); }
  else if (tipo === 'ini') { ni = addDias(ni, d); if (ni > nf) ni = nf; }
  else { nf = addDias(nf, d); if (nf < ni) nf = ni; }
  return { inicio: ni, fin: nf };
}

/** Clic en un día de una actividad sin fechas completas: la programa. Devuelve el error si no se puede. */
export function programarPorClic(a: Actividad, dia: string): Actividad | { error: string } {
  if (a.inicio && a.fin) return a;
  if (!a.inicio && !a.fin) return { ...a, inicio: dia, fin: addDias(dia, (({ L: 2, XL: 5 } as Record<string, number>)[a.tamano] || 1) - 1) };
  if (a.inicio) return dia < a.inicio ? { error: 'La fecha fin no puede ser antes del inicio' } : { ...a, fin: dia };
  return dia > a.fin ? { error: 'La fecha inicio no puede ser después del fin' } : { ...a, inicio: dia };
}

/** Por qué no se puede hacer que `t` dependa de `src` ('' si se puede) */
export function problemaEnlace(acts: Actividad[], src: number, t: number): string {
  const a = acts.find(x => x.id === t);
  if (!a || t === src) return 'Elige otra actividad';
  if (deps(acts, a).includes(src)) return `#${t} ya depende de #${src}`;
  if (creaCiclo(acts, t, src)) return `No: #${src} ya depende de #${t} y se formaría un círculo`;
  return '';
}
export const conDependencia = (a: Actividad, src: number): Actividad => ({ ...a, depende: [...new Set([...a.depende, src])] });
export const sinDependencia = (a: Actividad, src: number): Actividad => ({ ...a, depende: a.depende.filter(x => x !== src) });

/** Ruta de la flecha del fin de la barra origen (sx, sy) al inicio de la barra destino (tx, ty) */
export const rutaFlecha = (sx: number, sy: number, tx: number, ty: number, mitad = 23): string =>
  tx >= sx + 16 ? `M${sx} ${sy}H${sx + 8}V${ty}H${tx - 3}` : `M${sx} ${sy}H${sx + 8}V${ty + (ty > sy ? -mitad : mitad)}H${tx - 12}V${ty}H${tx - 3}`;
