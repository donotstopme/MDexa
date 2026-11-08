import { describe, expect, it } from 'vitest';
import { MAX_IMG, agregarImagenes, carpetaImagenes, filtrarImagenes, imagenesDe, nombreVisible, parseMD, quitarImagen, rutaImagen, toMD } from '../src';

const doc = parseMD('# P\n\n| ID | Negocio | Actividad |\n|---|---|---|\n| 1 | Ventas | Uno |\n| 2 | Ventas | Dos |\n');

describe('imágenes', () => {
  it('carpeta junto al archivo y ruta única por imagen', () => {
    expect(carpetaImagenes('Mi Proyecto Ñandú.md')).toBe('mi-proyecto-nandu-imagenes'); expect(carpetaImagenes('.md')).toBe('actividades-imagenes');
    expect(rutaImagen('c-imagenes', 3, 'image/png', 'x.png', new Date('2026-10-29T19:15:30Z'), 'ab12')).toBe('c-imagenes/3-20261029-191530-ab12.png');
    expect(rutaImagen('c', 3, 'application/x', 'foto.HEIC', new Date('2026-10-29T19:15:30Z'), 'zz')).toMatch(/\.heic$/);
  });
  it('nombre visible: el del archivo o "Captura …"; sin caracteres que rompen el .md', () => {
    expect(nombreVisible('plano.png', 'x')).toBe('plano.png'); expect(nombreVisible('image.png', '06 nov, 10:00')).toBe('Captura 06 nov, 10:00');
    expect(nombreVisible('a|b[c]\nd.png', '')).toBe('a b c  d.png'); expect(nombreVisible('x'.repeat(200), '')).toHaveLength(80);
  });
  it('sólo imágenes, y se separan las que pesan más de 15 MB', () => {
    const f = [{ type: 'image/png', size: 10 }, { type: 'text/plain', size: 1 }, { type: 'image/jpeg', size: MAX_IMG + 1 }];
    expect(filtrarImagenes(f)).toEqual({ validas: [f[0]], grandes: [f[2]] });
  });
  const img = (archivo: string, fecha = '2026-11-01T10:00:00.000Z') => ({ act: 1, fecha, autor: 'Ana', nombre: 'plano.png', archivo });
  it('agregar anota en la bitácora y sobrevive al .md', () => {
    const d = agregarImagenes(doc, 1, [img('c/1-a.png')], 'Ana', new Date('2026-11-01T10:00:00Z'));
    expect(imagenesDe(d, 1)).toHaveLength(1); expect(d.bitacora[0]).toMatchObject({ accion: 'imagen', act: 1, autor: 'Ana' }); expect(d.bitacora[0].detalle).toBe('Agregó plano.png · Ventas · Uno');
    const r = parseMD(toMD(d));
    expect(r.imagenes).toEqual([img('c/1-a.png')]); expect(r.bitacora[0].accion).toBe('imagen');
    expect(agregarImagenes(d, 1, [img('c/1-b.png'), img('c/1-c.png')], 'Ana').bitacora.at(-1)!.detalle).toContain('2 imágenes');
    expect(agregarImagenes(doc, 1, [], 'Ana')).toBe(doc);
  });
  it('quitar la saca de la lista y anota; imágenes de actividades borradas no se guardan', () => {
    const d = agregarImagenes(doc, 1, [img('c/1-a.png'), img('c/1-b.png', '2026-11-02T10:00:00.000Z')], 'Ana');
    const q = quitarImagen(d, 'c/1-a.png', 'Luis');
    expect(imagenesDe(q, 1).map(x => x.archivo)).toEqual(['c/1-b.png']); expect(q.bitacora.at(-1)).toMatchObject({ autor: 'Luis' }); expect(q.bitacora.at(-1)!.detalle).toContain('Quitó plano.png');
    expect(quitarImagen(d, 'no-existe', 'Ana')).toBe(d);
    expect(parseMD(toMD({ ...d, actividades: d.actividades.filter(a => a.id !== 1) })).imagenes).toEqual([]);
  });
});
