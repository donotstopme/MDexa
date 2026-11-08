import { describe, expect, it } from 'vitest';
import { agregarNota, calcularNovedades, claveNota, compararRespaldo, conEstado, foto, hashTxt, parseMD, restaurarRespaldo, sinCandado, toMD } from '../src';

const MD = '| ID | Actividad | Estado |\n|---|---|---|\n| 1 | Uno | Planeado |\n| 2 | Dos | Backlog |\n';
const t = (s: string) => new Date(s);

describe('novedades', () => {
  const base = parseMD(MD), visto = foto(base.actividades);
  it('sin base no hay novedades', () => expect(calcularNovedades(base, null, new Set(), 'Ana').total).toBe(0));
  it('detecta nuevas, cambios y borradas', () => {
    const d = { ...base, actividades: [conEstado(base.actividades[0], 'Terminado'), { ...base.actividades[1], id: 3 }] };
    const n = calcularNovedades(d, visto, new Set(), 'Ana');
    expect(n.nuevas.map(a => a.id)).toEqual([3]);
    expect(n.cambios.map(c => [c.a.id, c.campos[0].k])).toEqual([[1, 'estado']]);
    expect(n.borradas.map(b => b.id)).toEqual([2]);
    expect(n.porId[1].tipo).toBe('cambio');
  });
  it('notas de otras personas, y menciones; las tuyas y las vistas no cuentan', () => {
    let d = agregarNota(base, 1, 'Luis', 'hola @Ana', t('2026-11-02T10:00:00Z'));
    d = agregarNota(d, 1, 'Ana', 'mía', t('2026-11-02T11:00:00Z'));
    d = agregarNota(d, 2, 'Luis', 'otra', t('2026-11-02T12:00:00Z'));
    const n = calcularNovedades(d, visto, new Set([claveNota(d.notas[2])]), 'Ana');
    expect(n.notas.map(x => x.texto)).toEqual(['hola @Ana']);
    expect(n.menciones).toHaveLength(1);
    expect(n.total).toBe(1);
  });
});

describe('respaldos', () => {
  it('sinCandado y hash', () => {
    expect(sinCandado('a\n- En edición: Ana | x | y\nb')).toBe('a\nb');
    expect(hashTxt('abc')).toBe(hashTxt('abc'));
    expect(hashTxt('abc')).not.toBe(hashTxt('abd'));
  });
  it('compara y restaura conservando notas y anotando en la bitácora', () => {
    const viejo = parseMD(MD);
    let actual = { ...viejo, actividades: [conEstado(viejo.actividades[0], 'Terminado'), { ...viejo.actividades[1], id: 3 }] };
    actual = agregarNota(actual, 1, 'Ana', 'nota actual', t('2026-11-02T10:00:00Z'));
    const c = compararRespaldo(actual, viejo);
    expect(c.igual).toBe(false);
    expect(c.recupera.map(a => a.id)).toEqual([2]);
    expect(c.pierde.map(a => a.id)).toEqual([3]);
    expect(c.cambian[0].campos[0]).toMatchObject({ k: 'estado', ahora: 'Terminado', antes: 'Planeado' });
    const r = restaurarRespaldo(actual, { fecha: '', motivo: 'Al abrir', texto: MD, hash: '', usuario: '', n: 2 }, viejo, 'Ana', '2 nov', t('2026-11-03T10:00:00Z'));
    expect(r.actividades.map(a => a.id)).toEqual([1, 2]);
    expect(r.notas).toHaveLength(1);
    expect(r.bitacora.at(-1)).toMatchObject({ accion: 'restauró', act: null });
    expect(parseMD(toMD(r)).bitacora.at(-1)?.accion).toBe('restauró');
    expect(compararRespaldo(r, viejo).igual).toBe(true);
  });
});

import { autoresDesde } from '../src';
describe('autoresDesde', () => {
  it('lista a quienes cambiaron algo después de la fecha, sin contarte', () => {
    const d = parseMD('| ID | Actividad |\n|---|---|\n| 1 | x |\n\n## Bitácora\n\n- 2026-11-01T10:00:00.000Z | Luis | #1 | creó | N · x\n- 2026-11-03T10:00:00.000Z | Ana | #1 | cambió | Estado: Backlog → Planeado\n- 2026-11-04T10:00:00.000Z | Pedro | #1 | cambió | Fin: — → 2026-11-10\n');
    expect(autoresDesde(d, 1, '2026-11-02T00:00:00.000Z', 'Ana')).toEqual({ quienes: ['Pedro'], ultima: '2026-11-04T10:00:00.000Z' });
    expect(autoresDesde(d, 1, '2026-11-02T00:00:00.000Z', 'Luis')?.quienes).toEqual(['Ana', 'Pedro']);
    expect(autoresDesde(d, 1, '2026-12-01T00:00:00.000Z', 'Luis')).toBeNull();
  });
});

import { bitacoraCsv, filtrarBitacora, nombreActBit } from '../src';
describe('consultas de la bitácora', () => {
  const d = parseMD('| ID | Negocio | Actividad |\n|---|---|---|\n| 1 | Ventas | Uno |\n\n## Bitácora\n\n- 2026-11-01T10:00:00.000Z | Luis | #2 | creó | Legal · Contrato\n- 2026-11-02T10:00:00.000Z | Ana | #1 | cambió | Estado: Backlog → Planeado\n- 2026-11-05T10:00:00.000Z | Ana | #- | meta | Meta fin: 2026-12-01 → 2026-12-15\n');
  const ahora = new Date('2026-11-06T12:00:00');
  it('nombre aunque la actividad ya no exista', () => {
    expect(nombreActBit(d, 1)).toEqual({ nombre: 'Uno', negocio: 'Ventas', existe: true });
    expect(nombreActBit(d, 2)).toEqual({ nombre: 'Contrato', negocio: 'Legal', existe: false });
    expect(nombreActBit(d, 9).nombre).toBe('Actividad #9');
  });
  it('filtra por texto, autor, periodo y actividad; lo más nuevo primero', () => {
    const f = (p: Partial<Parameters<typeof filtrarBitacora>[1]>) => filtrarBitacora(d, { texto: '', autor: '', periodo: 0, act: null, ...p }, ahora).map(e => e.fecha.slice(8, 10));
    expect(f({})).toEqual(['05', '02', '01']);
    expect(f({ autor: 'Ana' })).toEqual(['05', '02']);
    expect(f({ texto: 'contrato' })).toEqual(['01']);
    expect(f({ texto: 'planeado' })).toEqual(['02']);
    expect(f({ periodo: 7 })).toEqual(['05', '02', '01']);
    expect(f({ periodo: 3 })).toEqual(['05']);
    expect(f({ periodo: 1 })).toEqual([]);
    expect(f({ act: 1 })).toEqual(['02']);
  });
  it('CSV con encabezado, comillas y flechas ASCII', () => {
    const csv = bitacoraCsv(d, filtrarBitacora(d, { texto: '', autor: 'Ana', periodo: 0, act: null }, ahora));
    expect(csv.startsWith('﻿"Fecha","Autor"')).toBe(true);
    expect(csv).toContain('"Estado: Backlog -> Planeado"'); expect(csv).toContain('"(meta del proyecto)"');
  });
});
