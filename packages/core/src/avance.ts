import { TAMANOS } from './constantes';
import type { Documento } from './tipos';
import { EST, addDias, dias, hoy as hoyDe, medible } from './utilidades';

export type UnidadAvance = 'act' | 'h';
export interface DatosAvance {
  ini: string; finM: string; finX: string; nDias: number; total: number; real: { f: string; v: number }[]; ideal(f: string): number;
  actual: number; hoy: string; hastaReal: string | null; ritmo: number; estimada: string | 'completo' | null; unidad: UnidadAvance; idealHoy: number;
}

/** Avance acumulado contra la meta (burn-up): lo terminado día a día y la línea ideal. null si no hay meta válida. */
export function datosAvance(d: Documento, unidad: UnidadAvance = 'act', h: string = hoyDe()): DatosAvance | null {
  const meta = d.meta;
  if (!meta.inicio || !meta.fin || meta.fin < meta.inicio) return null;
  const ini = meta.inicio, finM = meta.fin, med = d.actividades.filter(medible);
  const peso = (a: { tamano: string }) => (unidad === 'h' ? (a.tamano ? TAMANOS[a.tamano as keyof typeof TAMANOS].h : 0) : 1);
  const total = med.reduce((s, a) => s + peso(a), 0);
  // Fecha en que se terminó (si no se registró, la fecha fin); nunca antes del inicio de la meta ni después de hoy
  const fechaTerm = (a: { terminada: string; fin: string }) => { let f = a.terminada || a.fin || h; if (f < ini) f = ini; if (f > h) f = h; return f; };
  const term = med.filter(a => EST(a) === 'Terminado');
  const finX = [finM, h < ini ? finM : h, ...term.map(fechaTerm)].sort().pop()!;
  const nDias = dias(ini, finX) + 1;
  const porDia = new Map<string, number>(); term.forEach(a => { const f = fechaTerm(a); porDia.set(f, (porDia.get(f) || 0) + peso(a)); });
  const hastaReal = h < ini ? null : h;
  const real: { f: string; v: number }[] = []; let acc = 0;
  for (let i = 0; i < nDias; i++) { const f = addDias(ini, i); acc += porDia.get(f) || 0; if (hastaReal && f <= hastaReal) real.push({ f, v: acc }); }
  const durMeta = Math.max(1, dias(ini, finM));
  const ideal = (f: string) => total * Math.min(1, Math.max(0, dias(ini, f) / durMeta));
  const actual = real.length ? real[real.length - 1].v : 0, transc = hastaReal ? dias(ini, hastaReal) + 1 : 0, ritmo = transc ? actual / transc : 0;
  let estimada: DatosAvance['estimada'] = null;
  if (total > 0 && actual >= total) estimada = 'completo';
  else if (ritmo > 0 && total > 0) estimada = addDias(hastaReal!, Math.ceil((total - actual) / ritmo));
  return { ini, finM, finX, nDias, total, real, ideal, actual, hoy: h, hastaReal, ritmo, estimada, unidad, idealHoy: hastaReal ? ideal(hastaReal) : 0 };
}

export const etqUnidad = (v: number, u: UnidadAvance): string => (u === 'h' ? `${Math.round(v)} h` : `${Math.round(v * 10) / 10}`);

/** Frase de resumen del avance, en partes para poder darles formato */
export function resumenAvance(d: DatosAvance): { tipo: 'texto'; txt: string } | { tipo: 'detalle'; actual: string; total: string; ideal: string; dif: { cls: 't-ok' | 't-dan' | 't-ok-plano'; txt: string };
  fin: { tipo: 'completo' } | { tipo: 'fecha'; f: string; vs: number } | { tipo: 'sin-ritmo'; unidades: string } } {
  const u = d.unidad, dif = d.actual - d.idealHoy;
  if (!d.total) return { tipo: 'texto', txt: u === 'h' ? 'Ninguna actividad medible tiene tamaño: asígnales un tamaño para ver el avance en horas.' : 'Aún no hay actividades Planeadas, En progreso o Terminadas.' };
  if (!d.hastaReal) return { tipo: 'texto', txt: `La meta aún no inicia (empieza el ${d.ini}).` };
  return {
    tipo: 'detalle', actual: etqUnidad(d.actual, u), total: etqUnidad(d.total, u), ideal: etqUnidad(d.idealHoy, u),
    dif: Math.abs(dif) < 0.5 ? { cls: 't-ok-plano', txt: 'al día' } : dif > 0 ? { cls: 't-ok', txt: `${etqUnidad(dif, u)} adelante` } : { cls: 't-dan', txt: `${etqUnidad(-dif, u)} atrás` },
    fin: d.estimada === 'completo' ? { tipo: 'completo' } : d.estimada ? { tipo: 'fecha', f: d.estimada, vs: dias(d.finM, d.estimada) } : { tipo: 'sin-ritmo', unidades: u === 'h' ? 'horas' : 'actividades' },
  };
}

/** Filas de la tabla semanal (cada 7 días, hoy y el fin de la meta) */
export function filasAvance(d: DatosAvance): { f: string; marca: string; real: number | null; ideal: number; dif: number | null }[] {
  const fs: string[] = []; for (let i = 0; i < d.nDias; i += 7) fs.push(addDias(d.ini, i));
  if (d.hastaReal && !fs.includes(d.hastaReal) && d.hastaReal <= d.finX) fs.push(d.hastaReal);
  if (!fs.includes(d.finM)) fs.push(d.finM);
  fs.sort();
  const realEn = (f: string) => { const r = d.real.filter(p => p.f <= f); return f > (d.hastaReal || '') ? null : r.length ? r[r.length - 1].v : 0; };
  return fs.map(f => { const rv = realEn(f), iv = d.ideal(f); return { f, marca: f === d.hastaReal ? ' (hoy)' : f === d.finM ? ' (fin meta)' : '', real: rv, ideal: iv, dif: rv == null ? null : rv - iv }; });
}

const pasoBonito = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v))), r = v / p; return (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * p; };

/** Geometría del gráfico (coordenadas del viewBox) */
export function geometriaAvance(d: DatosAvance, compacta = false) {
  const W = compacta ? 380 : 920, H = compacta ? 250 : 290, m = compacta ? { l: 34, r: 58, t: 22, b: 28 } : { l: 46, r: 92, t: 22, b: 30 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const paso = d.total <= 5 ? 1 : pasoBonito(d.total / 4), maxY = Math.max(paso, Math.ceil(d.total / paso) * paso);
  const x = (f: string) => m.l + dias(d.ini, f) / Math.max(1, d.nDias - 1) * pw, y = (v: number) => m.t + ph - v / maxY * ph;
  const yTicks: { v: number; y: number }[] = []; for (let v = 0; v <= maxY + 1e-9; v += paso) yTicks.push({ v, y: y(v) });
  let pasoX = Math.ceil(d.nDias / (compacta ? 4 : 7)); if (pasoX > 3) pasoX = Math.ceil(pasoX / 7) * 7;
  const xTicks: { f: string; x: number }[] = []; for (let i = 0; i < d.nDias; i += pasoX) { const f = addDias(d.ini, i); xTicks.push({ f, x: x(f) }); }
  const idealPath = `M${x(d.ini)},${y(0)} L${x(d.finM)},${y(d.total)} ${d.finX > d.finM ? `L${x(d.finX)},${y(d.total)}` : ''}`;
  let realPath = '', realArea = '', proy: string | null = null, ultimo: { x: number; y: number; v: number } | null = null;
  if (d.real.length) {
    realPath = `M${x(d.real[0].f)},${y(d.real[0].v)}`;
    for (let i = 1; i < d.real.length; i++) realPath += ` H${x(d.real[i].f)} V${y(d.real[i].v)}`;
    const ult = d.real[d.real.length - 1];
    realArea = `${realPath} V${y(0)} H${x(d.real[0].f)} Z`;
    if (d.estimada && d.estimada !== 'completo' && d.ritmo > 0) {
      const fe = d.estimada <= d.finX ? d.estimada : d.finX, ve = Math.min(d.total, ult.v + d.ritmo * dias(ult.f, fe));
      proy = `M${x(ult.f)},${y(ult.v)} L${x(fe)},${y(ve)}`;
    }
    ultimo = { x: x(ult.f), y: y(ult.v), v: ult.v };
  }
  return { W, H, m, pw, ph, maxY, yTicks, xTicks, x, y, idealPath, realPath, realArea, proy, ultimo, xMeta: x(d.finM), xIni: x(d.ini), xHoy: d.hastaReal && d.hastaReal <= d.finX ? x(d.hastaReal) : null, yTotal: y(d.total) };
}

/** El resumen del avance como texto plano (para el reporte en Markdown) */
export function resumenAvanceTxt(d: DatosAvance): string {
  const r = resumenAvance(d), f = (s: string) => new Date(s + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  if (r.tipo === 'texto') return r.txt.replace(/(\d{4}-\d{2}-\d{2})/, m => f(m));
  let t = `Hoy: ${r.actual} de ${r.total} terminadas; lo ideal serían ${r.ideal} · ${r.dif.txt}`;
  if (r.fin.tipo === 'completo') t += ' · ¡Todo terminado!';
  else if (r.fin.tipo === 'fecha') t += ` · Al ritmo actual se terminaría el ${f(r.fin.f)}${r.fin.vs > 0 ? ` (${r.fin.vs} ${r.fin.vs === 1 ? 'día' : 'días'} después de la meta)` : r.fin.vs < 0 ? ` (${-r.fin.vs} ${-r.fin.vs === 1 ? 'día' : 'días'} antes de la meta)` : ' (justo en la meta)'}`;
  else t += ` · Aún no hay ${r.fin.unidades} terminadas para estimar el ritmo.`;
  return t + '.';
}
