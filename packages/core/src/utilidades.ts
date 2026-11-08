import type { Actividad, Documento, Subtarea } from './tipos';

export const normaliza = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Fecha local AAAA-MM-DD (equivale a toLocaleDateString('en-CA')) */
export const fechaISO = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const hoy = (ahora: Date = new Date()): string => fechaISO(ahora);

const aFecha = (f: string) => new Date(f + 'T00:00');
export const dias = (a: string, b: string): number => Math.round((Date.parse(b + 'T00:00') - Date.parse(a + 'T00:00')) / 864e5);
export const addDias = (f: string, n: number): string => { const d = aFecha(f); d.setDate(d.getDate() + n); return fechaISO(d); };

export const unicos = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
export const pl = (n: number, s: string, p: string): string => `${n} ${n === 1 ? s : p}`;

export const EST = (a: Pick<Actividad, 'estado'>) => a.estado || 'Backlog';
export const cerrada = (a: Actividad): boolean => EST(a) === 'Terminado' || EST(a) === 'Cancelado';
/** Las métricas no cuentan las actividades Backlog ni las canceladas */
export const medible = (a: Actividad): boolean => EST(a) !== 'Cancelado' && EST(a) !== 'Backlog';
export const vencida = (a: Actividad, hoyStr: string = hoy()): boolean => !cerrada(a) && !!a.fin && a.fin < hoyStr;
export const nomCorto = (a: Actividad): string => a.actividad.split('\n')[0];

export const subtareasDe = (a: Actividad): Subtarea[] => a.subtareas || [];
export const avanceSubs = (a: Actividad) => { const l = subtareasDe(a); return { h: l.filter(x => x.ok).length, n: l.length }; };
export const limpiaSub = (t: unknown): string => String(t || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

/** Siguiente número de actividad sin reutilizar los de actividades borradas */
export const siguienteId = (d: Pick<Documento, 'actividades' | 'bitacora' | 'notas'>): number =>
  Math.max(0, ...d.actividades.map(a => a.id), ...d.bitacora.map(e => e.act || 0), ...d.notas.map(n => n.act)) + 1;

export const candadoVigente = (c: { latido?: string; desde: string } | null, ahora = Date.now(), ttl = 5 * 60e3): boolean =>
  !!c && (ahora - Date.parse(c.latido || c.desde)) < ttl;

export const negocioDe = (a: Actividad): string => a.negocio || 'Sin negocio';

export const txtSubsDe = (a: Actividad): string => { const { h, n } = avanceSubs(a); return n ? `${h}/${n}` : ''; };
