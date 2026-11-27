import { borrarHito, claseHito, guardarHito, hitosOrdenados, hoy, infoHito, pl, porIncluir, type Documento, type Hito } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { fmtTxt } from '../original/piezas';
import { Dialogo } from './Dialogo';

export const COLOR_HITO = { Cumplido: 'es-verde', 'En tiempo': 'es-gris', 'En riesgo': 'es-amar', Vencido: 'es-rojo' } as const;

/** Lista de hitos con su avance; con el archivo tomado se pueden crear, cambiar y borrar */
export function DialogoHitos({ doc, usuario, editando, onNuevo, onEditarHito, onEditar, aviso, onCerrar }: {
  doc: Documento; usuario: string; editando: boolean; onNuevo(): void; onEditarHito(id: number): void; onEditar(fn: (d: Documento) => Documento): void; aviso(m: string): void; onCerrar(): void;
}) {
  const lista = hitosOrdenados(doc.hitos);
  const cambiar = (h: Hito, cambio: Partial<Hito>, ids: Set<number> | undefined, msg: string) => {
    onEditar(d => { const r = guardarHito(d, { ...h, ...cambio }, usuario, ids); return 'doc' in r ? r.doc : d; });
    aviso(msg);
  };
  const borrar = (h: Hito) => {
    const n = doc.actividades.filter(a => a.hito === h.id).length;
    if (!window.confirm(`¿Eliminar el hito «${h.nombre}»?${n ? `\n\n${pl(n, 'actividad se conserva', 'actividades se conservan')}, sin hito.` : ''}\n\nSe puede deshacer con Ctrl+Z.`)) return;
    onEditar(d => borrarHito(d, h.id, usuario)); aviso('Hito eliminado');
  };
  return (
    <Dialogo className="grande" onCerrar={onCerrar}>
      <div className="rep-barra">
        <strong><Ico n="bandera" t={18} /> Hitos <span className="nd" style={{ fontWeight: 400 }}>· {pl(lista.length, 'hito', 'hitos')}</span></strong>
        <div className="barra">{editando && <button onClick={onNuevo}><Ico n="mas" /> Nuevo hito</button>}<button className="prim" onClick={onCerrar}>Cerrar</button></div>
      </div>
      <div className="contenido">
        {!editando && <p className="nd">Toma el archivo para crear o cambiar hitos.</p>}
        {!lista.length && <p className="nd">Todavía no hay hitos. Un hito es un entregable con fecha; las actividades que incluye forman su fase.</p>}
        {!!lista.length && (
          <table>
            <thead><tr><th>Fecha</th><th>Hito</th><th>Negocios</th><th>Actividades</th><th>Avance</th><th>Estado</th>{editando && <th />}</tr></thead>
            <tbody>{lista.map(h => {
              const i = infoHito(doc, h, hoy()), faltan = porIncluir(doc, h);
              return (
                <tr key={h.id} data-hito={h.id}>
                  <td>{h.fecha ? fmtTxt(h.fecha) : '—'}</td>
                  <td className="txt"><i className={`hito-punto ${claseHito(h, i.estado)}`} />{h.nombre}
                    {h.descripcion && <div className="nd hito-desc">{h.descripcion}</div>}
                    {i.inicio && <div className="nd">Fase desde el {fmtTxt(i.inicio)}</div>}
                    {editando && !!faltan.length && <div className="hito-aviso">{pl(faltan.length, 'actividad más encaja', 'actividades más encajan')}
                      <button title={faltan.map(a => `#${a.id} ${a.actividad.split('\n')[0]}`).join('\n')} onClick={() => cambiar(h, {}, new Set([...doc.actividades.filter(a => a.hito === h.id), ...faltan].map(a => a.id)), `${pl(faltan.length, 'actividad agregada', 'actividades agregadas')} a «${h.nombre}»`)}>
                        <Ico n="mas" t={13} /> Incluir</button></div>}</td>
                  <td>{h.negocios.map(n => <span key={n} className="tag">{n}</span>)}</td>
                  <td>{i.hechas}/{i.total}</td>
                  <td>{i.pct}%</td>
                  <td><b className={COLOR_HITO[i.estado]}>{i.estado}</b><div className="nd">{i.detalle}</div></td>
                  {editando && <td className="acc">
                    {!h.cumplido && !i.total && <button className="ico-btn" title="Marcar como cumplido hoy" aria-label="Marcar como cumplido" onClick={() => cambiar(h, { cumplido: hoy() }, undefined, 'Hito cumplido')}><Ico n="check" /></button>}
                    <button className="ico-btn" title="Editar hito" aria-label="Editar hito" onClick={() => onEditarHito(h.id)}><Ico n="lapiz" /></button>
                    <button className="ico-btn peligro" title="Eliminar hito" aria-label="Eliminar hito" onClick={() => borrar(h)}><Ico n="basura" /></button></td>}
                </tr>
              );
            })}</tbody>
          </table>
        )}
      </div>
    </Dialogo>
  );
}
