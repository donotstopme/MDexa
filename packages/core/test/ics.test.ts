import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { actividadesIcs, generarICS, icsEsc, icsLinea, parseMD } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const AHORA = new Date('2026-11-06T18:30:15.123Z');

describe('ics', () => {
  it('escapa , ; \\ y saltos de línea', () => expect(icsEsc('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne'));
  it('dobla las líneas a 75 bytes sin partir letras con acento', () => {
    const l = icsLinea('SUMMARY:' + 'ñ'.repeat(60)), partes = l.split('\r\n');
    expect(partes.length).toBeGreaterThan(1);
    for (const p of partes) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(partes.slice(1).every(p => p.startsWith(' '))).toBe(true);
    expect(partes.join('').replace(/ /g, '').replace('SUMMARY:', '')).toBe('ñ'.repeat(60));
  });
  const ics = generarICS(doc, doc.actividades.filter(a => a.id === 5 || a.id === 3), true, 'proyecto-demo.md', AHORA);
  it('calendario con eventos de todo el día en la fecha fin', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0')).toBe(true); expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('X-WR-CALNAME:Lanzamiento Portal de Clientes');
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(2);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261104'); expect(ics).toContain('DTEND;VALUE=DATE:20261105');
    expect(ics).toContain('UID:lanzamiento-portal-de-clientes-5@mdexa'); expect(ics).toContain('DTSTAMP:20261106T183015Z');
  });
  it('terminadas con ✓ y sin recordatorio; abiertas con recordatorio de 15 h antes', () => {
    expect(ics).toContain('✓'); expect((ics.match(/BEGIN:VALARM/g) || []).length).toBe(1); expect(ics).toContain('TRIGGER:-PT15H');
    expect(generarICS(doc, doc.actividades.filter(a => a.id === 5), false, 'x.md', AHORA)).not.toContain('VALARM');
  });
  it('la descripción trae responsable, subtareas y etiquetas', () => {
    const plano = ics.replace(/\r\n /g, '');
    expect(plano).toContain('Responsable: Marta'); expect(plano).toContain('Subtareas (2/4):\\n[x] Registro y login con correo'); expect(plano).toContain('Etiquetas: backend\\, seguridad');
  });
  it('qué se exporta: mías, visibles o todas; con o sin cerradas', () => {
    const mias = actividadesIcs(doc, 'mias', [], 'Ana', false);
    expect(mias.lista.every(a => a.responsable === 'Ana' && a.fin)).toBe(true); expect(mias.lista.some(a => a.estado === 'Terminado')).toBe(false);
    expect(actividadesIcs(doc, 'mias', [], 'Ana', true).lista.length).toBeGreaterThan(mias.lista.length);
    const t = actividadesIcs(doc, 'todas', [], '', false);
    expect(t.lista.length + t.sinFin).toBe(doc.actividades.filter(a => a.estado !== 'Terminado' && a.estado !== 'Cancelado').length);
    expect(actividadesIcs(doc, 'mias', [], '', false).lista).toEqual([]);
    expect(actividadesIcs(doc, 'filtradas', doc.actividades.slice(0, 2), '', true).lista).toHaveLength(2);
  });
});
