import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analizarMeta, armarBloques, backlogOculto, filtrar, filtrosVacios, parseMD, statsNegocios, type Filtros } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));
const HOY = '2026-11-06';
const orden = { k: 'inicio' as const, asc: true };
const con = (p: Partial<Filtros>): Filtros => ({ ...filtrosVacios(), ...p });
const ids = (f: Partial<Filtros>) => filtrar(doc, con(f), orden, { hoy: HOY }).map(a => a.id);

describe('filtrar', () => {
  it('sin filtros devuelve todo; los que no tienen fecha de inicio van al final', () => {
    const l = ids({});
    expect(l).toHaveLength(16);
    expect(l.slice(-3).sort((a, b) => a - b)).toEqual([10, 13, 14]);
  });
  it('por negocio, responsable, estado, tamaño, prioridad y etiqueta', () => {
    expect(ids({ neg: ['Calidad'] }).sort((a, b) => a - b)).toEqual([8, 9]);
    expect(ids({ resp: ['Sin responsable'] })).toEqual([10]);
    expect(ids({ est: ['Cancelado'] })).toEqual([14]);
    expect(ids({ tam: ['XL'] }).sort((a, b) => a - b)).toEqual([5, 7, 14]);
    expect(ids({ pri: ['Baja'] }).sort((a, b) => a - b)).toEqual([12, 14]);
    expect(ids({ etq: ['seguridad'] }).sort((a, b) => a - b)).toEqual([5, 9, 10]);
    expect(ids({ etq: ['Sin etiqueta'] })).toEqual([]);
  });
  it('estados especiales: vencida, bloqueada, recurrente', () => {
    expect(ids({ est: ['Vencida'] }).sort((a, b) => a - b)).toEqual([5, 16]);
    expect(ids({ est: ['Recurrente'] })).toEqual([15]);
    expect(ids({ est: ['Bloqueada'] }).length).toBeGreaterThan(3);
  });
  it('búsqueda y backlog', () => {
    expect(ids({ texto: 'facturas' })).toEqual([6]);
    expect(ids({ texto: 'pedro revisado' })).toEqual([5]);        // en las notas
    expect(ids({ verBacklog: false }).some(i => [10, 12, 13].includes(i))).toBe(false);
    expect(backlogOculto(con({ verBacklog: false, est: ['Backlog'] }))).toBe(false);
    expect(ids({ verBacklog: false, est: ['Backlog'] }).sort((a, b) => a - b)).toEqual([10, 12, 13]);
  });
});

describe('grupos y panel', () => {
  const lista = filtrar(doc, filtrosVacios(), orden, { hoy: HOY });
  it('por negocio, ordenados, con el vacío al final', () => {
    const b = armarBloques(lista, 'negocio', doc.actividades);
    expect(b.map(x => x.titulo)).toEqual(['Calidad', 'Capacitación', 'Desarrollo', 'Diseño', 'Gestión', 'Lanzamiento', 'Operaciones', 'Producto', 'Seguridad']);
    expect(b.find(x => x.titulo === 'Desarrollo')!.items).toHaveLength(4);
  });
  it('por responsable, estado y etiqueta (una actividad con dos etiquetas sale en ambas)', () => {
    expect(armarBloques(lista, 'responsable', doc.actividades).at(-1)!.titulo).toBe('Sin responsable');
    expect(armarBloques(lista, 'estado', doc.actividades).map(x => x.titulo)).toEqual(['Backlog', 'Planeado', 'En progreso', 'Terminado', 'Cancelado']);
    const e = armarBloques(lista, 'etiqueta', doc.actividades);
    expect(e.find(x => x.titulo === 'seguridad')!.items.map(a => a.id).sort((a, b) => a - b)).toEqual([5, 9, 10]);
  });
  it('sin agrupar: un bloque sin título', () => expect(armarBloques(lista, '', doc.actividades)).toHaveLength(1));
  it('panel de negocios', () => {
    const s = statsNegocios(doc, lista, HOY);
    expect(s).toHaveLength(9);
    expect(s.find(x => x.negocio === 'Desarrollo')).toMatchObject({ total: 4, act: 4, t: 0, venc: 2, pct: 0, visibles: 4 });
    expect(s.find(x => x.negocio === 'Producto')).toMatchObject({ total: 3, t: 2, act: 2, pct: 100 });
  });
});

describe('analizarMeta', () => {
  const a = analizarMeta(doc, HOY);
  it('avance y tiempo (coincide con el original: día 33 de 75, 44 %; 3 de 12, 25 %)', () => {
    expect(a.tiempo).toMatchObject({ totalD: 75, trans: 33, pct: 44, terminada: false, iniciada: true });
    expect([a.terminadas, a.medibles, a.pctAv, a.sinContar]).toEqual([3, 12, 25, 4]);
    expect(a.ritmo?.txt).toBe('Atrasado');
  });
  it('cuentas por estado y vencidas', () => {
    expect(a.cuenta).toMatchObject({ Backlog: 3, Planeado: 6, 'En progreso': 3, Terminado: 3, Cancelado: 1 });
    expect(a.vencidas).toBe(2);
  });
});

import { aplicarSoltar, valorDeGrupo } from '../src';
describe('soltar una tarjeta en el tablero', () => {
  const a = doc.actividades.find(x => x.id === 6)!;   // Planeado · Desarrollo · Marta · Alta
  it('valor de cada clave de grupo', () => {
    expect(valorDeGrupo('Calidad', 'negocio')).toEqual({ campo: 'negocio', valor: 'Calidad' });
    expect(valorDeGrupo('Sin negocio', 'negocio')).toEqual({ campo: 'negocio', valor: '' });
    expect(valorDeGrupo('responsable:Ana', 'responsable')).toEqual({ campo: 'responsable', valor: 'Ana' });
    expect(valorDeGrupo('__fav', 'negocio')).toBeNull();
    expect(valorDeGrupo(null, 'negocio')).toBeNull();
  });
  it('cambia el estado y el campo del carril', () => {
    const r = aplicarSoltar(a, 'Terminado', 'Calidad', 'negocio', new Date('2026-11-06T12:00:00'));
    expect(r.a).toMatchObject({ estado: 'Terminado', terminada: '2026-11-06', negocio: 'Calidad' });
    expect(r.cambios).toEqual(['Terminado', 'negocio Calidad']);
    expect(aplicarSoltar(a, 'Planeado', 'responsable:Ana', 'responsable').a.responsable).toBe('Ana');
    expect(aplicarSoltar(a, 'Planeado', 'prioridad:', 'prioridad')).toMatchObject({ cambios: ['sin prioridad'], a: { prioridad: '' } });
  });
  it('sin cambios no hace nada; a "sin negocio" no borra el negocio', () => {
    expect(aplicarSoltar(a, 'Planeado', 'Desarrollo', 'negocio')).toEqual({ a, cambios: [] });
    expect(aplicarSoltar(a, 'Planeado', 'Sin negocio', 'negocio').cambios).toEqual([]);
  });
});
