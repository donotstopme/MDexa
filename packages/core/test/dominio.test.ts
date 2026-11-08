import { describe, expect, it } from 'vitest';
import {
  addDias, avanzarRep, bloqueada, choqueFechas, creaCiclo, crearSiguiente, leerEtqs, leerRepite, normaliza, parseMD,
  registrarBit, siguienteId, sumarMeses, descRepite, colorEtq,
} from '../src';
import type { Actividad, EntradaBit } from '../src';

const act = (p: Partial<Actividad>): Actividad => ({
  id: 1, negocio: '', actividad: 'x', tamano: '', prioridad: '', etiquetas: [], depende: [], repite: '', responsable: '',
  inicio: '', fin: '', estado: 'Backlog', terminada: '', ...p,
});

describe('utilidades', () => {
  it('normaliza acentos y mayúsculas', () => expect(normaliza('  Ácido Éñe ')).toBe('acido ene'));
  it('suma días', () => { expect(addDias('2026-02-27', 3)).toBe('2026-03-02'); expect(addDias('2026-03-01', -1)).toBe('2026-02-28'); });
  it('siguienteId no reutiliza ids de la bitácora ni de las notas', () => {
    const d = parseMD('| ID | Actividad |\n|---|---|\n| 2 | a |\n\n## Notas\n\n- #9 | 2026-01-01 | A | hola\n');
    expect(siguienteId(d)).toBe(10);
  });
});

describe('etiquetas', () => {
  it('limpia, separa y quita repetidas sin importar mayúsculas', () => {
    expect(leerEtqs('Uno, uno; Dos | #Tres,,')).toEqual(['Uno', 'Dos Tres']);
  });
  it('el color automático es estable y nunca es gris', () => {
    expect(colorEtq('urgente', {})).toBe(colorEtq('URGENTE', {}));
    expect(colorEtq('x', {})).not.toBe('gris');
    expect(colorEtq('x', { x: 'gris' })).toBe('gris');
  });
});

describe('dependencias', () => {
  const acts = [act({ id: 1, estado: 'Terminado', fin: '2026-01-10' }), act({ id: 2, estado: 'En progreso', fin: '2026-01-20' }),
    act({ id: 3, depende: [2, 1, 3, 99], inicio: '2026-01-15' })];
  it('ignora dependencias inexistentes o a sí misma', () => expect(bloqueada(acts, acts[2])).toBe(true));
  it('detecta choque de fechas sólo con dependencias abiertas', () => expect(choqueFechas(acts, acts[2]).map(a => a.id)).toEqual([2]));
  it('detecta ciclos', () => {
    const c = [act({ id: 1, depende: [2] }), act({ id: 2, depende: [3] }), act({ id: 3 })];
    expect(creaCiclo(c, 3, 1)).toBe(true);
    expect(creaCiclo(c, 1, 3)).toBe(false);
  });
});

describe('recurrencia', () => {
  it('lee alias', () => { expect(leerRepite('Semanal')).toBe('semana'); expect(leerRepite('Cada mes')).toBe('mes'); expect(leerRepite('???')).toBe(''); });
  it('mes: respeta el último día', () => { expect(sumarMeses('2026-01-31', 1)).toBe('2026-02-28'); expect(sumarMeses('2026-02-28', 1, 31)).toBe('2026-03-31'); });
  it('día hábil salta el fin de semana', () => expect(avanzarRep('2026-11-06', 'dia')).toBe('2026-11-09'));
  it('describe la regla con el día', () => expect(descRepite(act({ repite: 'semana', fin: '2026-11-06' }))).toBe('Cada viernes'));

  it('crea la siguiente en el futuro y mueve la marca de repetición', () => {
    const a = act({ id: 4, repite: 'semana', inicio: '2026-10-01', fin: '2026-10-03', estado: 'Terminado', terminada: '2026-10-03', subtareas: [{ t: 's', ok: true }] });
    const doc = { actividades: [a], bitacora: [], notas: [] };
    const { siguiente, original } = crearSiguiente(doc, a, new Date('2026-10-20T12:00:00'));
    expect(siguiente).toMatchObject({ id: 5, estado: 'Planeado', repite: 'semana', fin: '2026-10-24', inicio: '2026-10-22', depende: [] });
    expect(siguiente.subtareas).toEqual([{ t: 's', ok: false }]);
    expect(original.repite).toBe('');
    expect(a.repite).toBe('semana');   // no muta
  });
});

describe('bitácora', () => {
  const t0 = new Date('2026-11-01T10:00:00Z');
  const campo = (k: string, antes: string, despues: string) => ({ k, etq: k, antes, despues });

  it('junta cambios seguidos de la misma persona', () => {
    const b: EntradaBit[] = [];
    registrarBit(b, 'Ana', 'cambió', 1, [campo('estado', 'Planeado', 'En progreso')], null, t0);
    registrarBit(b, 'Ana', 'cambió', 1, [campo('estado', 'En progreso', 'Terminado'), campo('fin', '', '2026-11-02')], null, new Date(t0.getTime() + 60e3));
    expect(b).toHaveLength(1);
    expect(b[0].campos).toEqual([campo('estado', 'Planeado', 'Terminado'), campo('fin', '', '2026-11-02')]);
  });
  it('si el cambio se revierte, no deja entrada', () => {
    const b: EntradaBit[] = [];
    registrarBit(b, 'Ana', 'cambió', 1, [campo('estado', 'A', 'B')], null, t0);
    registrarBit(b, 'Ana', 'cambió', 1, [campo('estado', 'B', 'A')], null, new Date(t0.getTime() + 1000));
    expect(b).toHaveLength(0);
  });
  it('no junta si pasaron más de 3 min o es otra persona', () => {
    const b: EntradaBit[] = [];
    registrarBit(b, 'Ana', 'cambió', 1, [campo('estado', 'A', 'B')], null, t0);
    registrarBit(b, 'Luis', 'cambió', 1, [campo('estado', 'B', 'C')], null, new Date(t0.getTime() + 1000));
    registrarBit(b, 'Luis', 'cambió', 1, [campo('fin', '', 'x')], null, new Date(t0.getTime() + 10 * 60e3));
    expect(b).toHaveLength(3);
  });
  it('crear y borrar al momento no deja rastro', () => {
    const b: EntradaBit[] = [];
    registrarBit(b, 'Ana', 'creó', 7, [], { negocio: 'N', actividad: 'T' }, t0);
    registrarBit(b, 'Ana', 'eliminó', 7, [], { negocio: 'N', actividad: 'T' }, new Date(t0.getTime() + 1000));
    expect(b).toHaveLength(0);
  });
});

import { coincideBusqueda, palabras } from '../src';
describe('buscador', () => {
  const a = act({ id: 12, actividad: 'Revisión de Contratos', negocio: 'Legal', etiquetas: ['urgente'], subtareas: [{ t: 'Firmar anexo', ok: false }] });
  it('busca sin acentos y exige todas las palabras', () => {
    expect(coincideBusqueda(a, palabras('revision contratos'))).not.toBeNull();
    expect(coincideBusqueda(a, palabras('revision pagos'))).toBeNull();
  });
  it('encuentra por número y dice dónde fue la coincidencia oculta', () => {
    expect(coincideBusqueda(a, palabras('#12'))).not.toBeNull();
    expect(coincideBusqueda(a, palabras('anexo'))?.pista?.[0]).toBe('subtarea');
    expect(coincideBusqueda(a, palabras('urgente'))?.pista?.[0]).toBe('etiqueta');
  });
});

import { pendientesAlMover } from '../src';
describe('pendientesAlMover', () => {
  const acts = [act({ id: 1, estado: 'En progreso' }), act({ id: 2, depende: [1], estado: 'Planeado' })];
  it('avisa sólo al pasar a En progreso o Terminado', () => {
    expect(pendientesAlMover(acts, acts[1], 'En progreso').map(a => a.id)).toEqual([1]);
    expect(pendientesAlMover(acts, acts[1], 'Terminado')).toHaveLength(1);
    expect(pendientesAlMover(acts, acts[1], 'Cancelado')).toEqual([]);
    expect(pendientesAlMover(acts, acts[1], 'Planeado')).toEqual([]);
  });
});

import { trozosResaltado } from '../src';
describe('trozosResaltado', () => {
  it('marca sin acentos ni mayúsculas y une rangos', () => {
    expect(trozosResaltado('Revisión de Contratos', ['revision', 'contr'])).toEqual([
      { t: 'Revisión', marca: true }, { t: ' de ', marca: false }, { t: 'Contr', marca: true }, { t: 'atos', marca: false }]);
    expect(trozosResaltado('abc', [])).toEqual([{ t: 'abc', marca: false }]);
    expect(trozosResaltado('a b', ['a'])).toEqual([{ t: 'a b', marca: false }]);   // 1 letra no se marca
  });
});
