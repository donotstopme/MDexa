import {
  avanceSubs, choqueFechas, cerrada, deps, EST, etqs, colorEtq, nomCorto, PRIORIDADES, TAMANOS, trozosResaltado, bloqueada, descRepite,
  type Actividad, type Documento, type Novedades, type Prioridad, type Tamano,
} from '@gestor/core';
import { Ico } from './iconos';

export const fmtTxt = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
export const fmtCorta = (d: string) => (d ? new Date(d + 'T00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '');
export const fmtHora = (iso: string) => (iso ? new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
export const hace = (iso: string) => { const m = Math.round((Date.now() - Date.parse(iso)) / 60e3); return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 60)} h`; };
export const colorEstado = (e: string) => ({ Backlog: 'gris', Planeado: 'azul', 'En progreso': 'amar', Terminado: 'verde', Cancelado: 'rojo' } as Record<string, string>)[e] || 'gris';
export const Nd = () => <span className="nd">—</span>;
export const Fecha = ({ d }: { d: string }) => (d ? <>{fmtTxt(d)}</> : <Nd />);

export function IcoTam({ t }: { t: Tamano }) {
  const n = TAMANOS[t]?.n || 0;
  return <svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => { const h = 4 + i * 2.5; return <rect key={i} x={i * 4.6} y={14 - h} width="3.2" height={h} rx="1" fill="currentColor" opacity={i < n ? 1 : 0.2} />; })}</svg>;
}
export const TamBadge = ({ t }: { t: Tamano | '' }) => t && TAMANOS[t]
  ? <span className={`tam tam-${t}`} title={`${t}: ${TAMANOS[t].txt}`}><IcoTam t={t} /><b>{t}</b>{t === 'XL' ? ' ⚠' : ''}</span> : <Nd />;

const PATH_PRI: Record<string, string> = { Alta: 'M3 8.5l5-5 5 5M3 13l5-5 5 5', Media: 'M3 6h10M3 10.5h10', Baja: 'M3 5.5l5 5 5-5' };
export const IcoPri = ({ p }: { p: string }) => PATH_PRI[p]
  ? <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d={PATH_PRI[p]} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null;
export const PriBadge = ({ p, corto = false }: { p: Prioridad | ''; corto?: boolean }) => p && PRIORIDADES[p]
  ? <span className={`pri pri-${p}`} title={`Prioridad ${p}: ${PRIORIDADES[p].d}`}><IcoPri p={p} />{!corto && <b>{p}</b>}</span> : corto ? null : <Nd />;

export const ChipEstado = ({ e }: { e: string }) => <span className={`chip es-${colorEstado(e)}`}>{e}</span>;

export const Resaltar = ({ texto, pals }: { texto: string; pals: string[] }) => (
  <>{trozosResaltado(texto, pals).map((x, i) => (x.marca ? <mark key={i} className="busq">{x.t}</mark> : <span key={i}>{x.t}</span>))}</>
);

export const EtqPill = ({ t, doc, onClick }: { t: string; doc: Documento; onClick?(t: string): void }) => (
  <span className={`etq etq-${colorEtq(t, doc.coloresEtq)}`} title={`Etiqueta «${t}»${onClick ? ' · clic para filtrar' : ''}`} onClick={onClick ? e => { e.stopPropagation(); onClick(t); } : undefined}>{t}</span>
);

export function Etqs({ a, doc, onFiltrar, onEditar }: { a: Actividad; doc: Documento; onFiltrar?(t: string): void; onEditar?(el: HTMLElement): void }) {
  const l = etqs(a);
  if (!l.length && !onEditar) return null;
  return <span className="etqs">{l.map(t => <EtqPill key={t} t={t} doc={doc} onClick={onFiltrar} />)}
    {onEditar && <button className={`etq-btn ${l.length ? '' : 'vacia'}`} title="Etiquetas" aria-label="Etiquetas" onClick={e => { e.stopPropagation(); onEditar(e.currentTarget); }}><Ico n="etiqueta" t={13} /></button>}</span>;
}

export function ChipRepite({ a }: { a: Actividad }) {
  if (!a.repite) return null;
  return <span className="rep-chip" title={`Actividad recurrente: ${descRepite(a)}. Al terminarla se crea sola la siguiente.`}><Ico n="repetir" t={12} />{descRepite(a)}</span>;
}

export function ChipsDeps({ a, doc, onIr }: { a: Actividad; doc: Documento; onIr?(id: number): void }) {
  const acts = doc.actividades, l = deps(acts, a).map(id => acts.find(x => x.id === id)!);
  if (!l.length) return null;
  const choque = new Set(choqueFechas(acts, a).map(d => d.id));
  return <span className="deps">{l.map(d => {
    const ok = cerrada(d), bloq = !cerrada(a) && !ok;
    const tip = `Depende de #${d.id}: ${nomCorto(d)} (${EST(d)}${d.fin ? ', fin ' + fmtTxt(d.fin) : ''})${bloq ? '\nAún no termina: esta actividad está bloqueada' : ''}${choque.has(d.id) ? '\nOjo: esta actividad empieza antes de que termine #' + d.id : ''}\nClic para ir a #${d.id}`;
    return <button key={d.id} type="button" className={`dep ${ok ? 'ok' : bloq ? 'bloq' : ''} ${choque.has(d.id) ? 'choque' : ''}`} title={tip} onClick={e => { e.stopPropagation(); onIr?.(d.id); }}>
      <Ico n={ok ? 'check' : bloq ? 'candado' : 'cadena'} t={11} />#{d.id}</button>;
  })}</span>;
}

export function BotonSubs({ a, onClick }: { a: Actividad; onClick?(el: HTMLElement): void }) {
  const { h, n } = avanceSubs(a);
  if (!n) return <button className="nota-btn sub-btn vacia" title="Agregar subtareas" aria-label="Subtareas" onClick={e => { e.stopPropagation(); onClick?.(e.currentTarget); }}><Ico n="checklist" t={14} /></button>;
  return <button className={`sub-chip ${h === n ? 'listo' : ''}`} title={`Subtareas: ${h} de ${n} listas · clic para verlas`} onClick={e => { e.stopPropagation(); onClick?.(e.currentTarget); }}>
    <Ico n="checklist" t={13} /><span>{h}/{n}</span><span className="sub-bar"><i style={{ width: `${Math.round(h / n * 100)}%` }} /></span></button>;
}

export function BotonNotas({ a, doc, nuevas = 0, onClick }: { a: Actividad; doc: Documento; nuevas?: number; onClick?(): void }) {
  const n = doc.notas.filter(x => x.act === a.id).length;
  if (!n) return <button className="nota-btn vacia" title="Agregar una nota" aria-label="Agregar una nota" onClick={e => { e.stopPropagation(); onClick?.(); }}><Ico n="nota" t={14} /></button>;
  return <button className={`nota-btn con ${nuevas ? 'nueva' : ''}`} title={`${n} ${n === 1 ? 'nota' : 'notas'}${nuevas ? ` · ${nuevas} ${nuevas === 1 ? 'nueva' : 'nuevas'}` : ''}`} aria-label="Notas" onClick={e => { e.stopPropagation(); onClick?.(); }}><Ico n="nota" t={14} /><span>{n}</span></button>;
}

export function BotonImgs({ a, doc, onClick }: { a: Actividad; doc: Documento; onClick?(): void }) {
  const n = doc.imagenes.filter(x => x.act === a.id).length;
  return <button className={`nota-btn img-btn ${n ? 'con' : 'vacia'}`} title={n ? `${n} ${n === 1 ? 'imagen' : 'imágenes'}` : 'Agregar imágenes'} aria-label="Imágenes" onClick={e => { e.stopPropagation(); onClick?.(); }}><Ico n="imagen" t={14} />{n > 0 && <span>{n}</span>}</button>;
}

export function MarcaNov({ nov }: { nov?: Novedades['porId'][number] }) {
  if (!nov) return null;
  return <span className={`nov-mark ${nov.tipo}`} title={nov.tipo === 'nueva' ? 'Nueva desde tu última visita' : 'Cambió desde tu última visita'}>{nov.tipo === 'nueva' ? 'Nueva' : 'Cambió'}</span>;
}

export const esBloqueada = bloqueada;

export const haceLargo = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60e3);
  return m < 1 ? 'hace un momento' : m < 60 ? `hace ${m} min` : m < 24 * 60 ? `hace ${Math.round(m / 60)} h` : fmtHora(iso);
};
