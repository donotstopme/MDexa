/** Acciones que las vistas piden a la aplicación (abrir notas, subtareas, etiquetas o ir a una actividad) */
export interface Acciones {
  notas(id: number): void;
  imgs(id: number): void;
  subs(id: number, ancla: HTMLElement): void;
  etq(id: number, ancla: HTMLElement): void;
  ir(id: number): void;
}

/** Selección múltiple (sólo con el archivo tomado) */
export interface Seleccion {
  ids: ReadonlySet<number>;
  /** Marca o desmarca una; con `mayus` selecciona el rango desde la última tocada */
  alternar(id: number, marcar: boolean, mayus: boolean): void;
  /** Marca o desmarca todas las de un grupo (si ya están todas, las quita) */
  grupo(ids: number[]): void;
}
