import { VERSION_TXT, candadoVigente, type Candado } from '@mdexa/core';
import { Ico } from '../original/iconos';
import { fmtHora, hace } from '../original/piezas';

export interface Props {
  hayArchivo: boolean; modo: 'lectura' | 'edicion'; masNuevo: boolean; versionArchivo: string; puedeEscribir: boolean;
  candado: Candado | null; usuario: string; guardado: Date | null; puedeDeshacer: boolean; puedeRehacer: boolean; textoDeshacer?: string;
  onTomar(): void; onSoltar(): void; onLiberar(): void; onDeshacer(): void; onRehacer(): void; onAbrir(): void; onManual?(): void;
}

/** Aviso de estado del archivo: quién lo edita y qué puedes hacer (mismos textos del original) */
export function Banner(p: Props) {
  let cls = '', icono = 'ojo', cuerpo: React.ReactNode, acciones: React.ReactNode = null;
  const c = p.candado, mio = !!c && c.usuario === p.usuario;
  if (!p.hayArchivo) {
    icono = 'carpeta';
    cuerpo = <div>Abre el <b>.md</b> compartido o crea uno nuevo para empezar. <span className="det">¿Primera vez? Consulta el <a href="#" onClick={e => { e.preventDefault(); p.onManual?.(); }}>manual de uso</a>.</span></div>;
    acciones = <div className="barra"><button className="prim" onClick={p.onAbrir}><Ico n="carpeta" /> Abrir .md</button></div>;
  } else if (p.masNuevo) {
    cls = 'otro'; icono = 'alerta';
    cuerpo = <div><b>Solo lectura: el archivo es de una versión más nueva de MDexa.</b> Lo guardó la v{p.versionArchivo} y tú tienes la v{VERSION_TXT}.
      <div className="det">Para no borrar información que esta versión no conoce, no se permite editar, comentar ni restaurar.</div></div>;
  } else if (!p.puedeEscribir) {
    cls = 'libre';
    cuerpo = <div>Solo lectura.<div className="det">Este navegador no puede bloquear ni escribir el archivo compartido; usa Chrome o Edge para trabajo en equipo.</div></div>;
  } else if (p.modo === 'edicion') {
    cls = 'mio'; icono = 'lapiz';
    cuerpo = <div><b>Estás editando.</b> Nadie más puede editar hasta que sueltes el archivo. Cada cambio se guarda al momento.
      <div className="det">{p.guardado ? 'Último guardado: ' + p.guardado.toLocaleTimeString('es-MX') : ''}</div></div>;
    acciones = <div className="barra">
      <button className="ico-btn" disabled={!p.puedeDeshacer} onClick={p.onDeshacer} title={p.puedeDeshacer ? `Deshacer ${p.textoDeshacer ?? ''} (Ctrl+Z)` : 'Nada que deshacer'} aria-label="Deshacer"><Ico n="deshacer" /></button>
      <button className="ico-btn" disabled={!p.puedeRehacer} onClick={p.onRehacer} title={p.puedeRehacer ? 'Rehacer (Ctrl+Y)' : 'Nada que rehacer'} aria-label="Rehacer"><Ico n="rehacer" /></button>
      <button className="prim" onClick={p.onSoltar}><Ico n="abierto" /> Soltar archivo</button></div>;
  } else if (c && mio) {
    cls = 'mio'; icono = 'lapiz';
    cuerpo = <div>El archivo sigue tomado a tu nombre desde {fmtHora(c.desde)}.<div className="det">Probablemente recargaste la página mientras editabas.</div></div>;
    acciones = <div className="barra"><button onClick={p.onLiberar}><Ico n="abierto" /> Soltar archivo</button><button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Continuar editando</button></div>;
  } else if (c && candadoVigente(c)) {
    cls = 'otro'; icono = 'candado';
    cuerpo = <div><b>{c.usuario}</b> está editando desde {fmtHora(c.desde)} (activo {hace(c.latido)}). Puedes ver, pero no editar.<div className="det">La vista se actualiza sola cada 15 segundos.</div></div>;
    acciones = <div className="barra"><button disabled><Ico n="candado" /> Tomar para editar</button></div>;
  } else if (c) {
    cls = 'otro'; icono = 'alerta';
    cuerpo = <div><b>{c.usuario}</b> tomó el archivo pero no tiene actividad desde {fmtHora(c.latido)}. Probablemente cerró sin soltarlo.</div>;
    acciones = <div className="barra"><button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Tomar de todos modos</button></div>;
  } else {
    cls = 'libre';
    cuerpo = <div>Solo lectura. Nadie está editando el archivo.<div className="det">La vista se actualiza sola cada 15 segundos.</div></div>;
    acciones = <div className="barra"><button className="prim" onClick={p.onTomar}><Ico n="lapiz" /> Tomar para editar</button></div>;
  }
  return <div id="banner" className={`banner ${cls}`}><span className="b-ico"><Ico n={icono} t={22} /></span>{cuerpo}{acciones}</div>;
}
