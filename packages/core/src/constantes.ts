import type { Estado, Tamano, Prioridad, Repite, ColorEtiqueta } from './tipos';

export const NOMBRE_APP = 'Gestor Proyectos';
/** Número de compatibilidad del formato del .md: sólo sube cuando cambia lo que se guarda. */
export const VERSION_GESTOR = 18;
export const VERSION_TXT = '1.34.1';

export const SIN_NEGOCIO = 'Sin negocio';
export const TTL_CANDADO = 5 * 60e3;
export const MAX_BITACORA = 3000;
export const JUNTAR_BIT = 3 * 60e3;

export const ESTADOS: Estado[] = ['Backlog', 'Planeado', 'En progreso', 'Terminado', 'Cancelado'];

export const ALIAS_ESTADO: Record<string, Estado> = {
  '': 'Backlog', 'sin estado': 'Backlog', 'pendiente': 'Backlog', 'por iniciar': 'Backlog', 'backlog': 'Backlog',
  'planeado': 'Planeado', 'planeada': 'Planeado', 'en proceso': 'En progreso', 'en progreso': 'En progreso',
  'completada': 'Terminado', 'completado': 'Terminado', 'terminado': 'Terminado', 'terminada': 'Terminado',
  'cancelado': 'Cancelado', 'cancelada': 'Cancelado',
};

export const TAMANOS: Record<Tamano, { n: number; txt: string; h: number }> = {
  XS: { n: 1, txt: 'Menos de 1 hora', h: 1 },
  S: { n: 2, txt: 'Menos de 4 horas', h: 4 },
  M: { n: 3, txt: 'Máximo 1 día', h: 8 },
  L: { n: 4, txt: 'Máximo 2 días', h: 16 },
  XL: { n: 5, txt: 'Máximo 1 semana · debería partirse', h: 40 },
};

export const PRIORIDADES: Record<Prioridad, { c: string; d: string }> = {
  Alta: { c: 'rojo', d: 'Hay que atenderla primero' },
  Media: { c: 'amar', d: 'Importante, sin urgencia' },
  Baja: { c: 'gris', d: 'Puede esperar' },
};
export const ALIAS_PRI: Record<string, Prioridad> = {
  alta: 'Alta', high: 'Alta', urgente: 'Alta', critica: 'Alta', '1': 'Alta',
  media: 'Media', medium: 'Media', normal: 'Media', '2': 'Media',
  baja: 'Baja', low: 'Baja', '3': 'Baja',
};

export const COLORES_ETQ: Record<ColorEtiqueta, string> = {
  azul: 'Azul', verde: 'Verde', morado: 'Morado', naranja: 'Naranja', rosa: 'Rosa',
  turquesa: 'Turquesa', amarillo: 'Amarillo', rojo: 'Rojo', gris: 'Gris',
};

export const REPITE: Record<Repite, string> = {
  dia: 'Cada día hábil', semana: 'Cada semana', quincena: 'Cada 2 semanas', mes: 'Cada mes', trimestre: 'Cada 3 meses',
};
export const ALIAS_REPITE: Record<string, Repite> = {
  'cada dia habil': 'dia', 'diaria': 'dia', 'diario': 'dia', 'cada dia': 'dia', 'cada semana': 'semana', 'semanal': 'semana',
  'cada 2 semanas': 'quincena', 'quincenal': 'quincena', 'cada quince dias': 'quincena', 'cada mes': 'mes', 'mensual': 'mes',
  'cada 3 meses': 'trimestre', 'trimestral': 'trimestre',
  'cada lunes': 'semana', 'cada martes': 'semana', 'cada miercoles': 'semana', 'cada jueves': 'semana', 'cada viernes': 'semana',
};
export const DIAS_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Etiquetas de campo para la bitácora y las novedades */
export const CAMPOS_NOV: Record<string, string> = {
  estado: 'Estado', responsable: 'Responsable', fin: 'Fin', inicio: 'Inicio', tamano: 'Tamaño', prioridad: 'Prioridad',
  etiquetas: 'Etiquetas', depende: 'Depende de', subtareas: 'Subtareas', repite: 'Se repite', negocio: 'Negocio', actividad: 'Actividad',
};
export const ETQ_BIT: Record<string, string> = { ...CAMPOS_NOV, proyecto: 'Proyecto', metaInicio: 'Meta inicio', metaFin: 'Meta fin' };

export const SIN_RESP = 'Sin responsable', SIN_TAM = 'Sin tamaño', SIN_PRI = 'Sin prioridad', SIN_ETQ = 'Sin etiqueta';

/** Acciones de la bitácora: icono, color y texto */
export const ACCIONES_BIT: Record<string, { ic: string; c: string; t: string }> = {
  'creó': { ic: 'mas', c: 'verde', t: 'Creó' }, 'cambió': { ic: 'lapiz', c: 'amar', t: 'Cambió' }, 'eliminó': { ic: 'basura', c: 'rojo', t: 'Eliminó' },
  'meta': { ic: 'bandera', c: 'azul', t: 'Cambió la meta' }, 'restauró': { ic: 'reloj', c: 'azul', t: 'Restauró un respaldo' }, 'sprint': { ic: 'nuevo', c: 'azul', t: 'Creó el sprint' },
  'recuperó': { ic: 'reloj', c: 'verde', t: 'Recuperó' }, 'imagen': { ic: 'imagen', c: 'azul', t: 'Imagen' },
};

export const ORDEN_TAMANOS = Object.keys(TAMANOS);
