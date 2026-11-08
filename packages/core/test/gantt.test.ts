import { describe, expect, it } from 'vitest';
import { conDependencia, diaEn, moverBarra, problemaEnlace, programarPorClic, rangoGantt, rutaFlecha, sinDependencia, xDe } from '../src';
import type { Actividad } from '../src';

const act = (p: Partial<Actividad>): Actividad => ({
  id: 1, negocio: '', actividad: 'x', tamano: '', prioridad: '', etiquetas: [], depende: [], repite: '', responsable: '',
  inicio: '', fin: '', estado: 'Planeado', terminada: '', ...p,
});

describe('rango y posiciones', () => {
  const r = rangoGantt([act({ inicio: '2026-11-10', fin: '2026-11-20' })], { inicio: '2026-10-05', fin: '2026-12-18' }, '2026-11-06');
  it('empieza en lunes y termina 10 días después de la última fecha', () => {
    expect(r.ini).toBe('2026-09-28');   // 5 oct − 3 días = 2 oct → el lunes anterior es el 28 sep
    expect(r.fin).toBe('2026-12-28');
    expect(r.nd).toBe(92);
  });
  it('x y día a partir del píxel', () => {
    expect(xDe(r, 15, '2026-09-29')).toBe(15);
    expect(diaEn(r, 15, 31)).toBe('2026-09-30');
  });
});

describe('arrastrar barras', () => {
  it('mover desplaza ambas fechas', () => expect(moverBarra('2026-11-10', '2026-11-12', 'mover', 3)).toEqual({ inicio: '2026-11-13', fin: '2026-11-15' }));
  it('los extremos no se cruzan', () => {
    expect(moverBarra('2026-11-10', '2026-11-12', 'ini', 5)).toEqual({ inicio: '2026-11-12', fin: '2026-11-12' });
    expect(moverBarra('2026-11-10', '2026-11-12', 'fin', -5)).toEqual({ inicio: '2026-11-10', fin: '2026-11-10' });
    expect(moverBarra('2026-11-10', '2026-11-12', 'fin', 2)).toEqual({ inicio: '2026-11-10', fin: '2026-11-14' });
  });
});

describe('programar por clic', () => {
  it('sin fechas: usa la duración por tamaño', () => {
    expect(programarPorClic(act({ tamano: 'XL' }), '2026-11-10')).toMatchObject({ inicio: '2026-11-10', fin: '2026-11-14' });
    expect(programarPorClic(act({ tamano: 'L' }), '2026-11-10')).toMatchObject({ fin: '2026-11-11' });
    expect(programarPorClic(act({ tamano: 'S' }), '2026-11-10')).toMatchObject({ inicio: '2026-11-10', fin: '2026-11-10' });
  });
  it('completa la fecha que falta y avisa si no tiene sentido', () => {
    expect(programarPorClic(act({ inicio: '2026-11-10' }), '2026-11-15')).toMatchObject({ fin: '2026-11-15' });
    expect(programarPorClic(act({ inicio: '2026-11-10' }), '2026-11-05')).toEqual({ error: 'La fecha fin no puede ser antes del inicio' });
    expect(programarPorClic(act({ fin: '2026-11-10' }), '2026-11-15')).toEqual({ error: 'La fecha inicio no puede ser después del fin' });
    expect(programarPorClic(act({ fin: '2026-11-10' }), '2026-11-08')).toMatchObject({ inicio: '2026-11-08' });
  });
});

describe('dependencias desde el Gantt', () => {
  const acts = [act({ id: 1 }), act({ id: 2, depende: [1] }), act({ id: 3 })];
  it('detecta repetidas, círculos y a sí misma', () => {
    expect(problemaEnlace(acts, 1, 2)).toContain('ya depende');
    expect(problemaEnlace(acts, 2, 1)).toContain('círculo');
    expect(problemaEnlace(acts, 1, 1)).toBe('Elige otra actividad');
    expect(problemaEnlace(acts, 1, 3)).toBe('');
  });
  it('agrega sin duplicar y quita', () => {
    expect(conDependencia(acts[1], 1).depende).toEqual([1]);
    expect(conDependencia(acts[2], 1).depende).toEqual([1]);
    expect(sinDependencia(acts[1], 1).depende).toEqual([]);
  });
  it('rutas de flecha: recta o con rodeo', () => {
    expect(rutaFlecha(100, 10, 140, 50)).toBe('M100 10H108V50H137');
    expect(rutaFlecha(100, 10, 100, 50)).toBe('M100 10H108V27H88V50H97');
  });
});
