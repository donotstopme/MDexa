export type Estado = 'Backlog' | 'Planeado' | 'En progreso' | 'Terminado' | 'Cancelado';
export type Tamano = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type Prioridad = 'Alta' | 'Media' | 'Baja';
export type Repite = 'dia' | 'semana' | 'quincena' | 'mes' | 'trimestre';
export type ColorEtiqueta = 'azul' | 'verde' | 'morado' | 'naranja' | 'rosa' | 'turquesa' | 'amarillo' | 'rojo' | 'gris';

export interface Subtarea { t: string; ok: boolean }

export interface Actividad {
  id: number;
  negocio: string;
  actividad: string;
  tamano: Tamano | '';
  prioridad: Prioridad | '';
  etiquetas: string[];
  depende: number[];
  repite: Repite | '';
  responsable: string;
  inicio: string;      // AAAA-MM-DD o ''
  fin: string;         // AAAA-MM-DD o ''
  estado: Estado;
  terminada: string;   // AAAA-MM-DD, sólo si estado === 'Terminado'
  subtareas?: Subtarea[];
}

export interface Meta {
  proyecto: string;
  inicio: string;
  fin: string;
  version: number;       // VERSION_GESTOR con que se guardó el archivo (0 si no la trae)
  versionTxt?: string;   // "1.34.1"
}

export interface Candado { usuario: string; desde: string; latido: string }
export interface Nota { act: number; fecha: string; autor: string; texto: string }
export interface Imagen { act: number; fecha: string; autor: string; nombre: string; archivo: string }

export interface CampoBit { k: string; etq: string; antes: string; despues: string }
export interface EntradaBit {
  fecha: string;
  autor: string;
  act: number | null;
  accion: string;
  campos: CampoBit[];
  detalle: string;
}

/** Todo lo que vive en el .md */
export interface Documento {
  actividades: Actividad[];
  meta: Meta;
  candado: Candado | null;
  notas: Nota[];
  bitacora: EntradaBit[];
  /** Secciones `##` desconocidas, conservadas tal cual */
  extra: string[];
  /** nombre normalizado de etiqueta → color elegido a mano */
  coloresEtq: Record<string, ColorEtiqueta>;
  imagenes: Imagen[];
}
