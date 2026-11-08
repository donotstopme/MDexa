import { COLORES_ETQ } from './constantes';
import type { Actividad, ColorEtiqueta } from './tipos';
import { normaliza } from './utilidades';

export const etqs = (a: Pick<Actividad, 'etiquetas'>): string[] => a.etiquetas || [];
export const limpiaEtq = (t: unknown): string => String(t || '').replace(/[|,;#\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);

/** Color elegido a mano o, si no hay, uno estable calculado del nombre */
export function colorEtq(t: string, coloresEtq: Record<string, ColorEtiqueta>): ColorEtiqueta {
  const k = normaliza(t);
  if (coloresEtq[k]) return coloresEtq[k];
  let h = 0;
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const auto = (Object.keys(COLORES_ETQ) as ColorEtiqueta[]).filter(c => c !== 'gris');
  return auto[h % auto.length];
}

/** Todas las etiquetas en uso, sin repetir (sin importar mayúsculas) */
export function todasEtq(actividades: Actividad[]): string[] {
  const m = new Map<string, string>();
  actividades.forEach(a => etqs(a).forEach(t => { const k = normaliza(t); if (!m.has(k)) m.set(k, t); }));
  return [...m.values()].sort((a, b) => a.localeCompare(b, 'es'));
}
export const tieneEtq = (a: Actividad, t: string): boolean => etqs(a).some(x => normaliza(x) === normaliza(t));

export function leerEtqs(txt: unknown): string[] {
  const out: string[] = [];
  String(txt || '').split(/[,;]/).map(limpiaEtq).forEach(t => { if (t && !out.some(x => normaliza(x) === normaliza(t))) out.push(t); });
  return out;
}

/** Nombre canónico de una etiqueta: el de la primera actividad que la usa */
export const canonEtqEn = (actividades: Actividad[], t: string): string => todasEtq(actividades).find(x => normaliza(x) === normaliza(t)) || t;
