import { describe, expect, it } from 'vitest';
import { datosCopia, loteDuplicar, nombreCopia, parseMD } from '../src';

const doc = () => parseMD(`# P

- Proyecto: P
- Versión de MDexa: 19 (v1.37.0)

| ID | Negocio | Actividad | Tamaño | Prioridad | Responsable | Inicio | Fin | Estado | Terminada | Etiquetas | Depende de | Repite | Hito |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Tienda | Base | M | Alta | Ana | 2026-10-01 | 2026-10-05 | Terminado | 2026-10-05 | obra | | Cada semana | H1 |
| 2 | Tienda | Sigue<br>detalle | S | | | 2026-10-06 | | En progreso | | | 1, 3 | | H1 |
| 3 | Bodega | Otra | | | | | | Planeado | | | | | H2 |

## Hitos

- H1 | 2026-12-01 | Apertura | Tienda; Norte
- H2 | 2026-10-01 | Cerrado | Bodega | 2026-10-01

## Subtareas

- #1 [x] Planos
- #1 [ ] Permisos

## Notas

- #1 | 2026-10-02T10:00:00.000Z | Ana | Una nota
`);

describe('duplicar', () => {
  it('copia los datos, empieza en Planeado, desmarca subtareas y no lleva notas', () => {
    const d = doc(), r = loteDuplicar(d, new Set([1]), { negocios: null, dias: 7, estado: 'Planeado' }), c = r.doc.actividades.at(-1)!;
    expect(r.nuevas).toEqual([4]);
    expect(c).toMatchObject({ id: 4, negocio: 'Tienda', actividad: 'Base (copia)', tamano: 'M', prioridad: 'Alta', responsable: 'Ana', inicio: '2026-10-08', fin: '2026-10-12', estado: 'Planeado', terminada: '', etiquetas: ['obra'], repite: 'semana', hito: 1 });
    expect(c.subtareas).toEqual([{ t: 'Planos', ok: false }, { t: 'Permisos', ok: false }]);
    expect(r.doc.notas).toEqual(d.notas);
    expect(d.actividades).toHaveLength(3);
  });
  it('varias a varios negocios: dependencias entre copias, sin repetición y hito sólo si es compatible', () => {
    const r = loteDuplicar(doc(), new Set([1, 2]), { negocios: ['Norte', 'Sur'], dias: 0, estado: 'Planeado' });
    expect(r.nuevas).toEqual([4, 5, 6, 7]);
    const c = r.doc.actividades.slice(3);
    expect(c.map(a => [a.negocio, a.actividad.split('\n')[0], a.depende, a.repite, a.hito])).toEqual([
      ['Norte', 'Base', [], '', 1], ['Norte', 'Sigue', [4, 3], '', 1], ['Sur', 'Base', [], '', undefined], ['Sur', 'Sigue', [6, 3], '', undefined]]);
  });
  it('un hito cumplido no se hereda y «(copia)» no se acumula', () => {
    const d = doc();
    expect(datosCopia(d, d.actividades[2]!).hito).toBeUndefined();
    expect(nombreCopia('Sigue\ndetalle')).toBe('Sigue (copia)\ndetalle');
    expect(nombreCopia('Base (copia)')).toBe('Base (copia)');
  });
});
