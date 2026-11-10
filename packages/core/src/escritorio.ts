/**
 * Contrato entre la app (renderer) y la versión de escritorio (Electron): el preload lo expone en
 * `window.mdexaEscritorio`. Sólo tipos; no lleva lógica.
 */
export interface ArchivoEscritorio { nombre: string; texto: string }

export interface ApiEscritorio {
  /** 'darwin' | 'win32' | 'linux' */
  plataforma: string;
  /** Muestra el selector de archivos del sistema (null si se cancela) */
  abrir(): Promise<ArchivoEscritorio | null>;
  /** Último archivo abierto (si todavía existe) */
  abrirUltimo(): Promise<ArchivoEscritorio | null>;
  releer(): Promise<ArchivoEscritorio | null>;
  /** Reemplaza el contenido del archivo abierto (escritura atómica) */
  escribir(texto: string): Promise<void>;
  /** "Guardar como": crea el archivo, lo deja como el abierto y devuelve su nombre (null si se cancela) */
  crear(nombreSugerido: string, texto: string): Promise<string | null>;
  imagen: {
    guardar(ruta: string, datos: ArrayBuffer): Promise<void>;
    leer(ruta: string): Promise<ArrayBuffer | null>;
    borrar(ruta: string): Promise<void>;
  };
  /** Datos locales (qué has visto, respaldos, carpetas): archivos en la carpeta de datos de la aplicación */
  dato: { leer(clave: string): Promise<unknown>; guardar(clave: string, valor: unknown): Promise<void> };
  /** Avisa cuando el archivo abierto cambió en disco (otra persona lo guardó). Devuelve la función para dejar de escuchar. */
  alCambiarArchivo(cb: () => void): () => void;
}
