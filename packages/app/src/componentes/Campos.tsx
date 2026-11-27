import { Ico } from '../original/iconos';

/** Título de un campo de formulario, con el mismo ícono que usan la tabla, los filtros y la barra de selección */
export const CampoTit = ({ ico, req, children }: { ico: string; req?: boolean; children: React.ReactNode }) => (
  <span className="campo-tit"><Ico n={ico} t={14} />{children}{req && <b>*</b>}</span>
);

/** Elección de una sola opción como botones de colores; son radios, así que las flechas del teclado funcionan */
export function Opciones<T extends string>({ nombre, etiqueta, valor, opciones, onChange }: {
  nombre: string; etiqueta: string; valor: T; opciones: { v: T; c: string; n: React.ReactNode; t?: string }[]; onChange(v: T): void;
}) {
  return (
    <div className="opc" id={nombre} role="radiogroup" aria-label={etiqueta}>
      {opciones.map(o => (
        <label key={o.v || '-'} className="opc-it" title={o.t}>
          <input type="radio" name={nombre} value={o.v} checked={valor === o.v} aria-label={o.v ? undefined : o.t} onChange={() => onChange(o.v)} />
          <span className={o.c}>{o.n}</span></label>))}
    </div>
  );
}
