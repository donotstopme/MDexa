// Preload (sandbox): sólo puede usar `electron`; expone una API mínima y fija a la página.
import { contextBridge, ipcRenderer } from 'electron';
import type { ApiEscritorio } from '@gestor/core';

const api: ApiEscritorio = {
  plataforma: process.platform,
  abrir: () => ipcRenderer.invoke('archivo:abrir'),
  abrirUltimo: () => ipcRenderer.invoke('archivo:ultimo'),
  releer: () => ipcRenderer.invoke('archivo:releer'),
  escribir: texto => ipcRenderer.invoke('archivo:escribir', texto),
  crear: (nombre, texto) => ipcRenderer.invoke('archivo:crear', nombre, texto),
  imagen: {
    guardar: (ruta, datos) => ipcRenderer.invoke('imagen:guardar', ruta, datos),
    leer: ruta => ipcRenderer.invoke('imagen:leer', ruta),
    borrar: ruta => ipcRenderer.invoke('imagen:borrar', ruta),
  },
  dato: {
    leer: clave => ipcRenderer.invoke('dato:leer', clave),
    guardar: (clave, valor) => ipcRenderer.invoke('dato:guardar', clave, valor),
  },
  alCambiarArchivo: cb => {
    const f = () => cb();
    ipcRenderer.on('archivo:cambio', f);
    return () => { ipcRenderer.removeListener('archivo:cambio', f); };
  },
};
contextBridge.exposeInMainWorld('gestorEscritorio', api);
