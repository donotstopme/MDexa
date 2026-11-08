import type { Actividad, Documento } from './tipos';
import { analizarMeta, type AnalisisMeta } from './lista';
import { bloqueada, pendientesDe } from './dependencias';
import { EST, addDias, cerrada, dias, hoy as hoyDe, negocioDe, nomCorto, txtSubsDe } from './utilidades';

const fmtCorta = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '');
const fmtTxt = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const pl = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export interface DatosSemana {
  lunes: string; domingo: string; corte: string; pIni: string; pFin: string;
  terminadas: Actividad[]; atrasadas: Actividad[]; conRetraso: Actividad[]; enCurso: Actividad[]; viene: Actividad[]; bloq: Actividad[]; x: AnalisisMeta;
}

/** Qué pasó en una semana (`desp` 0 = esta, -1 = la pasada) y qué viene en la siguiente */
export function datosSemana(d: Documento, desp: number, h: string = hoyDe()): DatosSemana {
  const A = d.actividades, lunes = addDias(h, -((new Date(h + 'T00:00').getDay() + 6) % 7) + 7 * desp), domingo = addDias(lunes, 6);
  const corte = desp === 0 ? h : addDias(domingo, 1), pIni = addDias(lunes, 7), pFin = addDias(lunes, 13);
  const porNeg = (a: Actividad, b: Actividad) => negocioDe(a).localeCompare(negocioDe(b), 'es') || (a.fin || '9').localeCompare(b.fin || '9');
  const terminadas = A.filter(a => EST(a) === 'Terminado' && a.terminada >= lunes && a.terminada <= domingo).sort(porNeg);
  const atrasadas = A.filter(a => !cerrada(a) && a.fin && a.fin < corte).sort((a, b) => a.fin.localeCompare(b.fin));
  return {
    lunes, domingo, corte, pIni, pFin, terminadas, atrasadas, conRetraso: terminadas.filter(a => a.fin && a.terminada > a.fin),
    enCurso: A.filter(a => EST(a) === 'En progreso' && !atrasadas.includes(a)).sort(porNeg),
    viene: A.filter(a => !cerrada(a) && !atrasadas.includes(a) && ((a.fin && a.fin >= pIni && a.fin <= pFin) || (a.inicio && a.inicio >= pIni && a.inicio <= pFin))).sort(porNeg),
    bloq: A.filter(a => bloqueada(A, a)), x: analizarMeta(d, h),
  };
}

/** Texto del reporte semanal, en HTML con estilos en línea (para pegar en un correo) o en texto plano */
export function textoSemanal(doc: Documento, s: DatosSemana, html: boolean, o: { archivo: string; nombreApp: string; hoy?: string }): { titulo: string; cuerpo: string } {
  const meta = doc.meta, h = o.hoy ?? hoyDe(), A = doc.actividades;
  const rango = (a: string, b: string) => `${fmtCorta(a)} al ${fmtCorta(b)}`;
  const quien = (a: Actividad) => [negocioDe(a), a.responsable].filter(Boolean).join(' · ');
  const item = (a: Actividad, extra = '') => (html
    ? `<li><b>${esc(nomCorto(a))}</b> <span style="color:#667085">— ${esc(quien(a))}${extra ? ' · ' + esc(extra) : ''}</span></li>`
    : `  • ${nomCorto(a)} — ${quien(a)}${extra ? ' · ' + extra : ''}`);
  const sec = (tit: string, l: Actividad[], fn: (a: Actividad) => string, vacio: string) => (html
    ? `<h3 style="font-size:15px;margin:18px 0 6px">${tit} (${l.length})</h3>${l.length ? `<ul style="margin:0;padding-left:20px">${l.map(fn).join('')}</ul>` : `<p style="margin:0;color:#667085">${vacio}</p>`}`
    : `${tit.toUpperCase()} (${l.length})\n${l.length ? l.map(fn).join('\n') : '  ' + vacio}\n`);
  const diasAtraso = (a: Actividad) => dias(a.fin, s.corte > h ? h : s.corte);
  const titulo = `Avance semanal · ${meta.proyecto || o.archivo.replace(/\.md$/i, '')} · ${rango(s.lunes, s.domingo)}`;
  const resumen = `Avance del proyecto: ${s.x.pctAv}% (${s.x.terminadas} de ${s.x.medibles} actividades terminadas)${meta.fin ? ` · meta al ${fmtTxt(meta.fin)}` : ''}${s.x.ritmo ? ` · ${s.x.ritmo.txt}` : ''}.`;
  const partes = [
    sec('Terminadas esta semana', s.terminadas, a => item(a, a.fin && a.terminada > a.fin ? `terminó ${fmtCorta(a.terminada)}, ${pl(dias(a.fin, a.terminada), 'día', 'días')} tarde` : `terminó ${fmtCorta(a.terminada)}`), 'Ninguna.'),
    sec('Atrasadas', s.atrasadas, a => item(a, `vencía ${fmtCorta(a.fin)} · ${pl(diasAtraso(a), 'día', 'días')} de atraso · ${EST(a)}`), 'Ninguna. ¡Todo al día!'),
    ...(s.bloq.length ? [sec('Bloqueadas por otra actividad', s.bloq, a => item(a, `espera a ${pendientesDe(A, a).map(x => '#' + x.id + ' ' + nomCorto(x)).join(', ')}`), '')] : []),
    sec('En progreso', s.enCurso, a => item(a, a.fin ? `fin ${fmtCorta(a.fin)}${txtSubsDe(a) ? ' · subtareas ' + txtSubsDe(a) : ''}` : 'sin fecha fin'), 'Ninguna.'),
    sec(`Qué viene (${rango(s.pIni, s.pFin)})`, s.viene, a => item(a, a.inicio >= s.pIni && a.inicio <= s.pFin ? `inicia ${fmtCorta(a.inicio)}` : `vence ${fmtCorta(a.fin)}`), 'Nada programado.'),
  ];
  if (!html) return { titulo, cuerpo: `${titulo}\n\n${resumen}\n\n${partes.join('\n')}\n— Generado con ${o.nombreApp}` };
  return { titulo, cuerpo: `<div style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;color:#1c2430;line-height:1.45">
    <h2 style="font-size:18px;margin:0 0 6px">${esc(titulo)}</h2><p style="margin:0 0 4px">${esc(resumen)}</p>${partes.join('')}
    <p style="margin:18px 0 0;color:#98a2b3;font-size:12px">Generado con ${o.nombreApp}</p></div>` };
}
