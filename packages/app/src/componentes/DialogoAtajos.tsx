import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

export const ATAJOS: [string, [string[], string][]][] = [
  ['General', [[['N'], 'Nueva actividad (con el archivo tomado)'], [['/'], 'Ir al buscador de actividades'], [['?'], 'Ver esta lista de atajos'], [['F'], 'Pantalla completa (otra vez F para salir; Esc cierra primero las ventanas abiertas)'],
    [['P'], 'Modo presentación para juntas'], [['Ctrl', 'S'], 'Guardar ahora (con el archivo tomado)'], [['Esc'], 'Cerrar una ventana · en el buscador, borrar lo escrito']]],
  ['Vistas', [[['1'], 'Lista'], [['2'], 'Línea de tiempo'], [['3'], 'Tablero'], [['4'], 'Calendario'], [['5'], 'Mis actividades'], [['6'], 'Carga por persona']]],
  ['Editar', [[['Ctrl', 'Z'], 'Deshacer el último cambio'], [['Ctrl', 'Y'], 'Rehacer'], [['Ctrl', 'Enter'], 'Guardar la actividad o la nota en su ventana'], [['Enter'], 'En la tabla, confirmar lo que escribiste'], [['@'], 'En una nota, mencionar a alguien']]],
  ['Presentación', [[['←'], 'Negocio anterior'], [['→'], 'Negocio siguiente'], [['+'], 'Letra más grande'], [['−'], 'Letra más chica'], [['Esc'], 'Salir']]],
];

export function DialogoAtajos({ onCerrar }: { onCerrar(): void }) {
  return (
    <Dialogo onCerrar={onCerrar}>
      <h2><Ico n="teclado" t={20} /> Atajos de teclado</h2>
      <div>{ATAJOS.map(([tit, l]) => (
        <div key={tit}><h3 className="atj-h">{tit}</h3>
          <table className="atj"><tbody>{l.map(([k, d]) => <tr key={k.join('+') + d}><td>{k.map((x, i) => <span key={i}>{i > 0 && '+'}<kbd>{x}</kbd></span>)}</td><td>{d}</td></tr>)}</tbody></table></div>))}</div>
      <div className="pie"><span className="ayuda">Funcionan cuando no estás escribiendo en un campo.</span><div className="barra"><button type="button" onClick={onCerrar}>Cerrar</button></div></div>
    </Dialogo>
  );
}
