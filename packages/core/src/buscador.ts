import type { Actividad, Nota } from './tipos';
import { etqs } from './etiquetas';
import { negocioDe, normaliza, subtareasDe } from './utilidades';

export type CampoBusqueda = 'actividad' | 'negocio' | 'responsable' | 'etiqueta' | 'subtarea' | 'nota';
export type Pista = [CampoBusqueda, string, string?];

/** Palabras de búsqueda normalizadas (sin acentos ni mayúsculas) */
export const palabras = (q: string): string[] => normaliza(q).split(/\s+/).filter(Boolean);

function campos(a: Actividad, notasAct: Nota[] = []): Pista[] {
  return [
    ['actividad', a.actividad], ['negocio', negocioDe(a)], ['responsable', a.responsable || ''], ['etiqueta', etqs(a).join(' · ')],
    ...subtareasDe(a).map((x): Pista => ['subtarea', x.t]),
    ...notasAct.map((n): Pista => ['nota', n.texto, n.autor]),
  ];
}

/**
 * ¿La actividad tiene todas las palabras en alguno de sus campos? Devuelve null si no coincide;
 * si coincide, `pista` indica dónde cuando fue en etiquetas, subtareas o notas.
 */
export function coincideBusqueda(a: Actividad, pals: string[], notasAct: Nota[] = []): { pista: Pista | null } | null {
  const cs = campos(a, notasAct), norms = cs.map(c => normaliza(String(c[1])));
  let pista: Pista | null = null;
  for (const p of pals) {
    const num = p.replace(/^#/, '');
    if (/^\d+$/.test(num) && String(a.id) === num) continue;       // #12 o 12: el número de la actividad
    const i = norms.findIndex(x => x.includes(p));
    if (i < 0) return null;
    if (!pista && !['actividad', 'negocio', 'responsable'].includes(cs[i][0])) pista = cs[i];
  }
  return { pista };
}

const normCh = (ch: string) => { const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return n.length === 1 ? n : ch.length === 1 ? ch : '\u0000'; };

/** Trozos de `texto` para resaltar las palabras buscadas (sin acentos ni mayúsculas): [{ t, marca }] */
export function trozosResaltado(texto: string, pals: string[]): { t: string; marca: boolean }[] {
  const chars = [...String(texto ?? '')];
  if (!pals.length) return [{ t: chars.join(''), marca: false }];
  const nt = chars.map(normCh).join(''), rangos: [number, number][] = [];
  for (const p of pals) {
    if (p.length < 2 && !/\d/.test(p)) continue;
    let i = nt.indexOf(p);
    while (i >= 0) { rangos.push([i, i + p.length]); i = nt.indexOf(p, i + p.length); }
  }
  if (!rangos.length) return [{ t: chars.join(''), marca: false }];
  rangos.sort((x, y) => x[0] - y[0]);
  const j: [number, number][] = [];
  for (const r of rangos) { const u = j[j.length - 1]; if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]); else j.push([...r]); }
  const out: { t: string; marca: boolean }[] = []; let pos = 0;
  for (const [x, y] of j) { if (x > pos) out.push({ t: chars.slice(pos, x).join(''), marca: false }); out.push({ t: chars.slice(x, y).join(''), marca: true }); pos = y; }
  if (pos < chars.length) out.push({ t: chars.slice(pos).join(''), marca: false });
  return out;
}
