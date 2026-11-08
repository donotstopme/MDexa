/**
 * Capa de almacenamiento: la app sólo conoce esta interfaz. La versión web usa la File System
 * Access API; la de escritorio (Electron) usará `fs` con la misma forma.
 */
export interface ArchivoAbierto {
  nombre: string;
  texto: string;
}

export interface Almacenamiento {
  /** Pide al usuario un .md y devuelve su contenido (null si cancela) */
  abrir(): Promise<ArchivoAbierto | null>;
  /** Vuelve a leer el archivo abierto (null si no hay uno o no se puede releer) */
  releer(): Promise<ArchivoAbierto | null>;
  /** ¿Este almacenamiento puede escribir el archivo abierto? (false en el respaldo por <input>) */
  puedeEscribir(): boolean;
  /** Pide permiso de escritura sobre el archivo abierto */
  permisoEscritura(): Promise<boolean>;
  /** Reemplaza el contenido del archivo abierto */
  escribir(texto: string): Promise<void>;
  /**
   * Crea un archivo nuevo con ese contenido y lo deja como el archivo abierto. Devuelve su nombre, o null si
   * no se pudo crear aquí (en el respaldo por <input> se descarga) o si se canceló.
   */
  crear(nombreSugerido: string, texto: string): Promise<string | null>;

  /* ---- Imágenes: viven en una carpeta junto al .md ---- */
  /** ¿Este almacenamiento puede guardar imágenes? (archivo abierto desde una carpeta, con acceso a carpetas) */
  imagenesDisponibles(): boolean;
  /** ¿Ya hay permiso de lectura y escritura sobre la carpeta del archivo? */
  imagenesAcceso(): Promise<boolean>;
  /** Pide (una vez por archivo) acceso a la carpeta donde está el .md; el aviso explica por qué no se pudo */
  pedirCarpeta(): Promise<{ ok: boolean; aviso?: string }>;
  guardarImagen(ruta: string, datos: Blob): Promise<void>;
  /** URL para mostrar la imagen, o null si no se encuentra */
  urlImagen(ruta: string): Promise<string | null>;
  borrarImagen(ruta: string): Promise<void>;
  /** Libera las URL creadas (al abrir otro archivo) */
  liberarImagenes(): void;

  /** (Escritorio) Reabre el último archivo al iniciar */
  reabrirUltimo?(): Promise<ArchivoAbierto | null>;
  /** (Escritorio) Avisa cuando el archivo cambió en disco; devuelve la función para dejar de escuchar */
  alCambiar?(cb: () => void): () => void;
}
