import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { datosAvance, analizarMeta, armarBloques, filtrar, filtrosVacios, parseMD, statsNegocios, type Agrupar } from '@gestor/core';
import { Lista } from '../src/vistas/Lista';
import { Banner } from '../src/componentes/Banner';
import { PanelNegocios } from '../src/componentes/PanelNegocios';
import { TarjetaMeta } from '../src/componentes/TarjetaMeta';

const doc = parseMD(readFileSync(new URL('./proyecto.md', import.meta.url), 'utf8'));
const demo = parseMD(readFileSync(new URL('../../core/test/fixtures/demo.md', import.meta.url), 'utf8'));
const HOY = '2026-11-06';
const acc = { notas() {}, imgs() {}, subs() {}, etq() {}, ir() {} };
const orden = { k: 'inicio' as const, asc: true };

const lista = (d = doc, por: Agrupar = 'negocio', edicion = false) => {
  const l = filtrar(d, filtrosVacios(), orden, { hoy: HOY });
  return renderToStaticMarkup(<Lista doc={d} bloques={armarBloques(l, por, d.actividades)} texto="" orden={orden} onOrden={() => {}} colsOcultas={new Set()}
    agrupaPorNegocio={por === 'negocio'} hayAgrupacion={!!por} colapsados={new Set()} onGrupo={() => {}} favs={new Set()} onFav={() => {}} acc={acc}
    onEditar={() => {}} onEliminar={() => {}} onFiltrarEtq={() => {}} msgVacio="vacío" edicion={edicion ? { editar() {} } : undefined} />);
};

describe('Lista (diseño original)', () => {
  it('agrupa por negocio con encabezados y resumen del grupo', () => {
    const h = lista(demo).replaceAll('<!-- -->', '');
    expect(h).toContain('class="grupo');
    expect(h).toContain('Desarrollo');
    expect(h).toContain('4 actividades · 0 terminadas');
    expect(h).toContain('2 vencidas');
    expect(h).toContain('class="chip es-verde"');
  });
  it('sin agrupar muestra la columna Negocio; agrupado por negocio no', () => {
    expect(lista(demo, '')).toContain('data-k="negocio"');
    expect(lista(demo, 'negocio')).not.toContain('data-k="negocio"');
    expect(lista(demo, 'responsable')).toContain('data-k="negocio"');
  });
  it('en edición hay campos con lista de responsables (combo con alta libre) y botones de editar/eliminar', () => {
    const h = lista(demo, 'negocio', true);
    expect(h).toContain('list="listaResp"');
    expect(h).toContain('aria-label="Eliminar"');
    expect(h).toContain('class="ed est es-');
    expect(lista(demo)).not.toContain('list="listaResp"');
  });
  it('muestra marcas de bloqueada por dependencias, repetición y subtareas', () => {
    const h = lista(demo, '');
    expect(h).toContain('class="dep bloq');
    expect(h).toContain('rep-chip');
    expect(h).toContain('sub-chip');
  });
});

describe('Selección en la lista', () => {
  it('en edición hay casillas por fila, por grupo y para todas; las seleccionadas se marcan', () => {
    const l = filtrar(demo, filtrosVacios(), orden, { hoy: HOY });
    const sel = { ids: new Set([5]), alternar() {}, grupo() {} };
    const h = renderToStaticMarkup(<Lista sel={sel} doc={demo} bloques={armarBloques(l, 'negocio', demo.actividades)} texto="" orden={orden} onOrden={() => {}} colsOcultas={new Set()} agrupaPorNegocio hayAgrupacion
      colapsados={new Set()} onGrupo={() => {}} favs={new Set()} onFav={() => {}} acc={acc} onEditar={() => {}} onEliminar={() => {}} onFiltrarEtq={() => {}} msgVacio="v" edicion={{ editar() {} }} />);
    expect((h.match(/class="sel"/g) || []).length).toBe(16); expect((h.match(/class="sel-g"/g) || []).length).toBe(9); expect(h).toContain('class="sel-todo"');
    expect(h).toMatch(/seleccionada[^>]*data-id="5"|data-id="5"[^>]*seleccionada/); expect(lista()).not.toContain('class="sel"');
  });
});

describe('Cabecera de estado, panel y meta', () => {
  const baseBanner = { hayArchivo: true, modo: 'lectura' as const, masNuevo: false, versionArchivo: '', puedeEscribir: true, candado: null, usuario: 'Ana', guardado: null,
    puedeDeshacer: false, puedeRehacer: false, onTomar() {}, onSoltar() {}, onLiberar() {}, onDeshacer() {}, onRehacer() {}, onAbrir() {} };
  it('banner: libre, otra persona editando, editando', () => {
    expect(renderToStaticMarkup(<Banner {...baseBanner} />)).toContain('Nadie está editando el archivo');
    const ahora = new Date().toISOString();
    expect(renderToStaticMarkup(<Banner {...baseBanner} candado={{ usuario: 'Luis', desde: ahora, latido: ahora }} />)).toContain('está editando desde');
    const e = renderToStaticMarkup(<Banner {...baseBanner} modo="edicion" />);
    expect(e).toContain('Estás editando.'); expect(e).toContain('Soltar archivo');
  });
  it('panel de negocios con avance y vencidas, como el original', () => {
    const stats = statsNegocios(demo, demo.actividades, HOY);
    const h = renderToStaticMarkup(<PanelNegocios stats={stats} total={16} compacto={false} onCompacto={() => {}} activo="" filtra={false} onElegir={() => {}} favs={null} />);
    expect(h).toContain('Negocios'); expect(h).toContain('Todos los negocios');
    expect(h).toContain('0/4'); expect(h).toContain('● 2'); expect(h).toContain('2/2');
  });
  it('tarjeta de meta: tiempo transcurrido, actividades terminadas y ritmo', () => {
    const h = renderToStaticMarkup(<TarjetaMeta doc={demo} a={analizarMeta(demo, HOY)} editando={false} onEditar={() => {}} verAvance={false} onVerAvance={() => {}} unidad="act" onUnidad={() => {}} avance={datosAvance(demo, 'act', HOY)} />).replaceAll('<!-- -->', '');
    expect(h).toContain('día 33 de 75 · 44%');
    expect(h).toContain('3 de 12 (sin contar 4 en backlog o canceladas) · 25%');
    expect(h).toContain('Atrasado');
  });
});

describe('Gráfica de avance', () => {
  const h = (ver: boolean, u: 'act' | 'h' = 'act') => renderToStaticMarkup(<TarjetaMeta doc={demo} a={analizarMeta(demo, HOY)} editando={false} onEditar={() => {}} verAvance={ver} onVerAvance={() => {}} unidad={u} onUnidad={() => {}} avance={datosAvance(demo, u, HOY)} />).replaceAll('<!-- -->', '');
  it('cerrada: sólo el botón; abierta: resumen, leyenda, gráfica y tabla', () => {
    expect(h(false)).toContain('Ver gráfica de avance'); expect(h(false)).not.toContain('av-svg');
    const a = h(true);
    expect(a).toContain('Ocultar gráfica de avance'); expect(a).toContain('class="av-svg"'); expect(a).toContain('Proyección al ritmo actual');
    expect(a).toContain('Hoy: <b>3</b> de 12 terminadas'); expect(a).toContain('2.2 atrás'); expect(a).toContain('57 días después de la meta'); expect(a).toContain('Ver como tabla');
  });
  it('en horas', () => { const a = h(true, 'h'); expect(a).toContain('<b>28 h</b> de 177 h'); expect(a).toContain('class="seg av-seg"'); });
});
