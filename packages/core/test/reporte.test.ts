import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analizarReporte, parseMD, quienTermino, reporteMd, resultado, situacion } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const x = analizarReporte(doc, '2026-11-06');

describe('analizarReporte', () => {
  it('mismas cifras que el resumen de la meta', () => {
    expect([x.terminadas, x.medibles, x.pctAv]).toEqual([3, 12, 25]);
    expect(x.venc.map(a => a.id).sort((a, b) => a - b)).toEqual([5, 16]);
    expect(x.comp.map(a => a.id).sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(x.canc.map(a => a.id)).toEqual([14]);
    expect(x.conRetrasoL.map(a => a.id)).toEqual([3]);            // #3 terminó el 30 oct y su fin era el 28
  });
  it('por responsable y por negocio, con "Sin responsable" al final', () => {
    expect(x.porResp.map(r => r.k)).toEqual(['Ana', 'Luis', 'Marta', 'Pedro', 'Sofía', 'Sin responsable']);
    const marta = x.porResp.find(r => r.k === 'Marta')!;
    expect(marta).toMatchObject({ total: 3, comp: 0, venc: 2, med: 3, pct: 0 });
    expect(x.porNeg).toHaveLength(9);
  });
  it('esfuerzo por tamaño: no incluye backlog ni canceladas', () => {
    expect(x.horasTotal).toBe(177);               // 12 actividades medibles: M+S+L+L+XL+L+XL+M+M+L+XS+S
    expect(x.horasHechas).toBe(8 + 4 + 16);
  });
  it('alertas: vencidas, bloqueadas, choque, XL, sin responsable, sin fecha, fuera de meta', () => {
    const t = x.alertas.join('\n');
    expect(t).toContain('2 actividades están vencidas'); expect(t).toContain('bloqueadas'); expect(t).toContain('antes de que termine la actividad de la que depende');
    expect(t).toContain('XL'); expect(t).toContain('responsable');
  });
});

describe('piezas del reporte', () => {
  it('resultado y situación', () => {
    expect(resultado({ fin: '2026-10-28', terminada: '2026-10-30' } as never)).toEqual({ txt: '2 días tarde', cls: 't-dan' });
    expect(resultado({ fin: '2026-10-28', terminada: '2026-10-28' } as never).txt).toBe('A tiempo');
    expect(resultado({ fin: '2026-10-28', terminada: '2026-10-27' } as never).txt).toBe('A tiempo (1 día antes)');
    expect(situacion({ venc: true, fin: '2026-11-04' }, '2026-11-06').txt).toBe('Vencida hace 2 días');
    expect(situacion({ venc: false, fin: '' }, '2026-11-06').txt).toBe('Sin fecha fin');
    expect(situacion({ venc: false, fin: '2026-11-06' }, '2026-11-06').txt).toBe('Vence hoy');
    expect(situacion({ venc: false, fin: '2026-11-20' }, '2026-11-06')).toEqual({ txt: 'Vence en 14 días', cls: 't-mut' });
  });
  it('quién marcó terminado y actividad del equipo (últimos 7 días)', () => {
    expect(quienTermino(doc, 3)).toBe('Luis');
    expect(x.equipo).toMatchObject([{ autor: 'Ana', total: 1, cambio: 1 }]);   // sólo el cambio del 2 de nov cae en los últimos 7 días
  });
});

describe('reporteMd', () => {
  const md = reporteMd(doc, x, { usuario: 'Ana', nombreApp: 'MDexa', version: '1.34.1', ahora: new Date('2026-11-06T12:00:00') });
  it('trae las secciones principales', () => {
    for (const s of ['# Lanzamiento Portal de Clientes', '## Resumen general', '## Alertas', '## Avance por responsable', '## Avance por negocio', '## Tamaño y esfuerzo',
      '## Actividades terminadas (3)', '## Actividades sin terminar (12)', '## Actividades canceladas (1)', '## Quién hizo qué', '## Notas de los últimos 14 días']) expect(md).toContain(s);
    expect(md).toContain('3 de 12 actividades terminadas (25%');
    expect(md).toContain('2 días tarde');
    expect(md).toContain('## Avance acumulado contra la meta'); expect(md).toContain('Hoy: 3 de 12 terminadas; lo ideal serían 5.2 · 2.2 atrás'); expect(md).toContain('| 18 dic 2026 (fin meta) | — | 12 | — |');
  });
});
