import { describe, expect, it } from 'vitest';
import { abrevNeg, diasDelMes, mesMas, moverFin, normaliza, resumenMias } from '../src';
import type { Actividad } from '../src';

const act = (p: Partial<Actividad>): Actividad => ({
  id: 1, negocio: '', actividad: 'x', tamano: '', prioridad: '', etiquetas: [], depende: [], repite: '', responsable: 'Ana',
  inicio: '', fin: '', estado: 'Planeado', terminada: '', ...p,
});

describe('resumenMias (hoy = viernes 2026-11-06)', () => {
  const hoy = '2026-11-06';
  const acts = [
    act({ id: 1, fin: '2026-11-04' }),                                   // vencida
    act({ id: 2, fin: hoy, estado: 'En progreso', tamano: 'M' }),         // hoy
    act({ id: 3, fin: '2026-11-08', tamano: 'S' }),                       // domingo: esta semana
    act({ id: 4, fin: '2026-11-13' }),                                   // próxima
    act({ id: 5, fin: '2026-12-01' }),                                   // más adelante
    act({ id: 6 }),                                                      // sin fecha
    act({ id: 7, estado: 'Terminado', fin: '2026-11-02', terminada: '2026-11-03' }),
    act({ id: 8, estado: 'Terminado', fin: '2026-10-01', terminada: '2026-10-02' }),
    act({ id: 9, responsable: 'Luis', fin: hoy }),
    act({ id: 10, estado: 'Cancelado', fin: hoy }),
  ];
  const r = resumenMias(acts, 'ana', hoy, normaliza);
  const ids = (k: string) => r.secciones.find(s => s.k === k)!.items.map(a => a.id);
  it('reparte en secciones por fecha fin', () => {
    expect(ids('venc')).toEqual([1]); expect(ids('hoy')).toEqual([2]); expect(ids('sem')).toEqual([3]);
    expect(ids('prox')).toEqual([4]); expect(ids('luego')).toEqual([5]); expect(ids('sinf')).toEqual([6]);
    expect(ids('term')).toEqual([7]);
  });
  it('calcula el resumen sin contar lo de otras personas ni lo cancelado', () => {
    expect(r.mias.some(a => a.id === 9)).toBe(false);
    expect(r).toMatchObject({ porHacer: 6, enProgreso: 1, vencidas: 1, vencenSemana: 2, horas: 12, terminadas: 2, medibles: 8 });
  });
});

describe('calendario', () => {
  it('noviembre 2026 va de lunes 26 oct a domingo 6 dic', () => {
    const { dias, primero, ultimo } = diasDelMes('2026-11');
    expect([dias[0], dias.at(-1), primero, ultimo]).toEqual(['2026-10-26', '2026-12-06', '2026-11-01', '2026-11-30']);
    expect(dias.length % 7).toBe(0);
  });
  it('mesMas cruza el año', () => { expect(mesMas('2026-12', 1)).toBe('2027-01'); expect(mesMas('2026-01', -1)).toBe('2025-12'); });
  it('moverFin alinea el inicio, quita la fecha y no cambia si es la misma', () => {
    const a = act({ inicio: '2026-11-10', fin: '2026-11-12' });
    expect(moverFin(a, '2026-11-08')).toMatchObject({ inicio: '2026-11-08', fin: '2026-11-08' });
    expect(moverFin(a, '2026-11-20')).toMatchObject({ inicio: '2026-11-10', fin: '2026-11-20' });
    expect(moverFin(a, '').fin).toBe('');
    expect(moverFin(a, '2026-11-12')).toBe(a);
  });
  it('abrevNeg', () => { expect(abrevNeg('Ventas Norte')).toBe('VN'); expect(abrevNeg('Legal')).toBe('LE'); });
});

import { calcularCarga, nivelCarga, lunesDe } from '../src';
describe('carga por persona y semana (hoy = viernes 2026-11-06)', () => {
  const hoy = '2026-11-06';
  const acts = [
    act({ id: 1, responsable: 'Ana', tamano: 'XL', inicio: '2026-11-09', fin: '2026-11-13' }),   // 40 h en 5 días hábiles de la semana 11-09
    act({ id: 2, responsable: 'Ana', tamano: 'M', inicio: '2026-11-02', fin: '2026-11-10' }),    // desde hoy: vie 6, lun 9, mar 10 → 8/3 h
    act({ id: 3, responsable: 'Ana', tamano: 'S', fin: '2026-10-30' }),                           // atrasada
    act({ id: 4, responsable: 'Ana', tamano: 'S', inicio: '2027-02-01', fin: '2027-02-05' }),     // después
    act({ id: 5, responsable: 'Ana' }),                                                           // sin fecha, sin tamaño
    act({ id: 6, responsable: '', tamano: 'L', fin: '2026-11-06' }),                              // sin responsable
    act({ id: 7, responsable: 'Ana', tamano: 'L', fin: '2026-11-12', estado: 'Terminado', terminada: '2026-11-05' }),
  ];
  const { semanas, filas } = calcularCarga(acts, hoy, 4);
  const ana = filas.find(f => f.p === 'Ana')!;
  it('ventana de semanas desde el lunes de esta semana', () => {
    expect(semanas).toEqual(['2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23']);
    expect(lunesDe('2026-11-08')).toBe('2026-11-02');
  });
  it('reparte horas entre días hábiles y separa atrasadas, después y sin fecha', () => {
    expect(ana.celdas[1].h).toBeCloseTo(40 + 16 / 3, 5);      // XL + 2 de los 3 días de la M
    expect(ana.celdas[0].h).toBeCloseTo(8 / 3, 5);            // el viernes de hoy
    expect(ana.atr.acts.map(a => a.id)).toEqual([3]);
    expect(ana.despues.acts.map(a => a.id)).toEqual([4]);
    expect(ana.sinf.acts.map(a => a.id)).toEqual([5]);
    expect(ana.sinTam).toBe(1);
  });
  it('ignora lo cerrado y deja a "sin responsable" al final', () => {
    expect(filas.map(f => f.p)).toEqual(['Ana', '']);
    expect(filas[1].celdas[0].h).toBe(16);                     // L con fin hoy: todo hoy
    expect([...ana.celdas.flatMap(c => c.acts), ...ana.atr.acts].some(a => a.id === 7)).toBe(false);
  });
  it('niveles de carga', () => {
    expect([0, 20, 34, 40, 41].map(h => nivelCarga(h, 40))).toEqual(['c0', 'c1', 'c2', 'c3', 'c4']);
  });
});
