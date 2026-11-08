import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  borrarEtiqueta, crearSprint, documentoNuevo, fechasSprintSugeridas, infoRenombrarNegocio, nombreSprintSugerido, parseMD, renombrarEtiqueta, renombrarNegocio, seleccionSprint, toMD,
} from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));

describe('renombrar negocio', () => {
  it('cambia el nombre en sus actividades; el resto no cambia', () => {
    const r = renombrarNegocio(doc, 'Calidad', 'Aseguramiento');
    expect([r.n, r.nombre]).toEqual([2, 'Aseguramiento']);
    expect(r.doc.actividades.filter(a => a.negocio === 'Aseguramiento').map(a => a.id)).toEqual([8, 9]);
    expect(r.doc.actividades.find(a => a.id === 1)!.negocio).toBe('Producto');
  });
  it('si ya existe otro igual (sin importar mayúsculas) se juntan con ese nombre', () => {
    expect(infoRenombrarNegocio(doc, 'Calidad', 'producto')).toEqual({ n: 2, existente: 'Producto', m: 3, mismo: false });
    const r = renombrarNegocio(doc, 'Calidad', 'producto');
    expect(r.nombre).toBe('Producto'); expect(r.doc.actividades.filter(a => a.negocio === 'Producto')).toHaveLength(5);
  });
  it('"sin negocio" se puede nombrar; el mismo nombre no hace nada; no deja "|"', () => {
    expect(renombrarNegocio(doc, '', 'General').n).toBe(0);                  // el ejemplo no tiene actividades sin negocio
    expect(renombrarNegocio(doc, 'Calidad', 'Calidad').doc).toBe(doc);
    expect(renombrarNegocio(doc, 'Calidad', 'A|B').nombre).toBe('A/B');
  });
});

describe('administrar etiquetas', () => {
  it('renombrar conserva el color y actualiza cada actividad', () => {
    const r = renombrarEtiqueta(doc, 'seguridad', 'seguridad-ti');
    expect(r.n).toBe(3); expect(r.doc.actividades.find(a => a.id === 5)!.etiquetas).toContain('seguridad-ti');
    expect(r.doc.coloresEtq['seguridad-ti']).toBe('rojo'); expect(r.doc.coloresEtq.seguridad).toBeUndefined();
    expect(parseMD(toMD(r.doc)).coloresEtq['seguridad-ti']).toBe('rojo');
  });
  it('si el nuevo nombre ya existe se juntan sin duplicar', () => {
    const r = renombrarEtiqueta(doc, 'calidad', 'SEGURIDAD');
    expect(r.existente).toBe('seguridad');
    expect(r.doc.actividades.find(a => a.id === 9)!.etiquetas.filter(t => t === 'seguridad')).toHaveLength(1);
    expect(r.doc.actividades.find(a => a.id === 8)!.etiquetas).toEqual(['seguridad']);
  });
  it('borrar la quita de todas y olvida su color', () => {
    const d = borrarEtiqueta(doc, 'seguridad');
    expect(d.actividades.some(a => a.etiquetas.includes('seguridad'))).toBe(false); expect(d.coloresEtq.seguridad).toBeUndefined();
  });
});

describe('nuevo sprint', () => {
  it('nombre y fechas sugeridas', () => {
    expect(nombreSprintSugerido('Mi Sprint 3 final', 'x.md')).toBe('Mi Sprint 4 final');
    expect(nombreSprintSugerido('Portal', 'x.md')).toBe('Portal · Sprint 2');
    expect(nombreSprintSugerido('', 'portal.md')).toBe('portal · Sprint 2');
    expect(fechasSprintSugeridas({ inicio: '2026-10-05', fin: '2026-12-18' }, '2026-11-06')).toEqual({ inicio: '2026-12-19', fin: '2027-03-03' });
    expect(fechasSprintSugeridas({ inicio: '', fin: '' }, '2026-11-06')).toEqual({ inicio: '2026-11-06', fin: '2026-11-19' });
  });
  const o = { nombre: 'Portal · Sprint 2', inicio: '2026-12-19', fin: '2027-01-15', estados: ['Backlog', 'Planeado', 'En progreso'], negocios: [...new Set(doc.actividades.map(a => a.negocio))], notas: true, quitarFechas: false, reiniciar: false };
  it('copia las actividades en esos estados con sus notas y subtareas, y no toca el original', () => {
    expect(seleccionSprint(doc, o)).toHaveLength(12);
    const n = crearSprint(doc, o, 'Ana', 'proyecto-demo.md', new Date('2026-11-06T12:00:00Z'));
    expect(n.actividades).toHaveLength(12); expect(n.actividades.some(a => a.estado === 'Terminado')).toBe(false);
    expect(n.meta).toMatchObject({ proyecto: 'Portal · Sprint 2', inicio: '2026-12-19', fin: '2027-01-15' });
    expect(n.notas.every(x => n.actividades.some(a => a.id === x.act))).toBe(true); expect(n.notas.length).toBe(3);
    expect(n.bitacora).toHaveLength(1); expect(n.bitacora[0]).toMatchObject({ accion: 'sprint', autor: 'Ana' }); expect(n.bitacora[0].detalle).toContain('12 actividades copiadas');
    expect(doc.actividades).toHaveLength(16);
    expect(parseMD(toMD(n)).actividades).toHaveLength(12);
  });
  it('opciones: sin notas, sin fechas, "En progreso" regresa a Planeado, sólo algunos negocios', () => {
    const n = crearSprint(doc, { ...o, notas: false, quitarFechas: true, reiniciar: true, negocios: ['Desarrollo'] }, 'Ana', 'p.md');
    expect(n.actividades.map(a => a.id)).toEqual([5, 6, 7, 16]); expect(n.notas).toEqual([]);
    expect(n.actividades.every(a => !a.inicio && !a.fin)).toBe(true); expect(n.actividades.find(a => a.id === 5)!.estado).toBe('Planeado');
  });
  it('documento nuevo vacío', () => {
    const d = documentoNuevo({ proyecto: 'P', inicio: '2026-11-01', fin: '2026-11-30' });
    expect(parseMD(toMD(d)).meta).toMatchObject({ proyecto: 'P', inicio: '2026-11-01', fin: '2026-11-30' });
  });
});
