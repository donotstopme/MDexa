import { afterEach, describe, expect, it, vi } from 'vitest';
import { actividadNueva, conEstado, parseMD, VERSION_GESTOR } from '@gestor/core';
import type { Almacenamiento } from '../src/almacenamiento/tipos';
import { Sesion } from '../src/estado/sesion';

/** "Disco" compartido: dos sesiones (dos personas) leen y escriben el mismo archivo */
const disco = (texto: string) => {
  const d = { texto, escrituras: 0, acceso: false, permitirCarpeta: true, imgs: new Map<string, Blob>() };
  const almacen = (): Almacenamiento => ({
    abrir: async () => ({ nombre: 'p.md', texto: d.texto }),
    releer: async () => ({ nombre: 'p.md', texto: d.texto }),
    puedeEscribir: () => true,
    permisoEscritura: async () => true,
    escribir: async t => { d.texto = t; d.escrituras++; },
    crear: async (_n, t) => { d.texto = t; d.escrituras++; return 'nuevo.md'; },
    imagenesDisponibles: () => true,
    imagenesAcceso: async () => d.acceso,
    pedirCarpeta: async () => { d.acceso = d.permitirCarpeta; return d.permitirCarpeta ? { ok: true } : { ok: false, aviso: 'Elige la carpeta donde está "p.md"' }; },
    guardarImagen: async (r, blob) => { d.imgs.set(r, blob); },
    urlImagen: async r => (d.imgs.has(r) ? `blob:${r}` : null),
    borrarImagen: async r => { d.imgs.delete(r); },
    liberarImagenes: () => {},
  });
  return { d, almacen };
};
const MD = `# P\n\n- Proyecto: P\n- Meta inicio: 2026-10-01\n- Meta fin: 2026-12-01\n- Versión del gestor: ${VERSION_GESTOR} (v1.34.1)\n\n| ID | Actividad | Estado | Repite |\n|---|---|---|---|\n| 1 | Uno | Planeado | |\n| 2 | Dos | Backlog | |\n`;

const persona = (almacen: Almacenamiento, usuario: string, confirmar = true) => {
  const avisos: string[] = [];
  const s = new Sesion({ almacen, usuario, latidoMs: 60e3, ui: { confirmar: async () => confirmar, avisar: m => avisos.push(m), pedirUsuario: async () => usuario } });
  return { s, avisos };
};

afterEach(() => vi.useRealTimers());

describe('Sesion', () => {
  it('abrir → tomar escribe el candado; editar guarda; soltar lo quita', async () => {
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    expect(s.getSnapshot().modo).toBe('edicion');
    expect(parseMD(d.texto).candado?.usuario).toBe('Ana');

    s.editar(x => ({ ...x, actividades: x.actividades.map(a => (a.id === 1 ? conEstado(a, 'En progreso') : a)) }));
    await s.esperar();
    expect(parseMD(d.texto).actividades[0].estado).toBe('En progreso');
    expect(parseMD(d.texto).bitacora[0]).toMatchObject({ autor: 'Ana', act: 1, accion: 'cambió' });

    await s.soltar();
    expect(parseMD(d.texto).candado).toBeNull();
    expect(s.getSnapshot().modo).toBe('lectura');
    s.destruir();
  });

  it('una segunda persona no puede tomar el archivo mientras está tomado', async () => {
    const { d, almacen } = disco(MD);
    const ana = persona(almacen(), 'Ana'), luis = persona(almacen(), 'Luis');
    await ana.s.abrir(); await ana.s.tomar();
    await luis.s.abrir(); await luis.s.tomar();
    expect(luis.s.getSnapshot().modo).toBe('lectura');
    expect(luis.avisos.join()).toContain('Ana está editando');
    expect(parseMD(d.texto).candado?.usuario).toBe('Ana');
    ana.s.destruir();
  });

  it('un candado abandonado se puede tomar sólo si se confirma', async () => {
    const viejo = new Date(Date.now() - 20 * 60e3).toISOString();
    const md = MD.replace('\n| ID', `- En edición: Ana | ${viejo} | ${viejo}\n\n| ID`);
    const no = persona(disco(md).almacen(), 'Luis', false);
    await no.s.abrir(); await no.s.tomar();
    expect(no.s.getSnapshot().modo).toBe('lectura');

    const { d, almacen } = disco(md);
    const si = persona(almacen(), 'Luis', true);
    await si.s.abrir(); await si.s.tomar();
    expect(si.s.getSnapshot().modo).toBe('edicion');
    expect(parseMD(d.texto).candado?.usuario).toBe('Luis');
    si.s.destruir();
  });

  it('si otra persona toma el archivo mientras editas, se pasa a lectura y no se pisa', async () => {
    const { d, almacen } = disco(MD);
    const ana = persona(almacen(), 'Ana');
    await ana.s.abrir(); await ana.s.tomar();
    const ahora = new Date().toISOString();
    d.texto = d.texto.replace(/- En edición: .*/, `- En edición: Luis | ${ahora} | ${ahora}`);
    const antes = d.texto, n = d.escrituras;
    ana.s.editar(x => ({ ...x, actividades: x.actividades.map(a => (a.id === 1 ? conEstado(a, 'Terminado') : a)) }));
    await ana.s.esperar();
    expect(ana.s.getSnapshot().modo).toBe('lectura');
    expect(d.texto).toBe(antes);
    expect(d.escrituras).toBe(n);
    expect(ana.avisos.join()).toContain('Luis tomó el archivo');
  });

  it('no deja tomar un archivo de una versión más nueva', async () => {
    const md = MD.replace(`${VERSION_GESTOR} (v1.34.1)`, `${VERSION_GESTOR + 1} (v9.0.0)`);
    const { d, almacen } = disco(md);
    const { s, avisos } = persona(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    expect(s.getSnapshot().modo).toBe('lectura');
    expect(s.getSnapshot().masNuevo).toBe(true);
    expect(d.escrituras).toBe(0);
    expect(avisos.join()).toContain('versión más nueva');
  });

  it('deshacer y rehacer vuelven a escribir el archivo', async () => {
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    s.editar(x => ({ ...x, actividades: [...x.actividades, actividadNueva(x, { actividad: 'Tres' })] }));
    await s.esperar();
    expect(parseMD(d.texto).actividades).toHaveLength(3);
    s.deshacer(); await s.esperar();
    expect(parseMD(d.texto).actividades).toHaveLength(2);
    s.rehacer(); await s.esperar();
    expect(parseMD(d.texto).actividades).toHaveLength(3);
    s.destruir();
  });

  it('el latido renueva el candado mientras editas', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    const l0 = parseMD(d.texto).candado!.latido;
    await vi.advanceTimersByTimeAsync(61e3);
    await s.esperar();
    expect(parseMD(d.texto).candado!.latido > l0).toBe(true);
    s.destruir();
  });

  it('en lectura, refrescar trae los cambios de otra persona', async () => {
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir();
    d.texto = d.texto.replace('| 2 | Dos | Backlog |', '| 2 | Dos | Terminado |');
    await s.refrescar({ silencioso: true });
    expect(s.getSnapshot().doc!.actividades[1].estado).toBe('Terminado');
  });
});

import { agregarNota, agregarSubtarea } from '@gestor/core';
describe('Sesion: notas sin tomar el archivo', () => {
  it('escribe la nota directo, sin dejar candado', async () => {
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir();
    expect(await s.editarSinTomar(x => agregarNota(x, 1, 'Ana', 'hola'))).toBe(true);
    const doc = parseMD(d.texto);
    expect(doc.notas).toHaveLength(1);
    expect(doc.candado).toBeNull();
    expect(s.getSnapshot().modo).toBe('lectura');
  });
  it('no escribe si otra persona tiene el archivo tomado', async () => {
    const { d, almacen } = disco(MD);
    const ana = persona(almacen(), 'Ana'), luis = persona(almacen(), 'Luis');
    await ana.s.abrir(); await ana.s.tomar();
    await luis.s.abrir();
    const antes = d.texto;
    expect(await luis.s.editarSinTomar(x => agregarNota(x, 1, 'Luis', 'hola'))).toBe(false);
    expect(d.texto).toBe(antes);
    expect(luis.avisos.join()).toContain('Ana');
    ana.s.destruir();
  });
  it('con el archivo tomado, notas y subtareas usan el flujo normal y quedan en la bitácora', async () => {
    const { d, almacen } = disco(MD);
    const { s } = persona(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    s.editar(x => ({ ...x, actividades: x.actividades.map(a => (a.id === 1 ? agregarSubtarea(a, 'Revisar') : a)) }));
    await s.editarSinTomar(x => agregarNota(x, 1, 'Ana', 'nota'));
    await s.esperar();
    const doc = parseMD(d.texto);
    expect(doc.actividades[0].subtareas).toEqual([{ t: 'Revisar', ok: false }]);
    expect(doc.notas).toHaveLength(1);
    expect(doc.bitacora.some(e => e.campos.some(c => c.k === 'subtareas'))).toBe(true);
    s.destruir();
  });
});

import { localEnMemoria } from '../src/almacenamiento/local';
const conLocal = (almacen: Almacenamiento, usuario: string, local = localEnMemoria()) => {
  const avisos: string[] = [];
  const s = new Sesion({ almacen, usuario, local, latidoMs: 60e3, ui: { confirmar: async () => true, avisar: m => avisos.push(m), pedirUsuario: async () => usuario } });
  return { s, avisos, local };
};

describe('Sesion: novedades y respaldos', () => {
  it('lo que cambia otra persona aparece como novedad; lo tuyo no', async () => {
    const { d, almacen } = disco(MD);
    const ana = conLocal(almacen(), 'Ana');
    await ana.s.abrir();
    expect(ana.s.getSnapshot().novedades.total).toBe(0);

    const luis = conLocal(almacen(), 'Luis');
    await luis.s.abrir(); await luis.s.tomar();
    luis.s.editar(x => ({ ...x, actividades: x.actividades.map(a => (a.id === 1 ? conEstado(a, 'Terminado') : a)) }));
    await luis.s.editarSinTomar(x => agregarNota(x, 1, 'Luis', 'listo @Ana'));
    await luis.s.soltar();

    await ana.s.refrescar({ silencioso: true });
    const n = ana.s.getSnapshot().novedades;
    expect(n.cambios.map(c => c.a.id)).toEqual([1]);
    expect(n.notas).toHaveLength(1);
    expect(n.menciones).toHaveLength(1);
    expect(ana.avisos.join()).toContain('Llegaron cambios');

    ana.s.marcarVisto();
    expect(ana.s.getSnapshot().novedades.total).toBe(0);

    await ana.s.tomar();
    ana.s.editar(x => ({ ...x, actividades: x.actividades.map(a => (a.id === 2 ? conEstado(a, 'Planeado') : a)) }));
    expect(ana.s.getSnapshot().novedades.total).toBe(0);   // mis cambios no son novedades
    await ana.s.soltar();
    expect(parseMD(d.texto).actividades[1].estado).toBe('Planeado');
  });

  it('la base de lo visto se recuerda entre aperturas', async () => {
    const { d, almacen } = disco(MD);
    const local = localEnMemoria();
    const a1 = conLocal(almacen(), 'Ana', local);
    await a1.s.abrir();
    d.texto = d.texto.replace('| 2 | Dos | Backlog |', '| 2 | Dos | Terminado |');
    const a2 = conLocal(almacen(), 'Ana', local);     // "otro día": mismo equipo, misma base
    await a2.s.abrir();
    expect(a2.s.getSnapshot().novedades.cambios.map(c => c.a.id)).toEqual([2]);
  });

  it('guarda respaldos sin duplicar y sin candado, y los restaura con confirmación', async () => {
    const { d, almacen } = disco(MD);
    const { s, local } = conLocal(almacen(), 'Ana');
    await s.abrir();
    await s.tomar();
    s.editar(x => ({ ...x, actividades: x.actividades.filter(a => a.id !== 2) }));
    await s.soltar();
    const lista = await s.leerRespaldos();
    expect(lista.map(r => r.motivo)).toEqual(['Al soltar el archivo', 'Al abrir el archivo']);
    expect(lista.every(r => !r.texto.includes('En edición'))).toBe(true);
    expect(parseMD(d.texto).actividades).toHaveLength(1);

    const original = lista[lista.length - 1];
    expect(s.compararRespaldo(original)!.recupera.map(a => a.id)).toEqual([2]);
    expect(await s.restaurar(original)).toBe(true);
    await s.esperar();
    const doc = parseMD(d.texto);
    expect(doc.actividades.map(a => a.id)).toEqual([1, 2]);
    expect(doc.bitacora.some(e => e.accion === 'restauró')).toBe(true);
    expect(await s.leerRespaldos()).toHaveLength(2);   // el estado previo ya estaba respaldado: no se duplica
    await s.soltar();
    expect(await local.get('respaldos|p.md')).not.toBeNull();
    s.destruir();
  });
});

import { crearSprint, documentoNuevo } from '@gestor/core';
describe('Sesion: archivo nuevo', () => {
  it('un sprint nuevo: suelta el archivo actual, crea el nuevo, lo toma y deja respaldos', async () => {
    const { d, almacen } = disco(MD);
    const { s, local } = conLocal(almacen(), 'Ana');
    await s.abrir(); await s.tomar();
    const base = s.getSnapshot().doc!;
    const sprint = crearSprint(base, { nombre: 'P · Sprint 2', inicio: '2026-12-01', fin: '2026-12-15', estados: ['Planeado', 'Backlog'], negocios: ['Sin negocio'], notas: false, quitarFechas: true, reiniciar: false }, 'Ana', 'p.md');
    expect(await s.nuevoArchivo(sprint, 'p-sprint-2.md', 'Antes de crear el sprint')).toBe(true);
    const e = s.getSnapshot();
    expect([e.nombre, e.modo, e.doc!.meta.proyecto, e.doc!.actividades.length]).toEqual(['nuevo.md', 'edicion', 'P · Sprint 2', 2]);
    expect(parseMD(d.texto).candado?.usuario).toBe('Ana');
    expect(parseMD(d.texto).bitacora[0].accion).toBe('sprint');
    expect((await local.get<unknown[]>('respaldos|p.md'))!.length).toBeGreaterThan(0);
    s.editar(x => ({ ...x, actividades: x.actividades.map(a => ({ ...a, responsable: 'Rosa' })) }));
    await s.esperar();
    expect(parseMD(d.texto).actividades.every(a => a.responsable === 'Rosa')).toBe(true);
    await s.soltar(); expect(parseMD(d.texto).candado).toBeNull();
    s.destruir();
  });
  it('un proyecto nuevo vacío queda tomado y listo para agregar actividades', async () => {
    const { d, almacen } = disco(MD);
    const { s } = conLocal(almacen(), 'Ana');
    await s.abrir();
    expect(await s.nuevoArchivo(documentoNuevo({ proyecto: 'Nuevo', inicio: '2026-11-01', fin: '2026-11-30' }), 'actividades.md')).toBe(true);
    expect(s.getSnapshot()).toMatchObject({ nombre: 'nuevo.md', modo: 'edicion' });
    expect(parseMD(d.texto).meta.proyecto).toBe('Nuevo'); s.destruir();
  });
});

describe('Sesion: imágenes', () => {
  const png = (n = 'plano.png', tam = 1000) => new File([new Uint8Array(tam)], n, { type: 'image/png' });
  it('pide la carpeta la primera vez, guarda el archivo y lo anota sin tomar el archivo', async () => {
    const { d, almacen } = disco(MD);
    const { s, avisos } = conLocal(almacen(), 'Ana');
    await s.abrir();
    expect(await s.agregarImagenes(1, [png(), png('b.png')])).toBe(true);
    expect(d.acceso).toBe(true); expect([...d.imgs.keys()].every(k => k.startsWith('p-imagenes/1-'))).toBe(true); expect(d.imgs.size).toBe(2);
    const doc = parseMD(d.texto);
    expect(doc.imagenes.map(i => i.nombre)).toEqual(['plano.png', 'b.png']); expect(doc.candado).toBeNull(); expect(doc.bitacora.at(-1)!.accion).toBe('imagen');
    expect(avisos.join()).toContain('2 imágenes agregadas'); expect(s.getSnapshot().modo).toBe('lectura');
    // segunda vez: ya hay acceso
    d.permitirCarpeta = false; expect(await s.agregarImagenes(2, [png('c.png')])).toBe(true);
  });
  it('sin acceso a la carpeta no guarda nada y explica por qué', async () => {
    const { d, almacen } = disco(MD); d.permitirCarpeta = false;
    const { s, avisos } = conLocal(almacen(), 'Ana');
    await s.abrir();
    expect(await s.agregarImagenes(1, [png()])).toBe(false);
    expect(d.imgs.size).toBe(0); expect(parseMD(d.texto).imagenes).toEqual([]); expect(avisos.join()).toContain('Elige la carpeta');
  });
  it('omite las que pesan más de 15 MB y lo que no es imagen', async () => {
    const { d, almacen } = disco(MD);
    const { s, avisos } = conLocal(almacen(), 'Ana');
    await s.abrir();
    const grande = png('grande.png', 16 * 1024 * 1024), texto = new File(['hola'], 'a.txt', { type: 'text/plain' });
    expect(await s.agregarImagenes(1, [grande, texto, png()])).toBe(true);
    expect(d.imgs.size).toBe(1); expect(avisos.join()).toContain('1 imagen mayor a 15 MB');
  });
  it('no deja agregar si otra persona tiene el archivo tomado', async () => {
    const { d, almacen } = disco(MD);
    const ana = conLocal(almacen(), 'Ana'), luis = conLocal(almacen(), 'Luis');
    await ana.s.abrir(); await ana.s.tomar(); await luis.s.abrir();
    expect(await luis.s.agregarImagenes(1, [png()])).toBe(false);
    expect(parseMD(d.texto).imagenes).toEqual([]); ana.s.destruir();
  });
  it('borrar quita la anotación y el archivo', async () => {
    const { d, almacen } = disco(MD);
    const { s } = conLocal(almacen(), 'Ana');
    await s.abrir(); await s.agregarImagenes(1, [png()]);
    const archivo = parseMD(d.texto).imagenes[0].archivo;
    expect(await s.borrarImagen(archivo)).toBe(true);
    expect(parseMD(d.texto).imagenes).toEqual([]); expect(d.imgs.size).toBe(0);
  });
});
