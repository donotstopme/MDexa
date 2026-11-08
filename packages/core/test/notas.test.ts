import { describe, expect, it } from 'vitest';
import {
  agregarNota, agregarSubtarea, alternarSubtarea, conColorEtiqueta, conEtiquetas, mencionaA, mencionesEn, notasDe, parseMD,
  personasConocidas, quitarNota, quitarSubtarea, toMD,
} from '../src';

const d0 = () => parseMD('| ID | Actividad | Responsable |\n|---|---|---|\n| 1 | Uno | Luis Méndez |\n| 2 | Dos | Ana |\n');
const t = (s: string) => new Date(s);

describe('notas', () => {
  it('agrega, ordena y quita; ignora vacías y actividades inexistentes', () => {
    let d = agregarNota(d0(), 1, 'Ana', '  hola  ', t('2026-11-02T10:00:00Z'));
    d = agregarNota(d, 1, 'Luis', 'antes', t('2026-11-01T10:00:00Z'));
    expect(agregarNota(d, 1, 'Ana', '   ')).toBe(d);
    expect(agregarNota(d, 99, 'Ana', 'x')).toBe(d);
    expect(notasDe(d, 1).map(n => n.texto)).toEqual(['antes', 'hola']);
    expect(notasDe(quitarNota(d, d.notas[0]), 1)).toHaveLength(1);
  });
  it('sobreviven al .md, incluso con saltos de línea', () => {
    const d = agregarNota(d0(), 2, 'Ana', 'línea 1\nlínea 2', t('2026-11-02T10:00:00Z'));
    expect(parseMD(toMD(d)).notas[0].texto).toBe('línea 1\nlínea 2');
  });
});

describe('subtareas', () => {
  it('agregar, alternar y quitar; sin subtareas no queda el campo', () => {
    let a = agregarSubtarea(d0().actividades[0], ' Revisar\ncontrato ');
    expect(a.subtareas).toEqual([{ t: 'Revisar contrato', ok: false }]);
    a = alternarSubtarea(agregarSubtarea(a, 'Firmar'), 1);
    expect(a.subtareas!.map(x => x.ok)).toEqual([false, true]);
    a = quitarSubtarea(quitarSubtarea(a, 0), 0);
    expect('subtareas' in a).toBe(false);
    expect(agregarSubtarea(a, '   ')).toBe(a);
  });
});

describe('etiquetas', () => {
  it('se editan como texto y el color se guarda normalizado', () => {
    const d = d0();
    expect(conEtiquetas(d.actividades[0], 'Uno, uno, Dos').etiquetas).toEqual(['Uno', 'Dos']);
    expect(conColorEtiqueta(d, 'Diseño', 'rosa').coloresEtq).toEqual({ diseno: 'rosa' });
  });
});

describe('menciones', () => {
  const d = agregarNota(d0(), 1, 'Pedro', 'x', t('2026-11-02T10:00:00Z'));
  const pers = personasConocidas(d, 'Sofía');
  it('reúne personas de responsables, autores y usuario', () => expect(pers).toEqual(['Ana', 'Luis Méndez', 'Pedro', 'Sofía']));
  it('reconoce @Nombre, @Primer-nombre único y no los correos', () => {
    expect(mencionesEn('hola @Ana y @luis, mira ana@correo.com', pers).map(m => m.nombre)).toEqual(['Ana', 'Luis Méndez']);
    expect(mencionesEn('@Sofía', pers)[0]).toMatchObject({ i: 0, len: 6 });
    expect(mencionesEn('@nadie', pers)).toEqual([]);
  });
  it('mencionaA ignora acentos y mayúsculas', () => {
    const n = { act: 1, fecha: '', autor: 'Ana', texto: '¿puedes revisar @sofia?' };
    expect(mencionaA(n, 'Sofía', pers)).toBe(true);
    expect(mencionaA(n, 'Pedro', pers)).toBe(false);
  });
});

import { estadoEscritura, insertarMencion, sugerirMencion, colorAutor, iniciales } from '../src';
describe('menciones al escribir', () => {
  const pers = ['Ana', 'Luis Méndez', 'Pedro'];
  it('sugiere sólo dentro de una @mención y filtra por nombre o apellido', () => {
    expect(sugerirMencion('hola', 4, pers)).toBeNull();
    expect(sugerirMencion('hola @', 6, pers)).toEqual({ ini: 5, lista: pers });
    expect(sugerirMencion('hola @me', 8, pers)).toEqual({ ini: 5, lista: ['Luis Méndez'] });
    expect(sugerirMencion('a@b', 3, pers)).toBeNull();                 // un correo
    expect(sugerirMencion('@pedro', 6, pers)).toBeNull();              // ya está completa
  });
  it('inserta la mención y deja el cursor después', () => {
    expect(insertarMencion('hola @me ya', 5, 8, 'Luis Méndez')).toEqual({ texto: 'hola @Luis Méndez ya', cursor: 18 });
  });
  it('color e iniciales del autor', () => { expect(colorAutor('Ana')).toBe(colorAutor('Ana')); expect(iniciales('luis méndez ruiz')).toBe('LM'); });
});

describe('estadoEscritura', () => {
  const base = { hayArchivo: true, masNuevo: false, modo: 'lectura' as const, puedeEscribir: true, candado: null, usuario: 'Ana' };
  const ahora = Date.parse('2026-11-06T12:00:00Z');
  it('libre, editando, ocupado, más nuevo, sin archivo', () => {
    expect(estadoEscritura({ ...base, ahora }).ok).toBe(true);
    expect(estadoEscritura({ ...base, modo: 'edicion', ahora }).msg).toContain('al momento');
    const l = '2026-11-06T11:59:00Z';
    expect(estadoEscritura({ ...base, candado: { usuario: 'Luis', desde: l, latido: l }, ahora })).toMatchObject({ ok: false });
    const v = '2026-11-06T10:00:00Z';
    expect(estadoEscritura({ ...base, candado: { usuario: 'Luis', desde: v, latido: v }, ahora }).ok).toBe(true);   // abandonado
    expect(estadoEscritura({ ...base, masNuevo: true, ahora }).ok).toBe(false);
    expect(estadoEscritura({ ...base, hayArchivo: false, ahora }).ok).toBe(false);
    expect(estadoEscritura({ ...base, puedeEscribir: false, ahora }).ok).toBe(false);
  });
});

import { ponerEtiqueta, conSubtareas } from '../src';
describe('ponerEtiqueta', () => {
  it('pone y quita en varias actividades usando el nombre que ya existe', () => {
    const d = parseMD('| ID | Actividad | Etiquetas |\n|---|---|---|\n| 1 | a | Diseño |\n| 2 | b | |\n| 3 | c | |');
    const n = ponerEtiqueta(d, [2, 3], 'diseño', true);
    expect(n.actividades.map(a => a.etiquetas)).toEqual([['Diseño'], ['Diseño'], ['Diseño']]);
    expect(ponerEtiqueta(n, [1, 2], 'DISEÑO', false).actividades.map(a => a.etiquetas)).toEqual([[], [], ['Diseño']]);
    expect(ponerEtiqueta(d, [2], 'Nueva', true).actividades[1].etiquetas).toEqual(['Nueva']);
  });
  it('conSubtareas sin elementos quita el campo', () => {
    const a = parseMD('| ID | Actividad |\n|---|---|\n| 1 | a |').actividades[0];
    expect('subtareas' in conSubtareas({ ...a, subtareas: [{ t: 'x', ok: false }] }, [])).toBe(false);
  });
});
