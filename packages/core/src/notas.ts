import type { Actividad, ColorEtiqueta, Documento, Nota } from './tipos';
import { leerEtqs } from './etiquetas';
import { limpiaSub, normaliza, subtareasDe, unicos } from './utilidades';

/* ---- Notas ---- */
export const notasDe = (d: Pick<Documento, 'notas'>, id: number): Nota[] =>
  d.notas.filter(n => n.act === id).sort((a, b) => a.fecha.localeCompare(b.fecha));

export function agregarNota(d: Documento, act: number, autor: string, texto: string, ahora: Date = new Date()): Documento {
  const t = texto.trim();
  if (!t || !d.actividades.some(a => a.id === act)) return d;
  return { ...d, notas: [...d.notas, { act, fecha: ahora.toISOString(), autor: autor || 'Sin nombre', texto: t }] };
}
export const quitarNota = (d: Documento, n: Nota): Documento =>
  ({ ...d, notas: d.notas.filter(x => !(x.act === n.act && x.fecha === n.fecha && x.autor === n.autor && x.texto === n.texto)) });

/* ---- Subtareas ---- */
export const conSubtareas = (a: Actividad, l: { t: string; ok: boolean }[]): Actividad => {
  const { subtareas: _quitada, ...resto } = a;
  void _quitada;
  return l.length ? { ...resto, subtareas: l } : resto;
};
export const agregarSubtarea = (a: Actividad, t: string): Actividad => {
  const s = limpiaSub(t);
  return s ? conSubtareas(a, [...subtareasDe(a), { t: s, ok: false }]) : a;
};
export const alternarSubtarea = (a: Actividad, i: number): Actividad =>
  conSubtareas(a, subtareasDe(a).map((x, j) => (j === i ? { ...x, ok: !x.ok } : x)));
export const quitarSubtarea = (a: Actividad, i: number): Actividad =>
  conSubtareas(a, subtareasDe(a).filter((_, j) => j !== i));

/* ---- Etiquetas ---- */
/** Pone o quita una etiqueta (con el nombre canónico que ya exista) en varias actividades */
export function ponerEtiqueta(d: Documento, ids: number[], t: string, poner: boolean): Documento {
  const nombre = d.actividades.flatMap(a => a.etiquetas).find(x => normaliza(x) === normaliza(t)) ?? t;
  return { ...d, actividades: d.actividades.map(a => {
    if (!ids.includes(a.id)) return a;
    const l = a.etiquetas.filter(x => normaliza(x) !== normaliza(nombre));
    return { ...a, etiquetas: poner ? [...l, nombre] : l };
  }) };
}
/** Reemplaza las etiquetas de una actividad a partir de texto separado por comas */
export const conEtiquetas = (a: Actividad, txt: string): Actividad => ({ ...a, etiquetas: leerEtqs(txt) });
export const conColorEtiqueta = (d: Documento, etq: string, color: ColorEtiqueta): Documento =>
  ({ ...d, coloresEtq: { ...d.coloresEtq, [normaliza(etq)]: color } });

/* ---- Menciones: escribir @Nombre ---- */
const normCh = (ch: string) => { const n = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return n.length === 1 ? n : ch.length === 1 ? ch : '\u0000'; };
const normTxt = (t: string) => [...String(t)].map(normCh).join('');

export function personasConocidas(d: Documento, usuario = ''): string[] {
  return unicos([usuario, ...d.actividades.map(a => a.responsable), ...d.notas.map(n => n.autor), ...d.bitacora.map(e => e.autor)]
    .filter(x => x && x !== 'Sin nombre')).sort((a, b) => a.localeCompare(b, 'es'));
}

export interface Mencion { i: number; len: number; nombre: string }
/** Menciones en `texto`, con posiciones en caracteres */
export function mencionesEn(texto: string, personas: string[]): Mencion[] {
  const chars = [...String(texto || '')], nt = chars.map(normCh).join(''), out: Mencion[] = [];
  if (!nt.includes('@')) return out;
  const pers = personas.map(p => ({ p, n: normTxt(p) })).sort((a, b) => b.n.length - a.n.length);
  const letra = (c?: string) => /[a-z0-9ñ]/.test(c || '');
  let i = nt.indexOf('@');
  while (i >= 0) {
    if (i > 0 && letra(nt[i - 1])) { i = nt.indexOf('@', i + 1); continue; }     // un correo: ana@dominio
    const resto = nt.slice(i + 1);
    let m: { p: string; n: string } | undefined = pers.find(x => resto.startsWith(x.n) && !letra(resto[x.n.length]));
    if (!m) {                                                                      // @Luis → Luis Méndez si sólo hay un Luis
      const tok = (resto.match(/^[a-z0-9ñ]+/) || [''])[0];
      const c = tok.length >= 2 ? pers.filter(x => x.n.split(/\s+/)[0] === tok) : [];
      if (c.length === 1) m = { p: c[0].p, n: tok };
    }
    if (m) { out.push({ i, len: m.n.length + 1, nombre: m.p }); i = nt.indexOf('@', i + 1 + m.n.length); }
    else i = nt.indexOf('@', i + 1);
  }
  return out;
}
export const mencionaA = (n: Nota, persona: string, personas: string[]): boolean =>
  !!persona && mencionesEn(n.texto, personas).some(m => normaliza(m.nombre) === normaliza(persona));

/** Sugerencias de @mención mientras se escribe: null si el cursor no está en una mención */
export function sugerirMencion(texto: string, cursor: number, personas: string[]): { ini: number; lista: string[] } | null {
  const antes = texto.slice(0, cursor), m = antes.match(/(^|[\s(¿¡])@([^@\n]{0,30})$/);
  if (!m) return null;
  const q = normaliza(m[2]), ini = antes.length - m[2].length - 1;
  const lista = personas.filter(p => !q || normaliza(p).startsWith(q) || normaliza(p).split(/\s+/).some(w => w.startsWith(q))).slice(0, 8);
  if (!lista.length || (lista.length === 1 && normaliza(lista[0]) === q)) return null;
  return { ini, lista };
}
/** Texto con la mención elegida y la posición final del cursor */
export function insertarMencion(texto: string, ini: number, cursor: number, nombre: string): { texto: string; cursor: number } {
  const ins = '@' + nombre + ' ';
  return { texto: texto.slice(0, ini) + ins + texto.slice(cursor).replace(/^ /, ''), cursor: ini + ins.length };
}
export const colorAutor = (s: string): number => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
export const iniciales = (s: string): string => String(s).split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
