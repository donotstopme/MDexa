import { PRIORIDADES, TAMANOS } from '@mdexa/core';
import { IC } from './iconos';
import { MANUAL_PLANTILLA } from './manualPlantilla';

const svgIco = (n: string, t: number) => (IC[n] ? `<svg class="ic" viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${IC[n]}"/></svg>` : '');
const PATH_PRI: Record<string, string> = { Alta: 'M3 8.5l5-5 5 5M3 13l5-5 5 5', Media: 'M3 6h10M3 10.5h10', Baja: 'M3 5.5l5 5 5-5' };
const badgeTam = (t: string) => {
  const n = TAMANOS[t as keyof typeof TAMANOS]?.n ?? 0;
  let s = '<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true">';
  for (let i = 0; i < 5; i++) { const h = 4 + i * 2.5; s += `<rect x="${i * 4.6}" y="${14 - h}" width="3.2" height="${h}" rx="1" fill="currentColor" opacity="${i < n ? 1 : 0.2}"/>`; }
  return `<span class="tam tam-${t}" title="${t}: ${TAMANOS[t as keyof typeof TAMANOS]?.txt ?? ''}">${s}</svg><b>${t}</b></span>`;
};
const badgePri = (p: string) => `<span class="pri pri-${p}" title="Prioridad ${p}: ${PRIORIDADES[p as keyof typeof PRIORIDADES]?.d ?? ''}"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="${PATH_PRI[p] ?? ''}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg><b>${p}</b></span>`;

/** Manual de uso listo para mostrar (sustituye los marcadores por íconos e insignias reales) */
export function manualHtml(): string {
  return MANUAL_PLANTILLA
    .replace(/\{\{ico:([a-z]+):(\d+)\}\}/g, (_m, n: string, t: string) => svgIco(n, +t))
    .replace(/\{\{pri:(\w+)\}\}/g, (_m, p: string) => badgePri(p))
    .replace(/\{\{tam:(\w+)\}\}/g, (_m, t: string) => badgeTam(t))
    .replace(/\{\{estrella\}\}/g, `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path style="fill:currentColor" d="${IC.estrella}"/></svg>`);
}

/** Quita acentos y mayúsculas conservando la longitud del texto (para ubicar coincidencias) */
const normCh = (ch: string) => { const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return n.length === 1 ? n : ch.length === 1 ? ch : '\u0000'; };
export const normaliza = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Envuelve cada coincidencia en <mark class="man-hit"> dentro de los nodos de texto de `raiz` */
export function marcarCoincidencias(raiz: HTMLElement, palabras: string[]): void {
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT), nodos: Text[] = [];
  while (w.nextNode()) nodos.push(w.currentNode as Text);
  for (const n of nodos) {
    const chars = [...(n.nodeValue ?? '')], nt = chars.map(normCh).join(''), rangos: [number, number][] = [];
    for (const p of palabras) {
      if (p.length === 1) { if (nt.trim() === p) rangos.push([nt.indexOf(p), nt.indexOf(p) + 1]); continue; }
      let i = nt.indexOf(p);
      while (i >= 0) { rangos.push([i, i + p.length]); i = nt.indexOf(p, i + p.length); }
    }
    if (!rangos.length) continue;
    rangos.sort((a, b) => a[0] - b[0]);
    const juntos: [number, number][] = [];
    for (const r of rangos) { const u = juntos[juntos.length - 1]; if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]); else juntos.push([...r]); }
    const frag = document.createDocumentFragment(); let pos = 0;
    for (const [a, b] of juntos) {
      if (a > pos) frag.append(chars.slice(pos, a).join(''));
      const mk = document.createElement('mark'); mk.className = 'man-hit'; mk.textContent = chars.slice(a, b).join(''); frag.append(mk); pos = b;
    }
    frag.append(chars.slice(pos).join('')); n.replaceWith(frag);
  }
}
