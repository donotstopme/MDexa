import { ESTADOS, TAMANOS, SIN_NEGOCIO, SIN_RESP } from './constantes';
import type { Actividad, Documento, Estado } from './tipos';
import { analizarMeta, type AnalisisMeta } from './lista';
import { bloqueada, choqueFechas } from './dependencias';
import { datosAvance, etqUnidad, filasAvance, resumenAvanceTxt } from './avance';
import { EST, addDias, dias, hoy as hoyDe, medible, negocioDe, vencida } from './utilidades';

const ORDEN_TAM = Object.keys(TAMANOS);
export interface Resumen {
  k: string; l: ActR[]; total: number; comp: number; aTiempo: number; retraso: number; prog: number; plan: number; porIni: number; canc: number; venc: number; med: number; pct: number;
  tams: Record<string, number>; horas: number; horasHechas: number; horasFalta: number;
}
export type ActR = Actividad & { est: Estado; venc: boolean };
export interface Persona { autor: string; total: number; creo: number; cambio: number; termino: number; elimino: number; ultimo: string }
export interface AnalisisReporte extends AnalisisMeta {
  h: string; acts: ActR[]; comp: ActR[]; activas: ActR[]; canc: ActR[]; noTerm: ActR[]; venc: ActR[]; conRetrasoL: ActR[]; alertas: string[];
  porTam: { t: string; total: number; comp: number; horas: number }[]; horasTotal: number; horasHechas: number; porResp: Resumen[]; porNeg: Resumen[]; equipo: Persona[];
}

const horas = (l: Actividad[]) => l.reduce((s, a) => s + (a.tamano ? TAMANOS[a.tamano].h : 0), 0);
const tarde = (a: Actividad) => !!(a.fin && a.terminada && a.terminada > a.fin);
const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const fmtTxt = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

/** Resultado de una actividad terminada contra su fecha fin */
export function resultado(a: Actividad): { txt: string; cls: 't-ok' | 't-dan' } {
  if (!a.fin || !a.terminada) return { txt: 'Terminada', cls: 't-ok' };
  const r = dias(a.fin, a.terminada);
  return r > 0 ? { txt: `${pl(r, 'día', 'días')} tarde`, cls: 't-dan' } : { txt: r < 0 ? `A tiempo (${pl(-r, 'día', 'días')} antes)` : 'A tiempo', cls: 't-ok' };
}
/** Situación de una actividad abierta: vencida, sin fecha o cuánto falta */
export function situacion(a: { venc: boolean; fin: string }, h: string): { txt: string; cls: 't-dan' | 't-mut' | 't-warn' } {
  if (a.venc) return { txt: `Vencida hace ${pl(dias(a.fin, h), 'día', 'días')}`, cls: 't-dan' };
  if (!a.fin) return { txt: 'Sin fecha fin', cls: 't-mut' };
  const d = dias(h, a.fin);
  return d === 0 ? { txt: 'Vence hoy', cls: 't-warn' } : { txt: `Vence en ${pl(d, 'día', 'días')}`, cls: d <= 3 ? 't-warn' : 't-mut' };
}
/** Quién marcó una actividad como Terminado (según la bitácora) */
export const quienTermino = (d: Documento, id: number): string =>
  [...d.bitacora].reverse().find(e => e.act === id && e.campos.some(c => c.k === 'estado' && c.despues === 'Terminado'))?.autor || '';

/** Resumen por persona de los últimos 7 días, según la bitácora */
export function equipoBit(d: Documento, h: string): Persona[] {
  const desde = new Date(Date.parse(addDias(h, -6) + 'T00:00')).toISOString(), m = new Map<string, Persona>();
  d.bitacora.filter(e => e.fecha >= desde).forEach(e => {
    if (!m.has(e.autor)) m.set(e.autor, { autor: e.autor, total: 0, creo: 0, cambio: 0, termino: 0, elimino: 0, ultimo: '' });
    const r = m.get(e.autor)!; r.total++; r.ultimo = e.fecha > r.ultimo ? e.fecha : r.ultimo;
    if (e.accion === 'creó') r.creo++; else if (e.accion === 'eliminó') r.elimino++; else if (e.accion === 'cambió') r.cambio++;
    if (e.campos.some(c => c.k === 'estado' && c.despues === 'Terminado')) r.termino++;
  });
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/** Todo lo que necesita el reporte (avance, alertas, tamaño y esfuerzo, por responsable y por negocio) */
export function analizarReporte(d: Documento, h: string = hoyDe()): AnalisisReporte {
  const base = analizarMeta(d, h), meta = d.meta, A = d.actividades;
  const acts: ActR[] = A.map(a => ({ ...a, est: EST(a), venc: vencida(a, h) }));
  const canc = acts.filter(a => a.est === 'Cancelado'), activas = acts.filter(a => a.est !== 'Cancelado'), medibles = acts.filter(medible);
  const comp = acts.filter(a => a.est === 'Terminado').sort((a, b) => negocioDe(a).localeCompare(negocioDe(b), 'es') || (a.terminada || '').localeCompare(b.terminada || ''));
  const noTerm = activas.filter(a => a.est !== 'Terminado').sort((a, b) => {
    if (a.venc !== b.venc) return a.venc ? -1 : 1;
    if (!a.fin !== !b.fin) return a.fin ? -1 : 1;
    return (a.fin || '').localeCompare(b.fin || '') || negocioDe(a).localeCompare(negocioDe(b), 'es');
  });
  const venc = noTerm.filter(a => a.venc);
  const resumenDe = (k: string, l: ActR[]): Resumen => {
    const c = l.filter(a => a.est === 'Terminado'), r = c.filter(tarde).length, act = l.filter(medible);
    return {
      k, l, total: l.length, comp: c.length, aTiempo: c.length - r, retraso: r, prog: l.filter(a => a.est === 'En progreso').length, plan: l.filter(a => a.est === 'Planeado').length,
      porIni: l.filter(a => a.est === 'Backlog').length, canc: l.filter(a => a.est === 'Cancelado').length, venc: l.filter(a => a.venc).length, med: act.length,
      pct: act.length ? Math.round(c.length * 100 / act.length) : 0,
      tams: Object.fromEntries([...ORDEN_TAM, ''].map(t => [t, act.filter(a => (a.tamano || '') === t).length])),
      horas: horas(act), horasHechas: horas(c), horasFalta: horas(act.filter(a => a.est !== 'Terminado')),
    };
  };
  const agrupar = (fn: (a: ActR) => string, ultimo: string) => {
    const m = new Map<string, ActR[]>(); acts.forEach(a => { const k = fn(a); m.set(k, [...(m.get(k) ?? []), a]); });
    return [...m].sort(([a], [b]) => (a === ultimo ? 1 : b === ultimo ? -1 : a.localeCompare(b, 'es'))).map(([k, l]) => resumenDe(k, l));
  };
  const alertas: string[] = [], t = base.tiempo;
  const add = (l: unknown[], txt: (n: number) => string) => { if (l.length) alertas.push(txt(l.length)); };
  if (!t) alertas.push('El archivo no tiene meta de inicio y fin definida.');
  if (t && t.terminada && noTerm.length) alertas.push(`La meta terminó el ${fmtTxt(meta.fin)} y quedan ${pl(noTerm.length, 'actividad', 'actividades')} sin terminar.`);
  add(venc, n => `${pl(n, 'actividad está vencida', 'actividades están vencidas')}.`);
  add(noTerm.filter(a => bloqueada(A, a)), n => `${pl(n, 'actividad está bloqueada', 'actividades están bloqueadas')} esperando a otra que no ha terminado.`);
  add(noTerm.filter(a => choqueFechas(A, a).length), n => `${pl(n, 'actividad empieza', 'actividades empiezan')} antes de que termine la actividad de la que depende.`);
  add(noTerm.filter(a => a.tamano === 'XL'), n => `${pl(n, 'actividad es XL y debería', 'actividades son XL y deberían')} partirse en actividades más pequeñas.`);
  add(noTerm.filter(a => !a.tamano), n => `${pl(n, 'actividad sin terminar no tiene', 'actividades sin terminar no tienen')} tamaño.`);
  add(noTerm.filter(a => !a.responsable), n => `${pl(n, 'actividad sin terminar no tiene', 'actividades sin terminar no tienen')} responsable.`);
  add(noTerm.filter(a => !a.fin), n => `${pl(n, 'actividad sin terminar no tiene', 'actividades sin terminar no tienen')} fecha fin.`);
  if (meta.fin) add(activas.filter(a => a.fin && a.fin > meta.fin), n => `${pl(n, 'actividad termina', 'actividades terminan')} después de la meta (${fmtTxt(meta.fin)}).`);
  if (meta.inicio) add(activas.filter(a => a.inicio && a.inicio < meta.inicio), n => `${pl(n, 'actividad inicia', 'actividades inician')} antes de la meta (${fmtTxt(meta.inicio)}).`);
  const porTam = [...ORDEN_TAM, ''].map(tz => { const l = medibles.filter(a => (a.tamano || '') === tz); return { t: tz, total: l.length, comp: l.filter(a => a.est === 'Terminado').length, horas: horas(l) }; });
  return {
    ...base, h, acts, comp, activas, canc, noTerm, venc, conRetrasoL: comp.filter(tarde), alertas, porTam, horasTotal: horas(medibles), horasHechas: horas(comp),
    porResp: agrupar(a => a.responsable || SIN_RESP, SIN_RESP), porNeg: agrupar(negocioDe, SIN_NEGOCIO), equipo: equipoBit(d, h),
  };
}

/** Reporte en Markdown (sin la gráfica de avance, que todavía no está en esta versión) */
export function reporteMd(d: Documento, x: AnalisisReporte, o: { usuario?: string; ahora?: Date; nombreApp: string; version: string }): string {
  const c = (s: unknown) => String(s ?? '').replace(/\|/g, '/').replace(/\r?\n/g, '<br>');
  const fh = (iso: string) => (iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
  const ahora = (o.ahora ?? new Date()).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' }), t = x.tiempo, meta = d.meta;
  let m = `# ${meta.proyecto || 'Reporte de actividades'}\n\n_Reporte generado el ${ahora}${o.usuario ? ' por ' + o.usuario : ''} con ${o.nombreApp} v${o.version}._\n\n## Resumen general\n\n`;
  m += t ? `- **Meta:** ${fmtTxt(meta.inicio)} → ${fmtTxt(meta.fin)} (${pl(t.totalD, 'día', 'días')})\n- **Tiempo transcurrido:** ${t.pct}%\n` : `- **Meta:** sin definir\n`;
  m += `- **Avance:** ${x.terminadas} de ${x.medibles} actividades terminadas (${x.pctAv}%, sin contar backlog ni canceladas)\n`;
  if (x.ritmo) m += `- **Ritmo:** ${x.ritmo.txt}. ${x.ritmo.det}\n`;
  m += `- ${ESTADOS.map(e => `${e}: ${x.cuenta[e]}`).join(' · ')} · Vencidas: ${x.venc.length} · Terminadas con retraso: ${x.conRetrasoL.length}\n`;
  m += `- **Esfuerzo estimado (máx.):** ${x.horasTotal} h · terminadas ${x.horasHechas} h · por hacer ${x.horasTotal - x.horasHechas} h\n`;
  const dav = datosAvance(d, 'act', x.h);
  if (dav && dav.total) m += `\n## Avance acumulado contra la meta\n\n${resumenAvanceTxt(dav)}\n\n| Fecha | Terminadas | Ideal | Diferencia |\n|---|---|---|---|\n` +
    filasAvance(dav).map(r => `| ${fmtTxt(r.f)}${r.marca} | ${r.real == null ? '—' : etqUnidad(r.real, 'act')} | ${etqUnidad(r.ideal, 'act')} | ${r.dif == null ? '—' : (r.dif > 0 ? '+' : '') + etqUnidad(r.dif, 'act')} |`).join('\n') + '\n';
  m += `\n## Alertas\n\n` + (x.alertas.length ? x.alertas.map(a => `- ${a}`).join('\n') : '- Sin alertas.') + '\n';
  const tabla = (titulo: string, lista: Resumen[], col: string) => `\n## ${titulo}\n\n| ${col} | Asignadas | Terminadas | A tiempo | Con retraso | En progreso | Planeadas | Backlog | Canceladas | Vencidas | Cumplimiento |\n|---|---|---|---|---|---|---|---|---|---|---|\n` +
    lista.map(r => `| ${c(r.k)} | ${r.total} | ${r.comp} | ${r.aTiempo} | ${r.retraso} | ${r.prog} | ${r.plan} | ${r.porIni} | ${r.canc} | ${r.venc} | ${r.pct}% |`).join('\n') + '\n';
  const nt = ORDEN_TAM.length;
  if (x.total) {
    m += tabla('Avance por responsable', x.porResp, 'Responsable') + tabla('Avance por negocio', x.porNeg, 'Negocio');
    m += `\n## Tamaño y esfuerzo\n\n| Tamaño | Significa | Actividades | Terminadas | Horas máx. |\n|---|---|---|---|---|\n` +
      x.porTam.filter(r => r.total).map(r => `| ${r.t || 'Sin tamaño'} | ${r.t ? TAMANOS[r.t as keyof typeof TAMANOS].txt : 'No se estimó'} | ${r.total} | ${r.comp} | ${r.t ? r.horas + ' h' : '—'} |`).join('\n') + '\n';
    m += `\n### Esfuerzo por responsable\n\n| Responsable | ${ORDEN_TAM.join(' | ')} | Sin tamaño | Horas máx. | Terminadas | Por hacer |\n|---|${'---|'.repeat(nt)}---|---|---|---|\n` +
      x.porResp.map(r => `| ${c(r.k)} | ${ORDEN_TAM.map(tz => r.tams[tz] || '').join(' | ')} | ${r.tams[''] || ''} | ${r.horas} h | ${r.horasHechas} h | ${r.horasFalta} h |`).join('\n') + '\n';
  }
  m += `\n## Actividades terminadas (${x.comp.length})\n\n`;
  m += x.comp.length ? '| Negocio | Actividad | Tamaño | Responsable | Fin planeado | Terminada | Resultado | Marcada por |\n|---|---|---|---|---|---|---|---|\n' +
    x.comp.map(a => `| ${c(negocioDe(a))} | ${c(a.actividad)} | ${a.tamano || '—'} | ${c(a.responsable || '—')} | ${fmtTxt(a.fin) || '—'} | ${fmtTxt(a.terminada) || '—'} | ${resultado(a).txt} | ${c(quienTermino(d, a.id) || '—')} |`).join('\n') + '\n'
    : '_Todavía no hay actividades terminadas._\n';
  m += `\n## Actividades sin terminar (${x.noTerm.length})\n\n`;
  m += x.noTerm.length ? '| Negocio | Actividad | Tamaño | Responsable | Inicio | Fin | Estado | Situación |\n|---|---|---|---|---|---|---|---|\n' +
    x.noTerm.map(a => `| ${c(negocioDe(a))} | ${c(a.actividad)} | ${a.tamano || '—'} | ${c(a.responsable || '—')} | ${fmtTxt(a.inicio) || '—'} | ${fmtTxt(a.fin) || '—'} | ${a.est} | ${situacion(a, x.h).txt} |`).join('\n') + '\n'
    : '_No hay actividades pendientes._\n';
  if (x.canc.length) m += `\n## Actividades canceladas (${x.canc.length})\n\n| Negocio | Actividad | Tamaño | Responsable |\n|---|---|---|---|\n` + x.canc.map(a => `| ${c(negocioDe(a))} | ${c(a.actividad)} | ${a.tamano || '—'} | ${c(a.responsable || '—')} |`).join('\n') + '\n';
  m += `\n## Quién hizo qué\n`;
  x.porResp.forEach(r => {
    m += `\n### ${r.k} — ${r.comp} de ${r.med} terminadas (${r.pct}%) · ${r.horasHechas} h de ${r.horas} h\n\n`;
    const hechas = r.l.filter(a => a.est === 'Terminado'), faltan = r.l.filter(a => a.est !== 'Terminado' && a.est !== 'Cancelado'), tz = (a: ActR) => (a.tamano ? `[${a.tamano}] ` : '');
    m += '**Terminó:**\n' + (hechas.length ? hechas.map(a => `- ${tz(a)}${a.actividad.split('\n')[0]} — ${negocioDe(a)}${a.terminada ? ' · ' + fmtTxt(a.terminada) : ''} (${resultado(a).txt})`).join('\n') : '- Nada terminado todavía.') + '\n';
    if (faltan.length) m += '\n**Tiene pendiente:**\n' + faltan.map(a => `- ${tz(a)}${a.actividad.split('\n')[0]} — ${negocioDe(a)} · ${a.est} (${situacion(a, x.h).txt})`).join('\n') + '\n';
  });
  const rec = d.notas.filter(n => x.acts.some(a => a.id === n.act) && n.fecha >= addDias(x.h, -14)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (rec.length) m += `\n## Notas de los últimos 14 días (${rec.length})\n\n| Fecha | Autor | Actividad | Nota |\n|---|---|---|---|\n` +
    rec.map(n => { const a = x.acts.find(y => y.id === n.act)!; return `| ${fh(n.fecha)} | ${c(n.autor)} | ${c(a.actividad.split('\n')[0])} | ${c(n.texto)} |`; }).join('\n') + '\n';
  if (x.equipo.length) m += `\n## Actividad del equipo (últimos 7 días)\n\n| Persona | Movimientos | Creó | Cambió | Terminó | Eliminó | Último movimiento |\n|---|---|---|---|---|---|---|\n` +
    x.equipo.map(r => `| ${c(r.autor)} | ${r.total} | ${r.creo} | ${r.cambio} | ${r.termino} | ${r.elimino} | ${fh(r.ultimo)} |`).join('\n') + '\n';
  return m;
}
