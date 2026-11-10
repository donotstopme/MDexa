import { ALIAS_ESTADO, ALIAS_PRI, COLORES_ETQ, MAX_BITACORA, REPITE, TAMANOS, VERSION_MDEXA, VERSION_TXT } from './constantes';
import type { Actividad, ColorEtiqueta, Documento, Estado, Tamano } from './tipos';
import { detalleBit, leerEntradaBit } from './bitacora';
import { leerDeps, txtDeps } from './dependencias';
import { etqs, leerEtqs, todasEtq } from './etiquetas';
import { leerRepite } from './recurrencia';
import { EST, limpiaSub, normaliza, subtareasDe } from './utilidades';

/*
 * Formato del archivo:
 *   - Proyecto: ...    - Meta inicio: AAAA-MM-DD    - Meta fin: AAAA-MM-DD
 *   - En edición: Nombre | desde | último latido     (sólo mientras alguien edita)
 *   | ID | Negocio | Actividad | Tamaño | Prioridad | Responsable | Inicio | Fin | Estado | Terminada | Etiquetas | Depende de | Repite |
 *   ## Etiquetas · ## Notas · ## Subtareas · ## Imágenes · ## Bitácora · (otras ## se conservan)
 */
export function parseMD(txt: string): Documento {
  const acts: Actividad[] = [], meta: Documento['meta'] = { proyecto: '', inicio: '', fin: '', version: 0 };
  const notas: Documento['notas'] = [], bitacora: Documento['bitacora'] = [], extra: string[] = [];
  const coloresEtq: Record<string, ColorEtiqueta> = {}, imagenes: Documento['imagenes'] = [];
  const subsPorAct: Record<number, { t: string; ok: boolean }[]> = {};
  let candado: Documento['candado'] = null, cols: string[] | null = null;
  let enNotas = false, enBit = false, enEtq = false, enImg = false, enSub = false, enOtra = false;

  for (const linea of txt.split(/\r?\n/)) {
    const l = linea.trim();
    if (/^#{1,6}\s/.test(l)) {
      const t = normaliza(l);
      enNotas = /^##\s+notas\b/.test(t); enBit = /^##\s+bitacora\b/.test(t); enEtq = /^##\s+etiquetas\s*$/.test(t);
      enImg = /^##\s+imagenes\s*$/.test(t); enSub = /^##\s+subtareas\s*$/.test(t);
      enOtra = /^##\s/.test(l) && !enNotas && !enBit && !enEtq && !enImg && !enSub;
      if (enOtra) extra.push(linea.replace(/\s+$/, ''));
      continue;
    }
    if (enOtra) { extra.push(linea.replace(/\s+$/, '')); continue; }
    if (enSub) {
      const ms = l.match(/^[-*]\s*#(\d+)\s*\[([ xX])\]\s?(.*)$/);
      if (ms && ms[3].trim()) { const k = +ms[1]; (subsPorAct[k] = subsPorAct[k] || []).push({ t: ms[3].trim(), ok: ms[2] !== ' ' }); }
      continue;
    }
    if (enImg) {
      const mi = l.match(/^[-*]\s*#(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*!\[(.*?)\]\((.+?)\)\s*$/);
      if (mi) {
        let ruta = mi[5];
        try { ruta = decodeURI(ruta); } catch { /* se deja tal cual */ }
        imagenes.push({ act: +mi[1], fecha: mi[2], autor: mi[3] || 'Sin nombre', nombre: mi[4], archivo: ruta });
      }
      continue;
    }
    if (enEtq) {
      const me = l.match(/^[-*]\s*(.+?)\s*\|\s*(\w+)\s*$/);
      if (me && (COLORES_ETQ as Record<string, string>)[normaliza(me[2])]) coloresEtq[normaliza(me[1])] = normaliza(me[2]) as ColorEtiqueta;
      continue;
    }
    if (enBit) {
      const mb = l.match(/^[-*]\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*#(\d+|-)\s*\|\s*([^|]+?)\s*\|\s?(.*)$/);
      if (mb) bitacora.push(leerEntradaBit(mb));
      continue;
    }
    if (enNotas) {
      const mn = l.match(/^[-*]\s*#(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s?(.*)$/);
      if (mn) notas.push({ act: +mn[1], fecha: mn[2], autor: mn[3] || 'Sin nombre', texto: mn[4].replace(/<br\s*\/?>/gi, '\n') });
      continue;
    }
    if (!l.startsWith('|')) {
      const mm = l.match(/^[-*]\s*([^:]+?)\s*:\s*(.*)$/);
      if (!mm) continue;
      const k = normaliza(mm[1]), v = mm[2].trim();
      if (k === 'proyecto') meta.proyecto = v;
      else if (k === 'meta inicio') meta.inicio = v;
      else if (k === 'meta fin') meta.fin = v;
      else if (k === 'version de mdexa' || k === 'version del gestor') { // la 2.ª es la clave anterior: se sigue leyendo
        meta.version = parseInt(v, 10) || 0; meta.versionTxt = (v.match(/v(\d+\.\d+\.\d+)/) || [])[1] || ''; }
      else if (k === 'en edicion') {
        const p = v.split('|').map(s => s.trim());
        if (p[0]) candado = { usuario: p[0], desde: p[1] || '', latido: p[2] || p[1] || '' };
      }
      continue;
    }
    const celdas = l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(s => s.trim().replace(/<br\s*\/?>/gi, '\n'));
    if (celdas.every(x => /^:?-{2,}:?$/.test(x))) continue;
    const n = celdas.map(normaliza);
    if (n.includes('actividad')) { cols = n; continue; }
    if (!cols) cols = ['id', 'actividad', 'responsable', 'inicio', 'fin', 'estado'];
    const c = cols;
    const g = (k: string) => { const i = c.indexOf(k); return i >= 0 ? (celdas[i] || '') : ''; };
    if (!g('actividad')) continue;
    const estado: Estado = ALIAS_ESTADO[normaliza(g('estado'))] || 'Backlog';
    const tam = g('tamano').toUpperCase();
    acts.push({
      id: parseInt(g('id')) || 0, negocio: g('negocio'), actividad: g('actividad'),
      tamano: (TAMANOS as Record<string, unknown>)[tam] ? (tam as Tamano) : '',
      prioridad: ALIAS_PRI[normaliza(g('prioridad'))] || '',
      etiquetas: leerEtqs(g('etiquetas')), depende: leerDeps(g('depende de')), repite: leerRepite(g('repite')),
      responsable: g('responsable'), inicio: g('inicio'), fin: g('fin'),
      estado, terminada: estado === 'Terminado' ? g('terminada') : '',
    });
  }
  acts.forEach(a => { if (subsPorAct[a.id]) a.subtareas = subsPorAct[a.id]; });
  let max = Math.max(0, ...acts.map(a => a.id));
  acts.forEach(a => { if (!a.id) a.id = ++max; });
  while (extra.length && !extra[extra.length - 1].trim()) extra.pop();
  return { actividades: acts, meta, candado, notas, bitacora, extra, coloresEtq, imagenes };
}

export function toMD(doc: Documento, version: { num: number; txt: string } = { num: VERSION_MDEXA, txt: VERSION_TXT }): string {
  const { actividades, meta, candado, notas, bitacora, extra, coloresEtq, imagenes } = doc;
  const limpia = (s: unknown) => String(s ?? '').replace(/\|/g, '/').trim().replace(/\r?\n/g, '<br>');
  let md = `# ${limpia(meta.proyecto) || 'Actividades'}\n\n`;
  md += `- Proyecto: ${limpia(meta.proyecto)}\n- Meta inicio: ${meta.inicio || ''}\n- Meta fin: ${meta.fin || ''}\n- Versión de MDexa: ${version.num} (v${version.txt})\n`;
  if (candado) md += `- En edición: ${limpia(candado.usuario)} | ${candado.desde} | ${candado.latido}\n`;
  md += '\n| ID | Negocio | Actividad | Tamaño | Prioridad | Responsable | Inicio | Fin | Estado | Terminada | Etiquetas | Depende de | Repite |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n';
  for (const a of [...actividades].sort((x, y) => x.id - y.id))
    md += `| ${a.id} | ${limpia(a.negocio)} | ${limpia(a.actividad)} | ${a.tamano || ''} | ${a.prioridad || ''} | ${limpia(a.responsable)} | ${a.inicio || ''} | ${a.fin || ''} | ${EST(a)} | ${a.terminada || ''} | ${limpia(etqs(a).join(', '))} | ${txtDeps(actividades, a)} | ${(a.repite && REPITE[a.repite]) || ''} |\n`;
  const todas = todasEtq(actividades), usadas = new Set(todas.map(normaliza));
  const colores = Object.entries(coloresEtq).filter(([k]) => usadas.has(k));
  if (colores.length) md += '\n## Etiquetas\n\n' + colores.map(([k, c]) => `- ${limpia(todas.find(t => normaliza(t) === k) || k)} | ${c}`).join('\n') + '\n';
  if (extra.length) md += '\n' + extra.join('\n') + '\n';
  const ids = new Set(actividades.map(a => a.id)), nv = notas.filter(n => ids.has(n.act));
  if (nv.length) {
    md += '\n## Notas\n\n';
    for (const n of [...nv].sort((x, y) => x.act - y.act || x.fecha.localeCompare(y.fecha)))
      md += `- #${n.act} | ${n.fecha} | ${limpia(n.autor)} | ${String(n.texto).trim().replace(/\r?\n/g, '<br>')}\n`;
  }
  const conSubs = [...actividades].sort((x, y) => x.id - y.id).filter(a => subtareasDe(a).length);
  if (conSubs.length) {
    md += '\n## Subtareas\n\n';
    for (const a of conSubs) for (const x of subtareasDe(a)) md += `- #${a.id} [${x.ok ? 'x' : ' '}] ${limpiaSub(x.t)}\n`;
  }
  const iv = imagenes.filter(x => ids.has(x.act));
  if (iv.length) {
    md += '\n## Imágenes\n\n';
    for (const x of [...iv].sort((a, b) => a.act - b.act || a.fecha.localeCompare(b.fecha)))
      md += `- #${x.act} | ${x.fecha} | ${limpia(x.autor)} | ![${limpia(x.nombre).replace(/[\[\]]/g, '')}](${encodeURI(x.archivo)})\n`;
  }
  if (bitacora.length) {
    md += '\n## Bitácora\n\n';
    for (const e of bitacora.slice(-MAX_BITACORA)) md += `- ${e.fecha} | ${limpia(e.autor)} | #${e.act ?? '-'} | ${e.accion} | ${detalleBit(e)}\n`;
  }
  return md;
}
