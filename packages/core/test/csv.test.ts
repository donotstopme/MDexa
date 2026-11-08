import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLANTILLA_CSV, aplicarImportacion, exportarCsv, filasImportar, leerFechaCSV, mapaInicial, parseCSV, parseMD, toMD } from '../src';

const doc = parseMD(readFileSync(new URL('./fixtures/demo.md', import.meta.url), 'utf8'));

describe('parseCSV', () => {
  it('detecta separador, comillas, saltos de línea dentro de comillas y BOM', () => {
    expect(parseCSV('﻿a;b;c\n1;"x;y";3\r\n')).toEqual([['a', 'b', 'c'], ['1', 'x;y', '3']]);
    expect(parseCSV('a\tb\n"uno\ndos"\t"co""mo"')).toEqual([['a', 'b'], ['uno\ndos', 'co"mo']]);
    expect(parseCSV('a,b\n\n,\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
  });
});
describe('leerFechaCSV', () => {
  it.each([['2026-11-05', '2026-11-05'], ['05/11/2026', '2026-11-05'], ['5-11-26', '2026-11-05'], ['5 nov 2026', '2026-11-05'], ['29 de octubre de 2026', '2026-10-29'], ['46331', '2026-11-05'], ['', '']])('%s', (v, f) => expect(leerFechaCSV(v).f).toBe(f));
  it('fechas inválidas', () => { expect(leerFechaCSV('31/02/2026').error).toContain('inválida'); expect(leerFechaCSV('mañana').error).toContain('no reconocida'); });
});

describe('importar', () => {
  const csv = parseCSV(PLANTILLA_CSV);
  it('la plantilla se mapea sola por los encabezados', () => {
    const { mapa, conEncabezado } = mapaInicial(csv);
    expect(conEncabezado).toBe(true); expect(mapa).toMatchObject({ negocio: 0, actividad: 1, tamano: 2, prioridad: 3, responsable: 4, inicio: 5, fin: 6, estado: 7, etiquetas: 8 });
    const f = filasImportar(doc, csv, mapa, { encabezado: true, modo: 'agregar', negocioDefecto: '' });
    expect(f).toHaveLength(2); expect(f.every(x => x.accion === 'agregar')).toBe(true);
    expect(f[1].a).toMatchObject({ actividad: 'Comprar mobiliario, sillas y mesas', inicio: '2026-11-05', fin: '2026-11-07', tamano: 'L', prioridad: 'Media', estado: 'Backlog' });
  });
  it('sin encabezados propone columnas por posición', () => {
    const { mapa, conEncabezado } = mapaInicial([['Ventas', 'Llamar', 'Ana']]);
    expect(conEncabezado).toBe(false); expect(mapa).toMatchObject({ negocio: 0, actividad: 1, responsable: 2 });
  });
  it('errores y avisos por fila; negocio por defecto', () => {
    const filas = parseCSV('Negocio,Actividad,Tamaño,Estado,Fin\n,Sin negocio,XXL,hecho,\nLegal,,S,,\n,Con defecto,S,rarísimo,mañana');
    const { mapa } = mapaInicial(filas), f = filasImportar(doc, filas, mapa, { encabezado: true, modo: 'agregar', negocioDefecto: 'General' });
    expect(f.map(x => x.accion)).toEqual(['agregar', 'omitir', 'agregar']);
    expect(f[0].a).toMatchObject({ negocio: 'General', estado: 'Terminado', tamano: '' }); expect(f[0].avisos[0]).toContain('tamaño "XXL"');
    expect(f[1].errores).toEqual(['falta la actividad']);
    expect(f[2].avisos.join()).toContain('estado "rarísimo"'); expect(f[2].avisos.join()).toContain('fecha no reconocida');
  });
  it('agrega y actualiza por ID, y reasigna dependencias a los IDs nuevos', () => {
    const filas = parseCSV('ID,Negocio,Actividad,Estado,Depende\n8,Calidad,Plan de pruebas (ajustado),Terminado,\n100,Nuevo,Alfa,Planeado,\n101,Nuevo,Beta,Planeado,100\n102,Nuevo,Gamma,Planeado,8');
    const { mapa } = mapaInicial(filas), f = filasImportar(doc, filas, mapa, { encabezado: true, modo: 'actualizar', negocioDefecto: '' });
    expect(f.map(x => x.accion)).toEqual(['actualizar', 'agregar', 'agregar', 'agregar']);
    const r = aplicarImportacion(doc, f, mapa, new Date('2026-11-06T12:00:00'));
    expect([r.nuevas, r.actualizadas]).toEqual([3, 1]);
    const a8 = r.doc.actividades.find(a => a.id === 8)!;
    expect(a8).toMatchObject({ actividad: 'Plan de pruebas (ajustado)', estado: 'Terminado', terminada: '2026-11-06' });
    const nuevas = r.doc.actividades.filter(a => a.id > 16);
    expect(nuevas.map(a => a.id)).toEqual([17, 18, 19]);
    expect(nuevas[1].depende).toEqual([17]);          // 101 dependía de 100 → ahora #17
    expect(nuevas[2].depende).toEqual([8]);           // 8 ya existía
    expect(parseMD(toMD(r.doc)).actividades).toHaveLength(19);
  });
  it('en modo "agregar" no toca las existentes aunque traiga el mismo ID', () => {
    const filas = parseCSV('ID,Negocio,Actividad\n8,Calidad,Copia');
    const { mapa } = mapaInicial(filas), r = aplicarImportacion(doc, filasImportar(doc, filas, mapa, { encabezado: true, modo: 'agregar', negocioDefecto: '' }), mapa);
    expect(r.nuevas).toBe(1); expect(r.doc.actividades.find(a => a.id === 8)!.actividad).toContain('Plan de pruebas');
  });
});

describe('exportar', () => {
  it('encabezado, BOM, CRLF y una fila por actividad ordenadas por negocio', () => {
    const csv = exportarCsv(doc, doc.actividades, false, '2026-11-06');
    expect(csv.startsWith('﻿ID,Negocio,Actividad')).toBe(true); expect(csv).toContain('\r\n');
    const f = parseCSV(csv);
    expect(f).toHaveLength(17); expect(f[1][1]).toBe('Calidad'); expect(f.find(x => x[0] === '5')![14]).toBe('Sí');   // vencida
    expect(f.find(x => x[0] === '5')![15]).toBe('2');                                                      // notas
  });
  it('con notas agrega la columna de texto; sólo las filtradas', () => {
    const csv = exportarCsv(doc, doc.actividades.filter(a => a.id === 5), true, '2026-11-06');
    expect(parseCSV(csv)).toHaveLength(2); expect(csv).toContain('Texto de las notas'); expect(csv).toContain('Pedro: Revisado');
  });
  it('lo exportado se puede volver a importar tal cual', () => {
    const csv = parseCSV(exportarCsv(doc, doc.actividades, false, '2026-11-06')), { mapa } = mapaInicial(csv);
    const f = filasImportar(doc, csv, mapa, { encabezado: true, modo: 'actualizar', negocioDefecto: '' });
    expect(f.every(x => x.accion === 'actualizar')).toBe(true);
    const r = aplicarImportacion(doc, f, mapa, new Date('2026-11-06T12:00:00'));
    expect(r.doc.actividades.map(a => [a.id, a.actividad, a.estado, a.fin, a.depende])).toEqual(doc.actividades.map(a => [a.id, a.actividad, a.estado, a.fin, a.depende]));
  });
});
