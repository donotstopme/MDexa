import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseMD, toMD } from '../src';

const fixture = readFileSync(new URL('./fixtures/proyecto.md', import.meta.url), 'utf8');

describe('parseMD', () => {
  const d = parseMD(fixture);

  it('lee la meta, versión y candado', () => {
    expect(d.meta).toMatchObject({ proyecto: 'Proyecto Demo', inicio: '2026-10-01', fin: '2026-12-15', version: 18, versionTxt: '1.34.1' });
    expect(d.candado).toEqual({ usuario: 'Ana', desde: '2026-11-03T10:00:00.000Z', latido: '2026-11-03T10:04:00.000Z' });
  });

  it('lee las actividades con sus campos', () => {
    expect(d.actividades.map(a => a.id)).toEqual([1, 2, 3, 4, 5]);
    const a2 = d.actividades[1];
    expect(a2.actividad).toBe('Diseñar pantalla\ncon dos líneas');
    expect(a2).toMatchObject({ tamano: 'L', prioridad: 'Media', estado: 'En progreso', depende: [1], etiquetas: ['diseño'] });
    expect(d.actividades[2]).toMatchObject({ depende: [2, 1], repite: 'mes' });
    expect(d.actividades[3]).toMatchObject({ estado: 'Backlog', tamano: '', prioridad: '' });
    expect(d.actividades[0].terminada).toBe('2026-10-04');
  });

  it('lee notas, subtareas, imágenes, etiquetas y bitácora', () => {
    expect(d.notas).toHaveLength(2);
    expect(d.notas[0].texto).toBe('Hablé con @Luis\nquedó pendiente');
    expect(d.actividades[1].subtareas).toEqual([{ t: 'Wireframe', ok: true }, { t: 'Revisión con cliente', ok: false }]);
    expect(d.imagenes[0].archivo).toBe('imagenes/boceto final.png');
    expect(d.coloresEtq).toEqual({ analisis: 'morado', diseno: 'rosa' });
    expect(d.bitacora).toHaveLength(3);
    expect(d.bitacora[1].campos).toEqual([
      { k: 'estado', etq: 'Estado', antes: 'En progreso', despues: 'Terminado' },
      { k: 'fin', etq: 'Fin', antes: '', despues: '2026-10-05' },
    ]);
    expect(d.bitacora[2]).toMatchObject({ act: null, accion: 'meta' });
  });

  it('conserva las secciones desconocidas', () => {
    expect(d.extra).toEqual(['## Sección manual', '', 'Texto que el gestor no conoce', 'y debe conservar.']);
  });

  it('acepta alias de estado y encabezados incompletos', () => {
    const x = parseMD('| Actividad | Estado | ID |\n|---|---|---|\n| Algo | completada | 7 |\n| Otra | en proceso | |');
    expect(x.actividades.map(a => [a.id, a.estado])).toEqual([[7, 'Terminado'], [8, 'En progreso']]);
  });
});

describe('toMD', () => {
  it('es estable: parse → toMD → parse da lo mismo', () => {
    const d = parseMD(fixture);
    const d2 = parseMD(toMD(d));
    expect(d2).toEqual(d);
  });

  it('reproduce el archivo de ejemplo salvo normalizaciones conocidas', () => {
    const salida = toMD(parseMD(fixture));
    expect(salida).toContain('| 3 | Finanzas | Cierre mensual | S | Baja | Ana | 2026-11-01 | 2026-11-05 | Planeado |  |  | #2, #1 | Cada mes |');
    expect(salida).toContain('- #2 [x] Wireframe');
    expect(salida).toContain('![boceto](imagenes/boceto%20final.png)');
    expect(salida).toContain('## Sección manual');
    expect(salida).toMatch(/- Versión del gestor: 18 \(v1\.34\.1\)/);
  });

  it('no escribe colores de etiquetas que ya no se usan', () => {
    const d = parseMD(fixture);
    d.coloresEtq['fantasma'] = 'rojo';
    expect(toMD(d)).not.toContain('fantasma');
  });

  it('descarta notas de actividades que ya no existen', () => {
    const d = parseMD(fixture);
    d.actividades = d.actividades.filter(a => a.id !== 1);
    expect(toMD(d)).not.toContain('Hablé con');
  });

  it('escapa | y saltos de línea en las celdas', () => {
    const d = parseMD(fixture);
    d.actividades[0].actividad = 'a | b\nc';
    expect(parseMD(toMD(d)).actividades[0].actividad).toBe('a / b\nc');
  });
});
