import { useState } from 'react';
import { Ico } from '../original/iconos';
import { Dialogo } from './Dialogo';

export function DialogoExportar({ total, visibles, onExportar, onCerrar }: { total: number; visibles: number; onExportar(que: 'todas' | 'filtradas', conNotas: boolean): void; onCerrar(): void }) {
  const [que, setQue] = useState<'todas' | 'filtradas'>('todas'), [notas, setNotas] = useState(false);
  return (
    <Dialogo onCerrar={onCerrar}>
      <form noValidate onSubmit={e => { e.preventDefault(); onExportar(que, notas); }}>
        <h2><Ico n="descargar" t={20} /> Exportar a CSV</h2>
        <p>Un archivo que se abre directo en Excel, con acentos y fechas correctos.</p>
        <div className="m-opciones" style={{ margin: '12px 0 16px' }}>
          <label className="check"><input type="radio" name="expQue" checked={que === 'todas'} onChange={() => setQue('todas')} /> <span>Todas las actividades <span className="nd">({total})</span></span></label>
          <label className="check"><input type="radio" name="expQue" checked={que === 'filtradas'} disabled={visibles === total} onChange={() => setQue('filtradas')} /> <span>Solo las que se ven con los filtros actuales <span className="nd">({visibles})</span></span></label>
          <label className="check"><input type="checkbox" checked={notas} onChange={e => setNotas(e.target.checked)} /> Incluir el texto de las notas</label>
        </div>
        <div className="pie"><span /><div className="barra"><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="prim"><Ico n="descargar" /> Descargar .csv</button></div></div>
      </form>
    </Dialogo>
  );
}
