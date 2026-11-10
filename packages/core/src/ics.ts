import { NOMBRE_APP } from './constantes';
import type { Actividad, Documento } from './tipos';
import { descRepite } from './recurrencia';
import { etqs } from './etiquetas';
import { EST, addDias, cerrada, negocioDe, nomCorto, normaliza, subtareasDe, txtSubsDe } from './utilidades';

const fmtTxt = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
export const icsEsc = (t: unknown): string => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
/** Las líneas largas se doblan a 75 bytes (con acentos cuenta bytes, no letras) */
export function icsLinea(l: string): string {
  const enc = new TextEncoder(), out: string[] = []; let cur = '', bytes = 0;
  for (const ch of l) { const n = enc.encode(ch).length; if (bytes + n > 74) { out.push(cur); cur = ' '; bytes = 1; } cur += ch; bytes += n; }
  out.push(cur); return out.join('\r\n');
}

/** Archivo .ics: cada actividad con fecha fin es un evento de todo el día; con `alarma`, un recordatorio la tarde anterior */
export function generarICS(d: Documento, acts: Actividad[], alarma: boolean, archivo: string, ahora: Date = new Date()): string {
  const sello = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const proy = d.meta.proyecto || archivo.replace(/\.md$/i, ''), uidBase = normaliza(proy).replace(/[^a-z0-9]+/g, '-') || 'mdexa';
  const ev = acts.map(a => {
    const dia = a.fin.replace(/-/g, ''), dia2 = addDias(a.fin, 1).replace(/-/g, '');
    const desc = [`${negocioDe(a)} · ${EST(a)}`, a.responsable && `Responsable: ${a.responsable}`, a.inicio && `Inicio: ${fmtTxt(a.inicio)}`, a.prioridad && `Prioridad: ${a.prioridad}`,
      a.tamano && `Tamaño: ${a.tamano}`, a.repite && `Se repite: ${descRepite(a)}`, etqs(a).length && `Etiquetas: ${etqs(a).join(', ')}`,
      subtareasDe(a).length && `Subtareas (${txtSubsDe(a)}):\n${subtareasDe(a).map(x => (x.ok ? '[x] ' : '[ ] ') + x.t).join('\n')}`,
      a.actividad.includes('\n') && `\n${a.actividad}`, `\n${proy} · ${NOMBRE_APP}`].filter(Boolean).join('\n');
    return ['BEGIN:VEVENT', `UID:${uidBase}-${a.id}@mdexa`, `DTSTAMP:${sello}`, `DTSTART;VALUE=DATE:${dia}`, `DTEND;VALUE=DATE:${dia2}`,
      `SUMMARY:${icsEsc(`#${a.id} ${nomCorto(a)}${EST(a) === 'Terminado' ? ' ✓' : ''}`)}`, `DESCRIPTION:${icsEsc(desc)}`, `CATEGORIES:${icsEsc(negocioDe(a))}`,
      'TRANSP:TRANSPARENT', ...(alarma && !cerrada(a) ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc('Vence: ' + nomCorto(a))}`, 'TRIGGER:-PT15H', 'END:VALARM'] : []), 'END:VEVENT'].map(icsLinea).join('\r\n');
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MDexa//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', icsLinea(`X-WR-CALNAME:${icsEsc(proy)}`), ...ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/** Qué actividades se exportan: sólo las mías, las visibles o todas; con o sin las cerradas. `sinFin` cuenta las que no tienen fecha fin. */
export function actividadesIcs(d: Documento, que: 'mias' | 'filtradas' | 'todas', visibles: Actividad[], usuario: string, conCerradas: boolean): { lista: Actividad[]; sinFin: number } {
  const base = que === 'mias' ? d.actividades.filter(a => usuario && normaliza(a.responsable || '') === normaliza(usuario)) : que === 'filtradas' ? visibles : d.actividades;
  const conFin = base.filter(a => conCerradas || !cerrada(a));
  return { lista: conFin.filter(a => a.fin), sinFin: conFin.filter(a => !a.fin).length };
}
