import { describe, expect, it } from 'vitest';
import type { ApiEscritorio } from '@gestor/core';
import { crearAlmacenamientoEscritorio, localEscritorio } from '../src/almacenamiento/escritorio';

/** API de escritorio simulada en memoria (lo que haría el proceso principal de Electron) */
function apiFalsa() {
  const est = { texto: '# P\n', nombre: 'p.md', imgs: new Map<string, ArrayBuffer>(), datos: new Map<string, unknown>(), cb: null as null | (() => void), escrituras: 0, abierto: false };
  const api: ApiEscritorio = {
    plataforma: 'linux',
    abrir: async () => { est.abierto = true; return { nombre: est.nombre, texto: est.texto }; },
    abrirUltimo: async () => (est.abierto ? { nombre: est.nombre, texto: est.texto } : null),
    releer: async () => ({ nombre: est.nombre, texto: est.texto }),
    escribir: async t => { est.texto = t; est.escrituras++; },
    crear: async (n, t) => { est.texto = t; est.nombre = n; return n; },
    imagen: { guardar: async (r, d) => { est.imgs.set(r, d); }, leer: async r => est.imgs.get(r) ?? null, borrar: async r => { est.imgs.delete(r); } },
    dato: { leer: async k => est.datos.get(k), guardar: async (k, v) => { est.datos.set(k, v); } },
    alCambiarArchivo: cb => { est.cb = cb; return () => { est.cb = null; }; },
  };
  return { api, est };
}

describe('almacenamiento de escritorio', () => {
  it('no puede escribir ni leer hasta abrir un archivo', async () => {
    const { api } = apiFalsa(), a = crearAlmacenamientoEscritorio(api);
    expect(a.puedeEscribir()).toBe(false); expect(await a.releer()).toBeNull(); expect(await a.permisoEscritura()).toBe(false); expect(a.imagenesDisponibles()).toBe(false);
    expect(await a.abrir()).toEqual({ nombre: 'p.md', texto: '# P\n' });
    expect(a.puedeEscribir()).toBe(true); expect(await a.permisoEscritura()).toBe(true); expect(a.imagenesDisponibles()).toBe(true); expect(await a.imagenesAcceso()).toBe(true);
  });
  it('escribe, relee y crea archivos nuevos', async () => {
    const { api, est } = apiFalsa(), a = crearAlmacenamientoEscritorio(api);
    await a.abrir(); await a.escribir('hola'); expect(est.texto).toBe('hola'); expect((await a.releer())!.texto).toBe('hola');
    expect(await a.crear('sprint.md', 'nuevo')).toBe('sprint.md'); expect(est.nombre).toBe('sprint.md');
  });
  it('reabre el último archivo al iniciar', async () => {
    const { api, est } = apiFalsa(), a = crearAlmacenamientoEscritorio(api);
    expect(await a.reabrirUltimo!()).toBeNull(); est.abierto = true;
    expect(await a.reabrirUltimo!()).toEqual({ nombre: 'p.md', texto: '# P\n' }); expect(a.puedeEscribir()).toBe(true);
  });
  it('imágenes: guarda los bytes, devuelve una URL y borra', async () => {
    const { api, est } = apiFalsa(), a = crearAlmacenamientoEscritorio(api);
    await a.abrir();
    await a.guardarImagen('p-imagenes/1-a.png', new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }));
    expect(new Uint8Array(est.imgs.get('p-imagenes/1-a.png')!)).toEqual(new Uint8Array([1, 2, 3]));
    expect(await a.urlImagen('p-imagenes/no-esta.png')).toBeNull();
    await a.borrarImagen('p-imagenes/1-a.png'); expect(est.imgs.size).toBe(0);
  });
  it('avisa cuando el archivo cambia en disco y deja de avisar al cancelar', () => {
    const { api, est } = apiFalsa(), a = crearAlmacenamientoEscritorio(api); let n = 0;
    const parar = a.alCambiar!(() => { n++; }); est.cb!(); parar(); expect(est.cb).toBeNull(); expect(n).toBe(1);
  });
});

describe('datos locales de escritorio', () => {
  it('guarda y lee por clave; lo que no existe es null', async () => {
    const { api } = apiFalsa(), l = localEscritorio(api);
    expect(await l.get('visto|p.md')).toBeNull();
    await l.set('visto|p.md', { fecha: 'x' }); expect(await l.get('visto|p.md')).toEqual({ fecha: 'x' });
  });
});
