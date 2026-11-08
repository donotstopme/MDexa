import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { datosAvance, etqUnidad, filasAvance, geometriaAvance, parseMD, resumenAvance } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const HOY = '2026-11-06';

describe('datosAvance (burn-up)', () => {
  const d = datosAvance(doc, 'act', HOY)!;
  it('coincide con la gráfica del original: hoy 3 de 12, ideal 5.2, 2.2 atrás', () => {
    expect([d.total, d.actual, d.hastaReal]).toEqual([12, 3, HOY]);
    expect(etqUnidad(d.idealHoy, 'act')).toBe('5.2');
    const r = resumenAvance(d);
    expect(r).toMatchObject({ tipo: 'detalle', actual: '3', total: '12', ideal: '5.2', dif: { cls: 't-dan', txt: '2.2 atrás' } });
  });
  it('estimación al ritmo actual: 13 feb 2027, 57 días después de la meta', () => {
    expect(d.estimada).toBe('2027-02-13');
    expect(resumenAvance(d)).toMatchObject({ fin: { tipo: 'fecha', f: '2027-02-13', vs: 57 } });
  });
  it('lo terminado es una escalera que acumula por día de término', () => {
    expect(d.real[0]).toEqual({ f: '2026-10-05', v: 0 });
    expect(d.real.find(p => p.f === '2026-10-08')!.v).toBe(1);
    expect(d.real.find(p => p.f === '2026-10-14')!.v).toBe(2);
    expect(d.real.find(p => p.f === '2026-10-30')!.v).toBe(3);
    expect(d.real.at(-1)).toEqual({ f: HOY, v: 3 });
  });
  it('en horas usa el tamaño', () => {
    const h = datosAvance(doc, 'h', HOY)!;
    expect([h.total, h.actual]).toEqual([177, 28]);
    expect(etqUnidad(h.actual, 'h')).toBe('28 h');
  });
  it('sin meta no hay gráfica; antes de iniciar no hay avance real', () => {
    expect(datosAvance({ ...doc, meta: { ...doc.meta, inicio: '' } }, 'act', HOY)).toBeNull();
    const antes = datosAvance(doc, 'act', '2026-09-01')!;
    expect(antes.real).toEqual([]); expect(resumenAvance(antes)).toMatchObject({ tipo: 'texto' });
  });
  it('tabla semanal con hoy y fin de meta marcados', () => {
    const f = filasAvance(d);
    expect(f[0]).toMatchObject({ f: '2026-10-05', real: 0, ideal: 0, dif: 0 });
    expect(f.find(x => x.marca === ' (hoy)')).toMatchObject({ f: HOY, real: 3 });
    expect(f.at(-1)).toMatchObject({ f: '2026-12-18', marca: ' (fin meta)', real: null, ideal: 12, dif: null });
  });
  it('geometría: ejes, ideal, escalera y proyección', () => {
    const g = geometriaAvance(d);
    expect(g.maxY).toBe(15); expect(g.yTicks.map(t => t.v)).toEqual([0, 5, 10, 15]);
    expect(g.idealPath.startsWith('M')).toBe(true); expect(g.realPath).toContain(' H'); expect(g.proy).not.toBeNull(); expect(g.xHoy).toBeGreaterThan(g.xIni);
    expect(g.ultimo!.v).toBe(3);
  });
});
