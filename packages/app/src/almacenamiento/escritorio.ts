import type { ApiEscritorio } from '@mdexa/core';
import type { Local } from './local';
import type { Almacenamiento } from './tipos';

declare global { interface Window { mdexaEscritorio?: ApiEscritorio } }

/** Almacenamiento de la versión de escritorio (Electron): archivos reales, sin permisos del navegador */
export function crearAlmacenamientoEscritorio(api: ApiEscritorio): Almacenamiento {
  let abierto = false;
  const urls = new Map<string, string | null>();
  const liberar = () => { urls.forEach(u => u && URL.revokeObjectURL(u)); urls.clear(); };
  return {
    async abrir() { const a = await api.abrir(); if (a) { abierto = true; liberar(); } return a; },
    async reabrirUltimo() { const a = await api.abrirUltimo(); if (a) { abierto = true; liberar(); } return a; },
    async releer() { return abierto ? api.releer() : null; },
    puedeEscribir: () => abierto,
    permisoEscritura: async () => abierto,
    escribir: texto => api.escribir(texto),
    async crear(nombreSugerido, texto) { const n = await api.crear(nombreSugerido, texto); if (n) { abierto = true; liberar(); } return n; },
    imagenesDisponibles: () => abierto,
    imagenesAcceso: async () => abierto,
    pedirCarpeta: async () => ({ ok: abierto }),
    async guardarImagen(ruta, datos) { await api.imagen.guardar(ruta, await datos.arrayBuffer()); urls.set(ruta, URL.createObjectURL(datos)); },
    async urlImagen(ruta) {
      if (urls.has(ruta)) return urls.get(ruta) ?? null;
      const b = await api.imagen.leer(ruta);
      const u = b ? URL.createObjectURL(new Blob([b])) : null;
      urls.set(ruta, u); return u;
    },
    async borrarImagen(ruta) { await api.imagen.borrar(ruta); const u = urls.get(ruta); if (u) URL.revokeObjectURL(u); urls.delete(ruta); },
    liberarImagenes: liberar,
    alCambiar: cb => api.alCambiarArchivo(cb),
  };
}

/** Datos locales en la carpeta de datos de la aplicación (en vez de IndexedDB) */
export const localEscritorio = (api: ApiEscritorio): Local => ({
  get: async <T,>(k: string) => ((await api.dato.leer(k)) as T | undefined) ?? null,
  set: async (k, v) => { await api.dato.guardar(k, v); },
});
