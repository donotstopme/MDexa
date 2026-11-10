import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { armarBloques, filtrar, filtrosVacios, parseMD, type Agrupar } from '@mdexa/core';
import { Calendario } from '../src/vistas/Calendario';
import { Carga } from '../src/vistas/Carga';
import { Gantt } from '../src/vistas/Gantt';
import { IconoBloque } from '../src/vistas/Lista';
import { Mias } from '../src/vistas/Mias';
import { Tablero } from '../src/vistas/Tablero';

const doc = parseMD(readFileSync(new URL('../../core/test/fixtures/demo.md', import.meta.url), 'utf8'));
const HOY = '2026-11-06';
const orden = { k: 'inicio' as const, asc: true };
const lista = filtrar(doc, filtrosVacios(), orden, { hoy: HOY });
const bl = (por: Agrupar) => armarBloques(lista, por, doc.actividades);
const sin = (h: string) => h.replaceAll('<!-- -->', '');
const acc = { notas() {}, imgs() {}, subs() {}, etq() {}, ir() {} };
const comun = { favs: new Set<number>(), onFav() {}, acc, onEditar() {}, msgVacio: 'vacío' };
const icono = (b: Parameters<typeof IconoBloque>[0]['b']) => <IconoBloque b={b} doc={doc} />;
const ed = { editar() {} };

describe('Tablero (diseño original)', () => {
  const tab = (por: Agrupar, e?: typeof ed) => sin(renderToStaticMarkup(<Tablero doc={doc} bloques={bl(por)} texto="" agrupar={por} ocultaBacklog={false} edicion={e} colapsados={new Set()} onGrupo={() => {}} icono={icono} {...comun} />));
  it('encabezado con totales por estado y un carril por negocio con una celda por estado', () => {
    const h = tab('negocio');
    expect(h).toContain('class="k-cab"');
    expect(h).toMatch(/class="es-gris">Backlog<\/span><b>3<\/b>/);
    expect((h.match(/class="k-carril /g) || []).length).toBe(9);
    expect(h).toContain('data-estado="En progreso"');
    expect(h).toContain('Sin actividades');
  });
  it('en edición: tarjetas arrastrables y "Suelta aquí"; en lectura no', () => {
    expect(tab('negocio')).not.toContain('draggable="true"');
    const h = tab('negocio', ed);
    expect(h).toContain('draggable="true"'); expect(h).toContain('Suelta aquí'); expect(h).toContain('a otro carril para cambiarla de negocio');
  });
  it('sin agrupar no hay carriles con encabezado', () => {
    const h = tab('');
    expect(h).not.toContain('k-carril-cab');
  });
});

describe('Mis actividades (diseño original)', () => {
  const mias = (quien: string, e?: typeof ed) => sin(renderToStaticMarkup(<Mias doc={doc} lista={lista} quien={quien} usuario="Ana" hoy={HOY} edicion={e} favs={new Set()} onFav={() => {}} acc={acc} onEditar={() => {}} onNombre={() => {}} hayFiltros={false} msgVacio="v" />));
  it('sin nombre pide indicarlo', () => expect(mias('')).toContain('Indicar mi nombre'));
  it('Marta: secciones con vencidas, resumen y tarjetas sólo suyas', () => {
    const h = mias('marta');
    expect(h).toContain('m-tit'); expect(h).toContain('Vencidas'); expect(h).toContain('Autenticación y roles'); expect(h).not.toContain('Pantallas del panel');
    expect(h).toContain('class="m-tile rojo"');
  });
  it('Ana: lo terminado empieza plegado; Iniciar/Terminar sólo al editar', () => {
    expect(mias('Ana')).not.toContain('Definir alcance del portal');
    expect(mias('Ana')).not.toContain('k-rapidas');
    expect(mias('Ana', ed)).toContain('k-rapidas');
  });
});

describe('Calendario (diseño original)', () => {
  const cal = (e?: typeof ed) => sin(renderToStaticMarkup(<Calendario doc={doc} lista={lista} hoy={HOY} edicion={e} novIds={{}} onNueva={() => {}} onNotas={() => {}} favs={comun.favs} onEditar={() => {}} msgVacio="v" />));
  it('noviembre con días, chips en su fecha fin y franja sin fecha', () => {
    const h = cal();
    expect(h).toContain('Noviembre de 2026'); expect(h).toContain('data-dia="2026-11-20"'); expect(h).toContain('API de facturas'); expect(h).toContain('Sin fecha fin');
    expect(h).toMatch(/c-dia[^"]*\bhoy\b/); expect(h).toContain('c-chip');
  });
  it('chips arrastrables sólo al editar', () => { expect(cal()).not.toContain('draggable="true"'); expect(cal(ed)).toContain('draggable="true"'); });
});

describe('Carga (diseño original)', () => {
  it('una fila por responsable con horas, columnas Atrasadas/Después/Sin fecha', () => {
    const h = sin(renderToStaticMarkup(<Carga doc={doc} lista={lista} hoy={HOY} onIr={() => {}} msgVacio="v" />));
    for (const p of ['Ana', 'Marta', 'Pedro', 'Sofía', 'Sin responsable']) expect(h).toContain(p);
    expect(h).toMatch(/Sem\. 02.nov/); expect(h).toContain('Atrasadas'); expect(h).toContain('Después'); expect(h).toMatch(/\d+ h<\/b>/);
  });
});

describe('Línea de tiempo (diseño original)', () => {
  const g = (por: Agrupar, e?: typeof ed) => sin(renderToStaticMarkup(<Gantt doc={doc} bloques={bl(por)} texto="" zoom="semana" hoy={HOY} edicion={e} colapsados={new Set()} onGrupo={() => {}} agrupaPorNegocio={por === 'negocio'} icono={icono} {...comun} />));
  it('grupos con resumen, una barra por actividad con fechas, flechas y marcas', () => {
    const h = g('negocio');
    expect((h.match(/class="g-fila g-grupo/g) || []).length).toBe(9);
    expect((h.match(/class="g-barra /g) || []).length).toBe(doc.actividades.filter(a => a.inicio && a.fin).length);
    expect(h).toContain('class="vis choque"'); expect(h).toContain('g-resumen'); expect(h).toContain('Sin fecha inicio'); expect(h).toContain('Fin meta');
  });
  it('controles de arrastre sólo al editar', () => {
    expect(g('negocio')).not.toContain('g-asa');
    const h = g('negocio', ed);
    expect(h).toContain('g-asa izq'); expect(h).toContain('g-enlace'); expect(h).toContain('clic en un día para completarla');
  });
  it('sin agrupar no hay filas de grupo', () => expect(g('')).not.toContain('g-grupo'));
});
