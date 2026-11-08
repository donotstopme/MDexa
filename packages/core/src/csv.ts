import { ALIAS_ESTADO, ALIAS_PRI, REPITE, TAMANOS } from './constantes';
import type { Actividad, Documento, Estado } from './tipos';
import { leerDeps, txtDeps } from './dependencias';
import { canonEtqEn, etqs, leerEtqs } from './etiquetas';
import { leerRepite } from './recurrencia';
import { conEstado } from './sesion';
import { EST, fechaISO, negocioDe, normaliza, siguienteId, txtSubsDe, vencida, hoy as hoyDe } from './utilidades';

export interface CampoCsv { k: string; t: string; req?: boolean; alias: string[]; ayuda?: string }
export const CAMPOS_CSV: CampoCsv[] = [
  { k: 'id', t: 'ID', alias: ['id', 'numero', 'num', '#', 'folio'], ayuda: 'Solo para actualizar actividades existentes' },
  { k: 'negocio', t: 'Negocio', req: true, alias: ['negocio', 'area', 'proyecto', 'cliente', 'unidad', 'sucursal'] },
  { k: 'actividad', t: 'Actividad', req: true, alias: ['actividad', 'tarea', 'descripcion', 'nombre', 'titulo', 'task', 'pendiente'] },
  { k: 'tamano', t: 'Tamaño', alias: ['tamano', 'talla', 'size', 'esfuerzo'] },
  { k: 'prioridad', t: 'Prioridad', alias: ['prioridad', 'priority', 'urgencia', 'importancia'] },
  { k: 'depende', t: 'Depende de', alias: ['depende de', 'depende', 'dependencias', 'dependencia', 'predecesoras', 'predecesora', 'depends on'], ayuda: 'Números de ID, por ejemplo 3, 7' },
  { k: 'repite', t: 'Se repite', alias: ['repite', 'se repite', 'recurrencia', 'frecuencia', 'periodicidad'], ayuda: 'Cada semana, Cada mes…' },
  { k: 'etiquetas', t: 'Etiquetas', alias: ['etiquetas', 'etiqueta', 'tags', 'tag', 'labels', 'categorias', 'categoria'], ayuda: 'Separadas por comas' },
  { k: 'responsable', t: 'Responsable', alias: ['responsable', 'encargado', 'asignado', 'asignado a', 'owner', 'quien'] },
  { k: 'inicio', t: 'Fecha inicio', alias: ['inicio', 'fecha inicio', 'fecha de inicio', 'start', 'desde'] },
  { k: 'fin', t: 'Fecha fin', alias: ['fin', 'fecha fin', 'fecha de fin', 'fecha limite', 'vencimiento', 'entrega', 'end', 'hasta'] },
  { k: 'estado', t: 'Estado', alias: ['estado', 'estatus', 'status', 'situacion'] },
  { k: 'terminada', t: 'Fecha terminada', alias: ['terminada', 'fecha terminada', 'fecha de termino', 'completada', 'cerrada'] },
];
const ALIAS_CSV_ESTADO: Record<string, Estado> = {
  ...ALIAS_ESTADO, 'todo': 'Backlog', 'to do': 'Backlog', 'nuevo': 'Backlog', 'abierto': 'Planeado', 'planned': 'Planeado', 'in progress': 'En progreso', 'doing': 'En progreso',
  'en curso': 'En progreso', 'iniciado': 'En progreso', 'done': 'Terminado', 'hecho': 'Terminado', 'cerrado': 'Terminado', 'finalizado': 'Terminado', 'listo': 'Terminado',
  'cancelled': 'Cancelado', 'canceled': 'Cancelado', 'descartado': 'Cancelado',
};

/** Lee CSV (separador coma, punto y coma o tabulador; comillas; BOM). Descarta filas vacías. */
export function parseCSV(txt: string): string[][] {
  txt = String(txt).replace(/^﻿/, '');
  const primera = txt.split(/\r?\n/).find(l => l.trim()) || '';
  const sep = [',', ';', '\t'].map(c => [c, primera.split(c).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const filas: string[][] = []; let fila: string[] = [], campo = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (q) { if (ch === '"' && txt[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') q = false; else campo += ch; }
    else if (ch === '"' && !campo) q = true;
    else if (ch === sep) { fila.push(campo); campo = ''; }
    else if (ch === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (ch !== '\r') campo += ch;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas.map(f => f.map(c => c.trim())).filter(f => f.some(c => c));
}

const MESES: Record<string, number> = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };
/** Fechas: AAAA-MM-DD, DD/MM/AAAA, DD-MM-AA, número de serie de Excel o "29 oct 2026" */
export function leerFechaCSV(v: string): { f: string; error?: string } {
  v = String(v || '').trim(); if (!v) return { f: '' };
  let y = '', m: string | number = '', d = '', x: RegExpMatchArray | null;
  if ((x = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) [, y, m, d] = x;
  else if ((x = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/))) { [, d, m, y] = x; if (y.length === 2) y = '20' + y; }
  else if ((x = normaliza(v).match(/^(\d{1,2})[\s.-]*(?:de\s+)?([a-z]{3})[a-z]*\.?[\s.-]*(?:de\s+)?(\d{2,4})$/)) && MESES[x[2]]) { d = x[1]; m = MESES[x[2]]; y = x[3].length === 2 ? '20' + x[3] : x[3]; }
  else if (/^\d{5}(\.\d+)?$/.test(v)) return { f: new Date(Date.UTC(1899, 11, 30) + Math.floor(+v) * 864e5).toISOString().slice(0, 10) };
  else return { f: '', error: `fecha no reconocida: "${v}"` };
  const f = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, dt = new Date(f + 'T00:00');
  if (isNaN(dt.getTime()) || fechaISO(dt) !== f) return { f: '', error: `fecha inválida: "${v}"` };
  return { f };
}

export type Mapa = Record<string, number>;
/** Propone qué columna es cada campo (por el nombre del encabezado; si no hay, por posición) */
export function mapaInicial(filas: string[][]): { mapa: Mapa; conEncabezado: boolean } {
  const mapa: Mapa = {}, enc = filas[0].map(c => normaliza(c).replace(/[^a-z0-9# ]/g, '').trim());
  CAMPOS_CSV.forEach(c => { const i = enc.findIndex(h => c.alias.includes(h)); if (i >= 0 && !Object.values(mapa).includes(i)) mapa[c.k] = i; });
  const conEncabezado = Object.keys(mapa).length > 0;
  if (!conEncabezado) ['negocio', 'actividad', 'responsable', 'inicio', 'fin', 'estado'].forEach((k, i) => { if (i < filas[0].length) mapa[k] = i; });
  return { mapa, conEncabezado };
}

export interface FilaImp { fila: number; errores: string[]; avisos: string[]; a: Partial<Actividad> & { negocio: string; actividad: string; estado: Estado; terminada: string; etiquetas: string[]; depende: number[] }; csvId: number | null; accion: 'omitir' | 'actualizar' | 'agregar'; id?: number }
export interface OpcionesImp { encabezado: boolean; modo: 'agregar' | 'actualizar'; negocioDefecto: string }

/** Lo que haría la importación con cada fila (con errores y avisos) */
export function filasImportar(doc: Documento, filas: string[][], mapa: Mapa, o: OpcionesImp): FilaImp[] {
  const datos = o.encabezado ? filas.slice(1) : filas, ids = new Set(doc.actividades.map(a => a.id));
  return datos.map((f, n) => {
    const g = (k: string) => (mapa[k] != null ? (f[mapa[k]] ?? '').trim() : '');
    const r: FilaImp = { fila: n + 1 + (o.encabezado ? 1 : 0), errores: [], avisos: [], csvId: parseInt(g('id'), 10) || null, accion: 'agregar',
      a: { negocio: g('negocio') || o.negocioDefecto.trim(), actividad: g('actividad').replace(/\s*<br\s*\/?>\s*/gi, '\n'), estado: 'Backlog', terminada: '', etiquetas: [], depende: [] } };
    if (!r.a.negocio) r.errores.push('falta el negocio');
    if (!r.a.actividad) r.errores.push('falta la actividad');
    const tz = g('tamano').toUpperCase(); r.a.tamano = (TAMANOS as Record<string, unknown>)[tz] ? (tz as Actividad['tamano']) : ''; if (tz && !r.a.tamano) r.avisos.push(`tamaño "${g('tamano')}" no válido`);
    r.a.responsable = g('responsable');
    const pz = g('prioridad'); r.a.prioridad = ALIAS_PRI[normaliza(pz)] || ''; if (pz && !r.a.prioridad) r.avisos.push(`prioridad "${pz}" no válida`);
    r.a.etiquetas = leerEtqs(g('etiquetas')).map(t => canonEtqEn(doc.actividades, t));
    r.a.depende = leerDeps(g('depende'));
    const rz = g('repite'); r.a.repite = leerRepite(rz); if (rz && !r.a.repite) r.avisos.push(`"${rz}" no es una repetición válida`);
    for (const k of ['inicio', 'fin', 'terminada'] as const) { const x = leerFechaCSV(g(k)); r.a[k] = x.f; if (x.error) r.avisos.push(x.error); }
    if (r.a.inicio && r.a.fin && r.a.fin < r.a.inicio) { r.avisos.push('el fin es antes del inicio: se igualó al inicio'); r.a.fin = r.a.inicio; }
    const est = g('estado'), ne = normaliza(est);
    r.a.estado = ALIAS_CSV_ESTADO[ne] || 'Backlog';
    if (est && !ALIAS_CSV_ESTADO[ne]) r.avisos.push(`estado "${est}" no reconocido: quedará en Backlog`);
    const id = parseInt(g('id'), 10);
    r.accion = r.errores.length ? 'omitir' : o.modo === 'actualizar' && id && ids.has(id) ? 'actualizar' : 'agregar';
    if (r.accion === 'actualizar') r.id = id;
    return r;
  });
}

/** Aplica la importación: agrega actividades nuevas y actualiza las que coinciden por ID; reasigna las dependencias a los IDs nuevos */
export function aplicarImportacion(doc: Documento, filas: FilaImp[], mapa: Mapa, ahora: Date = new Date()): { doc: Documento; nuevas: number; actualizadas: number } {
  let sig = siguienteId(doc), nuevas = 0, actualizadas = 0, acts = [...doc.actividades];
  const mapaIds = new Map<number, number>(), conDeps: [number, number[]][] = [];
  for (const r of filas.filter(x => x.accion !== 'omitir')) {
    if (r.accion === 'actualizar') {
      const i = acts.findIndex(x => x.id === r.id); if (i < 0) continue;
      let a = { ...acts[i] };
      for (const k of ['negocio', 'actividad', 'tamano', 'prioridad', 'responsable', 'inicio', 'fin'] as const)
        if (mapa[k] != null && (r.a[k] || k === 'tamano' || k === 'prioridad' || k === 'responsable')) (a as Record<string, unknown>)[k] = r.a[k] ?? '';
      if (mapa.etiquetas != null) a.etiquetas = r.a.etiquetas;
      if (mapa.repite != null) a.repite = r.a.repite ?? '';
      if (mapa.depende != null) conDeps.push([a.id, r.a.depende]);
      if (mapa.estado != null) a = conEstado(a, r.a.estado, r.a.terminada, ahora);
      acts[i] = a; actualizadas++;
    } else {
      const base: Actividad = { id: sig++, negocio: r.a.negocio, actividad: r.a.actividad, tamano: r.a.tamano ?? '', prioridad: r.a.prioridad ?? '', etiquetas: r.a.etiquetas, depende: [], repite: r.a.repite ?? '',
        responsable: r.a.responsable ?? '', inicio: r.a.inicio ?? '', fin: r.a.fin ?? '', estado: 'Backlog', terminada: '' };
      acts.push(conEstado(base, r.a.estado, r.a.terminada, ahora)); nuevas++;
      if (r.csvId) mapaIds.set(r.csvId, base.id);
      if (mapa.depende != null) conDeps.push([base.id, r.a.depende]);
    }
  }
  const existen = new Set(acts.map(a => a.id));
  acts = acts.map(a => { const d = conDeps.find(([id]) => id === a.id); return d ? { ...a, depende: d[1].map(i => mapaIds.get(i) ?? i).filter(i => i !== a.id && existen.has(i)) } : a; });
  return { doc: { ...doc, actividades: acts }, nuevas, actualizadas };
}

const q = (v: unknown) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const PLANTILLA_CSV = '﻿' + ['Negocio,Actividad,Tamaño,Prioridad,Responsable,Inicio,Fin,Estado,Etiquetas',
  'Tienda Centro,Revisar presupuesto,S,Alta,Ana López,2026-11-03,2026-11-05,Planeado,"finanzas, cliente"',
  'Tienda Centro,"Comprar mobiliario, sillas y mesas",L,Media,Luis Méndez,05/11/2026,07/11/2026,Backlog,compras'].join('\r\n') + '\r\n';

/** CSV para Excel (con BOM y CRLF): las actividades ordenadas por negocio */
export function exportarCsv(doc: Documento, lista: Actividad[], conNotas: boolean, h: string = hoyDe()): string {
  const fmtHora = (iso: string) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const cab = ['ID', 'Negocio', 'Actividad', 'Tamaño', 'Prioridad', 'Responsable', 'Inicio', 'Fin', 'Estado', 'Terminada', 'Etiquetas', 'Depende de', 'Subtareas', 'Se repite', 'Vencida', 'Notas', 'Imágenes'].concat(conNotas ? ['Texto de las notas'] : []);
  const filas = [...lista].sort((a, b) => negocioDe(a).localeCompare(negocioDe(b), 'es') || a.id - b.id).map(a => {
    const ns = doc.notas.filter(n => n.act === a.id).sort((x, y) => x.fecha.localeCompare(y.fecha));
    return [a.id, a.negocio, a.actividad.replace(/\n/g, ' / '), a.tamano, a.prioridad, a.responsable, a.inicio, a.fin, EST(a), a.terminada, etqs(a).join(', '), txtDeps(doc.actividades, a), txtSubsDe(a),
      (a.repite && REPITE[a.repite]) || '', vencida(a, h) ? 'Sí' : 'No', ns.length, doc.imagenes.filter(x => x.act === a.id).length]
      .concat(conNotas ? [ns.map(n => `${fmtHora(n.fecha)} ${n.autor}: ${n.texto.replace(/\n/g, ' ')}`).join(' | ')] : []).map(q).join(',');
  });
  return '﻿' + [cab.map(q).join(','), ...filas].join('\r\n') + '\r\n';
}
