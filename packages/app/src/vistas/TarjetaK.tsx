import { EST, cerrada, nomCorto, negocioDe, vencida, type Actividad, type Documento, type Estado, type Novedades } from '@mdexa/core';
import { Estrella, Ico } from '../original/iconos';
import { BotonImgs, BotonNotas, BotonSubs, ChipEstado, ChipRepite, ChipsDeps, Etqs, MarcaNov, PriBadge, Resaltar, TamBadge, colorEstado, fmtCorta } from '../original/piezas';
import { CAMPOS_NOV } from '@mdexa/core';
import type { Acciones, Seleccion } from './acciones';
import { CajaSel } from './Cajas';

export interface PropsTarjeta {
  a: Actividad; doc: Documento; tagNeg?: boolean; mostrarEstado?: boolean; rapidas?: boolean; arrastrable?: boolean; editable: boolean;
  nov?: Novedades['porId'][number]; pals?: string[]; fav: boolean;
  onFav(): void; acc: Acciones; onAbrir(): void; onMover(id: number, e: Estado): void;
  onArrastrar?(id: number): void; onSoltar?(): void; sel?: Seleccion;
}

/** Tarjeta de actividad del Tablero y de Mis actividades (mismo marcado que el original) */
export function TarjetaK({ a, doc, tagNeg = false, mostrarEstado = false, rapidas = false, arrastrable = false, editable, nov, pals = [], fav, onFav, acc, onAbrir, onMover, onArrastrar, onSoltar, sel }: PropsTarjeta) {
  const est = EST(a), c = colorEstado(est), venc = vencida(a);
  const tip = `${a.actividad}${editable ? (arrastrable ? '\n\nArrastra a otra columna para cambiar el estado · clic para editar' : '\n\nClic para editar') : ''}`;
  return (
    <article className={`k-tarjeta ${venc ? 'venc' : ''} ${editable ? 'arr' : ''} ${sel?.ids.has(a.id) ? 'seleccionada' : ''}`} data-id={a.id} draggable={arrastrable} style={{ '--k': `var(--c-${c})` } as React.CSSProperties} title={tip}
      onClick={e => { if (editable && !(e.target as HTMLElement).closest('button')) onAbrir(); }}
      onDragStart={e => { if (!arrastrable) return; e.dataTransfer.setData('text/plain', String(a.id)); e.dataTransfer.effectAllowed = 'move'; onArrastrar?.(a.id); }}
      onDragEnd={() => onSoltar?.()}>
      {nov && <div className="k-nov"><MarcaNov nov={nov} />{nov.tipo === 'cambio' && <span className="nd">{nov.campos.map(x => CAMPOS_NOV[x.k]).join(', ')}</span>}</div>}
      <div className="k-sup">
        <CajaSel id={a.id} sel={sel} />
        <span className={`k-nom ${est === 'Cancelado' ? 'tachado' : ''}`}><Resaltar texto={a.actividad} pals={pals} /></span>
        <BotonNotas a={a} doc={doc} onClick={() => acc.notas(a.id)} /><BotonImgs a={a} doc={doc} onClick={() => acc.imgs(a.id)} />
        {!a.subtareas?.length && <BotonSubs a={a} onClick={el => acc.subs(a.id, el)} />}
        <button className={`estrella ${fav ? 'on' : ''}`} title={fav ? 'Quitar de mis favoritas' : 'Marcar como favorita (sólo para ti)'} draggable={false} onClick={onFav}><Estrella /></button>
      </div>
      {(tagNeg || mostrarEstado) && <div className="k-inf">{tagNeg && <span className="tag">{negocioDe(a)}</span>}{mostrarEstado && <ChipEstado e={est} />}</div>}
      {(a.etiquetas.length > 0 || a.depende.length > 0 || !!a.subtareas?.length || !!a.repite) && (
        <div className="k-etqs">{!!a.subtareas?.length && <BotonSubs a={a} onClick={el => acc.subs(a.id, el)} />}<ChipRepite a={a} /><ChipsDeps a={a} doc={doc} onIr={acc.ir} /><Etqs a={a} doc={doc} /></div>
      )}
      {(a.tamano || a.responsable || a.prioridad) && (
        <div className="k-inf"><PriBadge p={a.prioridad} corto />{a.tamano && <TamBadge t={a.tamano} />}{a.responsable && <span className="k-resp"><Ico n="usuario" t={12} /> {a.responsable}</span>}</div>
      )}
      {(a.inicio || a.fin) && <div className="k-fechas"><Ico n="calendario" t={12} /> {fmtCorta(a.inicio) || '—'} → {fmtCorta(a.fin) || '—'}{venc && <> <span className="chip venc">Vencida</span></>}</div>}
      {a.terminada && <div className="term">✓ Terminada {fmtCorta(a.terminada)}</div>}
      {rapidas && editable && !cerrada(a) && (
        <div className="k-rapidas">
          {est !== 'En progreso' && <button title="Pasar a En progreso" onClick={() => onMover(a.id, 'En progreso')}><Ico n="reloj" /> Iniciar</button>}
          <button className="ok" title="Marcar como Terminado (hoy)" onClick={() => onMover(a.id, 'Terminado')}><Ico n="check" /> Terminar</button>
        </div>
      )}
    </article>
  );
}
