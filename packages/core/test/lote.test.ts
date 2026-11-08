import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bloqueadasAlMover, loteEliminar, loteEstado, loteFechas, loteNegocio, lotePrioridad, loteResponsable, loteTamano, parseMD, rangoSeleccion } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const S = (...i: number[]) => new Set(i);
const get = (d: typeof doc, id: number) => d.actividades.find(a => a.id === id)!;

describe('cambios en lote', () => {
  it('estado (fija la fecha de término), tamaño, prioridad, responsable y negocio sólo en las elegidas', () => {
    let d = loteEstado(doc, S(6, 8), 'Terminado', new Date('2026-11-06T12:00:00'));
    expect([get(d, 6).estado, get(d, 6).terminada, get(d, 8).terminada, get(d, 7).estado]).toEqual(['Terminado', '2026-11-06', '2026-11-06', 'Planeado']);
    d = loteEstado(d, S(6), 'Planeado'); expect(get(d, 6).terminada).toBe('');
    d = loteTamano(d, S(8), 'XL'); d = lotePrioridad(d, S(8), ''); d = loteResponsable(d, S(8), 'Rosa'); d = loteNegocio(d, S(8), 'Legal');
    expect(get(d, 8)).toMatchObject({ tamano: 'XL', prioridad: '', responsable: 'Rosa', negocio: 'Legal' });
    expect(get(d, 9)).toMatchObject({ responsable: 'Sofía', negocio: 'Calidad' });
  });
  it('avisa de las bloqueadas al pasar a En progreso o Terminado, no a Cancelado', () => {
    expect(bloqueadasAlMover(doc, S(6, 8), 'En progreso').map(a => a.id)).toEqual([6]);    // #6 espera a #5; #8 no depende
    expect(bloqueadasAlMover(doc, S(6), 'Cancelado')).toEqual([]);
  });
  it('fechas: mover, fijar inicio/fin sin cruzarlas, quitar', () => {
    const base = get(doc, 8);                                                             // 9 → 13 nov
    expect(get(loteFechas(doc, S(8), { op: 'mover', dias: 7 }), 8)).toMatchObject({ inicio: '2026-11-16', fin: '2026-11-20' });
    expect(get(loteFechas(doc, S(8), { op: 'mover', dias: -3 }), 8)).toMatchObject({ inicio: '2026-11-06', fin: '2026-11-10' });
    expect(get(loteFechas(doc, S(10), { op: 'mover', dias: 5 }), 10)).toMatchObject({ inicio: '', fin: '2026-12-14' });   // sin inicio no se inventa
    expect(get(loteFechas(doc, S(8), { op: 'ini', fecha: '2026-11-20' }), 8)).toMatchObject({ inicio: '2026-11-20', fin: '2026-11-20' });
    expect(get(loteFechas(doc, S(8), { op: 'fin', fecha: '2026-11-01' }), 8)).toMatchObject({ inicio: '2026-11-01', fin: '2026-11-01' });
    expect(get(loteFechas(doc, S(8), { op: 'quitar' }), 8)).toMatchObject({ inicio: '', fin: '' });
    expect(base.inicio).toBe('2026-11-09');                                                // no muta
  });
  it('eliminar quita también las notas', () => {
    const d = loteEliminar(doc, S(5, 14));
    expect(d.actividades.some(a => [5, 14].includes(a.id))).toBe(false);
    expect(d.notas.some(n => [5, 14].includes(n.act))).toBe(false); expect(d.notas.length).toBe(doc.notas.length - 3);
  });
  it('rango con Mayús+clic', () => {
    expect(rangoSeleccion([1, 2, 3, 4, 5], 2, 4)).toEqual([2, 3, 4]); expect(rangoSeleccion([1, 2, 3, 4, 5], 4, 2)).toEqual([2, 3, 4]); expect(rangoSeleccion([1, 2], 9, 2)).toEqual([2]);
  });
});
