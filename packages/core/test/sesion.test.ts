import { describe, expect, it } from 'vitest';
import {
  absorberPropios, actividadNueva, candadoNuevo, conEstado, decidirEscritura, decidirToma, deshacer, foto, historialVacio,
  parseMD, puedeSoltar, rehacer, registrarDeshacer, toMD, VERSION_GESTOR,
} from '../src';
import type { Documento } from '../src';

const base = (extra = '') => parseMD(`# P\n\n- Proyecto: P\n- Versión del gestor: ${VERSION_GESTOR} (v1.0.0)\n${extra}\n| ID | Actividad | Estado | Repite |\n|---|---|---|---|\n| 1 | Uno | Planeado | Cada semana |\n| 2 | Dos | Backlog | |\n`);
const t0 = Date.parse('2026-11-05T10:00:00Z');

describe('candado', () => {
  it('libre o propio → ok', () => {
    expect(decidirToma(base(), 'Ana', t0)).toEqual({ tipo: 'ok' });
    expect(decidirToma(base('- En edición: Ana | 2026-11-05T09:00:00Z | 2026-11-05T09:59:00Z\n'), 'Ana', t0)).toEqual({ tipo: 'ok' });
  });
  it('de otra persona con latido reciente → ocupado', () => {
    const d = base('- En edición: Luis | 2026-11-05T09:00:00Z | 2026-11-05T09:58:00Z\n');
    expect(decidirToma(d, 'Ana', t0)).toMatchObject({ tipo: 'ocupado', por: 'Luis' });
  });
  it('de otra persona sin latido hace más de 5 min → abandonado', () => {
    const d = base('- En edición: Luis | 2026-11-05T09:00:00Z | 2026-11-05T09:50:00Z\n');
    expect(decidirToma(d, 'Ana', t0)).toMatchObject({ tipo: 'abandonado', por: 'Luis' });
  });
  it('archivo de versión más nueva → masNuevo, y no se escribe ni se suelta', () => {
    const d = parseMD(`- Versión del gestor: ${VERSION_GESTOR + 1} (v9.9.9)\n| Actividad |\n|---|\n| x |`);
    expect(decidirToma(d, 'Ana', t0)).toEqual({ tipo: 'masNuevo' });
    expect(decidirEscritura(d, 'Ana', t0)).toBe('masNuevo');
    expect(puedeSoltar(d, 'Ana')).toBe(false);
  });
  it('escritura: si otra persona tomó el archivo → perdido', () => {
    const d = base('- En edición: Luis | 2026-11-05T09:59:00Z | 2026-11-05T09:59:30Z\n');
    expect(decidirEscritura(d, 'Ana', t0)).toBe('perdido');
    expect(decidirEscritura(base(), 'Ana', t0)).toBe('ok');
    expect(puedeSoltar(d, 'Ana')).toBe(false);
  });
  it('candadoNuevo conserva "desde" sólo si ya era tuyo', () => {
    const ya = { usuario: 'Ana', desde: 'A', latido: 'B' };
    expect(candadoNuevo(ya, 'Ana', new Date(t0)).desde).toBe('A');
    expect(candadoNuevo(ya, 'Luis', new Date(t0)).desde).toBe(new Date(t0).toISOString());
  });
  it('el candado viaja en el .md', () => {
    const d: Documento = { ...base(), candado: candadoNuevo(null, 'Ana', new Date(t0)) };
    expect(parseMD(toMD(d)).candado?.usuario).toBe('Ana');
  });
});

describe('cambios propios', () => {
  it('anota creó / cambió / eliminó en la bitácora', () => {
    const d = base(), previo = foto(d.actividades);
    const nueva = actividadNueva(d, { actividad: 'Tres' });
    const d2 = { ...d, actividades: [d.actividades[0], conEstado(d.actividades[1], 'En progreso'), nueva] };
    const r = absorberPropios(d2, previo, 'Ana', { ahora: new Date(t0) });
    expect(r.doc.bitacora.map(e => [e.act, e.accion])).toEqual([[2, 'cambió'], [3, 'creó']]);
    const r2 = absorberPropios({ ...r.doc, actividades: [] }, r.previo, 'Ana', { ahora: new Date(t0 + 1e6) });
    expect(r2.doc.bitacora.filter(e => e.accion === 'eliminó').map(e => e.act)).toEqual([1, 2, 3]);
  });
  it('terminar una recurrente crea la siguiente', () => {
    const d = base(), previo = foto(d.actividades);
    const d2 = { ...d, actividades: [conEstado({ ...d.actividades[0], fin: '2026-11-06' }, 'Terminado', undefined, new Date(t0)), d.actividades[1]] };
    const r = absorberPropios(d2, previo, 'Ana', { ahora: new Date(t0) });
    expect(r.creadas).toHaveLength(1);
    expect(r.doc.actividades.find(a => a.id === 1)!.repite).toBe('');
    expect(r.creadas[0]).toMatchObject({ estado: 'Planeado', repite: 'semana', fin: '2026-11-13' });
  });
  it('al restaurar no se crean recurrentes y se anota "recuperó"', () => {
    const d = base(), previo = foto(d.actividades);
    const r = absorberPropios({ ...d, actividades: [d.actividades[0], d.actividades[1], actividadNueva(d, { actividad: 'X' })] }, previo, 'Ana', { restaurando: true });
    expect(r.doc.bitacora[0].accion).toBe('recuperó');
  });
  it('no muta el documento recibido', () => {
    const d = base(), previo = foto(d.actividades), n = d.bitacora.length;
    absorberPropios({ ...d, actividades: [conEstado(d.actividades[1], 'Terminado')] }, previo, 'Ana');
    expect(d.bitacora.length).toBe(n);
  });
});

describe('deshacer / rehacer', () => {
  it('ciclo completo', () => {
    let d = base(), h = registrarDeshacer(historialVacio(), d);
    d = { ...d, actividades: [conEstado(d.actividades[0], 'En progreso'), d.actividades[1]] };
    h = registrarDeshacer(h, d);
    expect(h.pasadas).toHaveLength(1);
    const u = deshacer(h, d)!;
    expect(u.doc.actividades[0].estado).toBe('Planeado');
    expect(u.d).toContain('Uno');
    const r = rehacer(u.h, u.doc)!;
    expect(r.doc.actividades[0].estado).toBe('En progreso');
    expect(rehacer(r.h, r.doc)).toBeNull();
  });
  it('un cambio nuevo borra lo rehacible; sin cambios no apila', () => {
    let d = base(), h = registrarDeshacer(historialVacio(), d);
    h = registrarDeshacer(h, d);
    expect(h.pasadas).toHaveLength(0);
    d = { ...d, actividades: [conEstado(d.actividades[0], 'En progreso'), d.actividades[1]] };
    h = registrarDeshacer(h, d);
    const u = deshacer(h, d)!;
    const d3 = { ...u.doc, actividades: [conEstado(u.doc.actividades[1], 'Planeado'), u.doc.actividades[0]] };
    expect(registrarDeshacer(u.h, d3).futuras).toHaveLength(0);
  });
});

import { conMeta } from '../src';
describe('conMeta', () => {
  it('cambia la meta y anota en la bitácora sólo lo que cambió', () => {
    const d = parseMD('- Proyecto: P\n- Meta inicio: 2026-10-01\n- Meta fin: 2026-12-01\n| ID | Actividad |\n|---|---|\n| 1 | x |');
    const n = conMeta(d, { proyecto: 'P', inicio: '2026-10-01', fin: '2026-12-15' }, 'Ana', new Date('2026-11-01T10:00:00Z'));
    expect(n.meta.fin).toBe('2026-12-15');
    expect(n.bitacora).toHaveLength(1);
    expect(n.bitacora[0]).toMatchObject({ accion: 'meta', autor: 'Ana', act: null });
    expect(n.bitacora[0].campos).toEqual([{ k: 'metaFin', etq: 'Meta fin', antes: '2026-12-01', despues: '2026-12-15' }]);
    expect(parseMD(toMD(n)).bitacora[0].campos[0].k).toBe('metaFin');
    expect(conMeta(d, { proyecto: 'P', inicio: '2026-10-01', fin: '2026-12-01' }, 'Ana')).toBe(d);
  });
});
