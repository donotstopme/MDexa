import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { datosSemana, parseMD, textoSemanal } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const HOY = '2026-11-06';   // viernes
const ids = (l: { id: number }[]) => l.map(a => a.id).sort((a, b) => a - b);

describe('datosSemana', () => {
  const esta = datosSemana(doc, 0, HOY), pasada = datosSemana(doc, -1, HOY);
  it('rango de la semana (lunes a domingo) y la siguiente', () => {
    expect([esta.lunes, esta.domingo, esta.corte, esta.pIni, esta.pFin]).toEqual(['2026-11-02', '2026-11-08', HOY, '2026-11-09', '2026-11-15']);
    expect([pasada.lunes, pasada.domingo, pasada.corte]).toEqual(['2026-10-26', '2026-11-01', '2026-11-02']);
  });
  it('terminadas según la fecha de término; con retraso las que pasaron su fin', () => {
    expect(ids(esta.terminadas)).toEqual([]);
    expect(ids(pasada.terminadas)).toEqual([3]);            // #3 se terminó el 30 oct
    expect(ids(pasada.conRetraso)).toEqual([3]);
  });
  it('atrasadas al corte, en curso (sin contar las atrasadas) y lo que viene', () => {
    expect(ids(esta.atrasadas)).toEqual([5, 16]);
    expect(ids(esta.enCurso)).toEqual([4]);
    expect(ids(esta.viene)).toEqual([4, 7, 8, 15].filter(i => ids(esta.viene).includes(i)));
    expect(esta.viene.every(a => (a.fin >= '2026-11-09' && a.fin <= '2026-11-15') || (a.inicio >= '2026-11-09' && a.inicio <= '2026-11-15'))).toBe(true);
    expect(esta.bloq.length).toBeGreaterThan(3);
  });
});

describe('textoSemanal', () => {
  const o = { archivo: 'proyecto-demo.md', nombreApp: 'MDexa', hoy: HOY };
  const s = datosSemana(doc, 0, HOY);
  it('texto plano con título, resumen y secciones', () => {
    const t = textoSemanal(doc, s, false, o);
    expect(t.titulo).toMatch(/^Avance semanal · Lanzamiento Portal de Clientes · 02.nov al 08.nov$/);
    expect(t.cuerpo).toMatch(/Avance del proyecto: 25% \(3 de 12 actividades terminadas\) · meta al 18.dic.2026 · Atrasado\./);
    for (const x of ['TERMINADAS ESTA SEMANA (0)', 'ATRASADAS (2)', 'BLOQUEADAS POR OTRA ACTIVIDAD', 'EN PROGRESO (1)', 'QUÉ VIENE']) expect(t.cuerpo).toContain(x);
    expect(t.cuerpo).toMatch(/• Autenticación y roles — Desarrollo · Marta · vencía 04.nov · 2 días de atraso · En progreso/);
    expect(t.cuerpo.endsWith('— Generado con MDexa')).toBe(true);
  });
  it('HTML con estilos en línea y escapado', () => {
    const d2 = { ...doc, actividades: doc.actividades.map(a => (a.id === 5 ? { ...a, actividad: 'Probar <b>&</b>' } : a)) };
    const t = textoSemanal(d2, datosSemana(d2, 0, HOY), true, o);
    expect(t.cuerpo).toContain('<h2 style="font-size:18px'); expect(t.cuerpo).toContain('Probar &lt;b&gt;&amp;&lt;/b&gt;'); expect(t.cuerpo).not.toContain('Probar <b>');
  });
});
