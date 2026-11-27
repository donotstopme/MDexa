import { VERSION_TXT, candadoVigente, type Candado } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { fmtHora, hace } from '../original/piezas';

export interface Props {
  hayArchivo: boolean; modo: 'lectura' | 'edicion'; masNuevo: boolean; versionArchivo: string; puedeEscribir: boolean;
  candado: Candado | null; usuario: string; guardado: Date | null; puedeDeshacer: boolean; puedeRehacer: boolean; textoDeshacer?: string;
  onTomar(): void; onSoltar(): void; onLiberar(): void; onDeshacer(): void; onRehacer(): void; onAbrir(): void; onManual?(): void;
  pendiente?: string; onAbrirPendiente?(): void;
}

/**
 * Estado del archivo, dentro de la barra superior: quién lo edita, desde cuándo y qué puedes hacer.
 * La clase (libre, mio, otro, solo) da el color a toda la cabecera; la explicación larga sale al pasar el cursor.
 */
/** Lo que se dice del archivo: lo usan la cabecera y el botón flotante */
export function describirEstado(p: Props) {
  let cls = 'libre', icono = 'ojo', titulo: React.ReactNode, detalle: React.ReactNode = null, ayuda = '', acciones: React.ReactNode = null;
  const c = p.candado, mio = !!c && c.usuario === p.usuario;
  if (!p.hayArchivo && p.pendiente) {
    icono = 'carpeta';
    titulo = <>Último consultado: <b>{p.pendiente}</b></>; detalle = 'Confirma el permiso para volver a leerlo';
    ayuda = 'El navegador pide confirmar el permiso para volver a leerlo.';
    acciones = <button className="prim" title={`Abrir ${p.pendiente}`} onClick={p.onAbrirPendiente}><Ico n="carpeta" /> Reabrir</button>;
  } else if (!p.hayArchivo) {
    icono = 'carpeta';
    titulo = <>Abre o crea un <b>.md</b> para empezar</>;
    detalle = <>¿Primera vez? Consulta el <a href="#" onClick={e => { e.preventDefault(); p.onManual?.(); }}>manual de uso</a></>;
  } else if (p.masNuevo) {
    cls = 'solo'; icono = 'alerta';
    titulo = <b>Solo lectura: versión más nueva</b>; detalle = `Archivo v${p.versionArchivo} · tienes la v${VERSION_TXT}`;
    ayuda = 'El archivo es de una versión más nueva de MDexa. Para no borrar información que esta versión no conoce, no se permite editar, comentar ni restaurar.';
  } else if (!p.puedeEscribir) {
    cls = 'solo';
    titulo = <b>Solo lectura</b>; detalle = 'Usa Chrome o Edge para editar';
    ayuda = 'Este navegador no puede bloquear ni escribir el archivo compartido; usa Chrome o Edge para trabajo en equipo.';
  } else if (p.modo === 'edicion') {
    cls = 'mio'; icono = 'lapiz';
    titulo = <b>Estás editando</b>; detalle = p.guardado ? 'Guardado ' + p.guardado.toLocaleTimeString('es-MX') : 'Cada cambio se guarda al momento';
    ayuda = 'Nadie más puede editar hasta que sueltes el archivo. Cada cambio se guarda al momento.';
    acciones = <>
      <button className="ico-btn" disabled={!p.puedeDeshacer} onClick={p.onDeshacer} title={p.puedeDeshacer ? `Deshacer ${p.textoDeshacer ?? ''} (Ctrl+Z)` : 'Nada que deshacer'} aria-label="Deshacer"><Ico n="deshacer" /></button>
      <button className="ico-btn" disabled={!p.puedeRehacer} onClick={p.onRehacer} title={p.puedeRehacer ? 'Rehacer (Ctrl+Y)' : 'Nada que rehacer'} aria-label="Rehacer"><Ico n="rehacer" /></button>
      <button className="prim" onClick={p.onSoltar}><Ico n="abierto" /> Soltar archivo</button></>;
  } else if (c && mio) {
    cls = 'mio'; icono = 'lapiz';
    titulo = <b>Tomado a tu nombre</b>; detalle = `Desde ${fmtHora(c.desde)}`;
    ayuda = 'El archivo sigue tomado a tu nombre. Probablemente recargaste la página mientras editabas.';
    acciones = <><button onClick={p.onLiberar}><Ico n="abierto" /> Soltar</button><button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Continuar editando</button></>;
  } else if (c && candadoVigente(c)) {
    cls = 'otro'; icono = 'candado';
    titulo = <><b>{c.usuario}</b> está editando</>; detalle = `Desde ${fmtHora(c.desde)} · activo ${hace(c.latido)}`;
    ayuda = 'Puedes ver, pero no editar. La vista se actualiza sola cada 15 segundos.';
    acciones = <button disabled><Ico n="candado" /> Tomar para editar</button>;
  } else if (c) {
    cls = 'otro'; icono = 'alerta';
    titulo = <><b>{c.usuario}</b> tomó el archivo</>; detalle = `Sin actividad desde ${fmtHora(c.latido)}`;
    ayuda = 'No tiene actividad: probablemente cerró sin soltarlo.';
    acciones = <button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Tomar de todos modos</button>;
  } else {
    titulo = <b>Libre para editar</b>; detalle = 'Nadie lo está editando';
    ayuda = 'Solo lectura. La vista se actualiza sola cada 15 segundos.';
    acciones = <button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Tomar para editar</button>;
  }
  // Texto corto del botón flotante: lo tuyo, o quién lo tiene
  const corto = cls === 'mio' ? (p.modo === 'edicion' ? 'Editando' : 'Tomado') : cls === 'otro' ? c?.usuario ?? '' : '';
  return { cls, icono, titulo, detalle, ayuda, acciones, corto };
}

export function Banner(p: Props) {
  const { cls, icono, titulo, detalle, ayuda, acciones } = describirEstado(p);
  return (
    <div id="banner" className={`estado ${cls}`} role="status">
      <span className="b-ico"><Ico n={icono} t={20} /></span>
      <div className="est-txt" title={ayuda || undefined}><span>{titulo}</span>{detalle && <span className="det">{detalle}</span>}</div>
      {acciones && <div className="est-acc">{acciones}</div>}
    </div>
  );
}
