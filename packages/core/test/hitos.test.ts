import { describe, expect, it } from 'vitest';
import {
  absorberPropios, actividadesParaHito, analizarReporte, aplicarImportacion, carrilesHitos, claseHito, cuandoEs, marcasMeta, plazoMeta, creaCicloHito, hitosDeSprint, misHitos, textoRecorrido, datosSemana, exportarCsv, filasImportar, generarICS, hitosIcs, hitosVisibles, mapaInicial, moverHito, parseCSV, proximosHitos, reporteMd, textoSemanal, aplicarSoltar, armarBloques, borrarHito, calcularNovedades, conHito, crearSprint, deshacer, filtrar, filtrosVacios, foto, guardarHito, historialVacio,
  infoHito, parseMD, porIncluir, quitarHitosAjenos, seleccionHito, registrarDeshacer, renombrarNegocio, restaurarRespaldo, toMD, type Documento,
} from '../src';

const MD = `# P

- Proyecto: P
- Meta inicio: 2026-10-01
- Meta fin: 2026-12-18
- Versión de MDexa: 19 (v1.35.0)

| ID | Negocio | Actividad | Tamaño | Inicio | Fin | Estado | Hito |
|---|---|---|---|---|---|---|---|
| 1 | Tienda | Uno | M | 2026-10-01 | 2026-10-09 | Terminado | H1 |
| 2 | Tienda | Dos | L | 2026-10-10 | 2026-11-05 | En progreso | H1 |
| 3 | Bodega | Tres | S | | | Planeado | |
| 4 | | Cuatro | | | | Planeado | |

## Hitos

- H1 | 2026-10-30 | Diseño aprobado | Tienda |  | Pantallas<br>validadas
- H2 | 2026-12-18 | Lanzamiento | Bodega; Tienda
`;
const doc = () => parseMD(MD);
const ok = (r: ReturnType<typeof guardarHito>) => { if ('error' in r) throw new Error(r.error); return r; };
const base = { nombre: 'Nuevo', fecha: '2026-11-01', negocios: ['Tienda'], cumplido: '', descripcion: '' };

describe('formato', () => {
  it('lee los hitos y la columna, y los conserva al guardar', () => {
    const d = doc();
    expect(d.hitos).toEqual([
      { id: 1, fecha: '2026-10-30', nombre: 'Diseño aprobado', negocios: ['Tienda'], cumplido: '', descripcion: 'Pantallas\nvalidadas' },
      { id: 2, fecha: '2026-12-18', nombre: 'Lanzamiento', negocios: ['Bodega', 'Tienda'], cumplido: '', descripcion: '' },
    ]);
    expect(d.actividades.map(a => a.hito)).toEqual([1, 1, undefined, undefined]);
    const t = toMD(d), r = parseMD(t);
    expect(r.hitos).toEqual(d.hitos); expect(r.actividades).toEqual(d.actividades); expect(toMD(r)).toBe(t);
    expect(t).toContain('Versión de MDexa: 19'); expect(t).toContain('| Repite | Hito |');
  });
  it('sin hitos, el archivo se guarda igual que antes (versión 18 y sin columna)', () => {
    const t = toMD(parseMD('| Actividad |\n|---|\n| x |'));
    expect(t).toContain('Versión de MDexa: 18'); expect(t).not.toContain('Hito');
  });
  it('conserva tal cual una sección "## Hitos" escrita a mano', () => {
    const d = parseMD('| Actividad |\n|---|\n| x |\n\n## Hitos\n\n- Entrega en marzo\n');
    expect(d.hitos).toEqual([]); expect(d.extra).toEqual(['## Hitos', '', '- Entrega en marzo']);
    expect(toMD(d)).toContain('- Entrega en marzo');
    const r = parseMD(toMD(ok(guardarHito(d, base, 'Ana')).doc));
    expect(r.hitos.map(h => h.nombre)).toEqual(['Nuevo']); expect(r.extra).toContain('- Entrega en marzo');
  });
  it('no pierde la referencia de una actividad a un hito que falta, ni reutiliza su número', () => {
    const d = parseMD('| Actividad | Hito |\n|---|---|\n| x | H7 |');
    expect(toMD(d)).toContain('| H7 |');
    expect(ok(guardarHito(d, base, 'Ana')).id).toBe(8);
  });
});

describe('qué actividades entran', () => {
  // 5: abierta que termina antes · 6: termina después · 7: sin fecha
  const d: Documento = { ...doc(), actividades: [...doc().actividades,
    ...[['2026-10-20'], ['2027-01-20'], ['']].map(([fin], i) => ({ ...doc().actividades[2], id: 5 + i, negocio: 'Tienda', fin }))] };
  const nuevo = { negocios: ['Tienda'], fecha: '2026-11-30' };
  it('en un hito nuevo entran solas las abiertas del negocio que terminan a tiempo y no están en otro', () => {
    expect([...seleccionHito(d, nuevo)]).toEqual([5]);
    expect(actividadesParaHito(d, ['Tienda']).map(a => a.id)).toEqual([1, 5, 2, 6, 7]);
    expect([...seleccionHito(d, nuevo, new Map([[5, false], [6, true]]))]).toEqual([6]);
  });
  it('en uno existente se respeta lo guardado, y sólo un negocio recién agregado entra solo', () => {
    expect([...seleccionHito(d, { id: 1, ...nuevo })]).toEqual([1, 2]);
    const b = { ...d, actividades: d.actividades.map(a => (a.id === 3 ? { ...a, fin: '2026-10-15' } : a)) };
    expect([...seleccionHito(b, { id: 1, fecha: '2026-11-30', negocios: ['Tienda', 'Bodega'] })]).toEqual([1, 3, 2]);
  });
  it('avisa de las que encajan y no están incluidas', () => {
    expect(porIncluir(d, d.hitos[0]).map(a => a.id)).toEqual([5]);
    expect(porIncluir(d, { ...d.hitos[0], cumplido: '2026-10-30' })).toEqual([]);
  });
  it('guardar fija la selección: entran, salen y se mueven de hito', () => {
    const r = ok(guardarHito(d, base, 'Ana', new Set([2, 5, 3])));
    expect(r.doc.actividades.map(a => a.hito)).toEqual([1, 3, undefined, undefined, 3, undefined, undefined]);
    expect(r.doc.bitacora.at(-1)?.detalle).toBe('Creó «Nuevo» para el 2026-11-01: entran 2 actividades');
    const q = ok(guardarHito(r.doc, { ...r.doc.hitos[2] }, 'Ana', new Set([2])));
    expect(q.doc.actividades.filter(a => a.hito === 3).map(a => a.id)).toEqual([2]);
  });
});

describe('negocio', () => {
  it('asigna sólo si el hito es de su negocio', () => {
    const d = doc();
    expect(conHito(d, d.actividades[2], 1)).toBeNull();
    expect(conHito(d, d.actividades[2], 2)).toMatchObject({ hito: 2 });
    expect(conHito(d, d.actividades[3], 2)).toBeNull();
  });
  it('quita el hito a la actividad que cambia de negocio', () => {
    const d = doc(), n: Documento = { ...d, actividades: d.actividades.map(a => (a.id === 1 ? { ...a, negocio: 'Bodega' } : a)) };
    const r = quitarHitosAjenos(d, n);
    expect(r.quitados).toBe(1); expect(r.doc.actividades[0].hito).toBeUndefined(); expect(r.doc.actividades[1].hito).toBe(1);
  });
  it('al renombrar un negocio, sus hitos lo siguen', () => {
    expect(renombrarNegocio(doc(), 'Tienda', 'Bodega').doc.hitos.map(h => h.negocios)).toEqual([['Bodega'], ['Bodega']]);
  });
});

describe('administración', () => {
  it('valida nombre, fecha, negocios y repetidos', () => {
    for (const x of [{ nombre: ' ' }, { fecha: '' }, { negocios: [] }, { nombre: 'lanzamiento' }]) expect(guardarHito(doc(), { ...base, ...x }, 'Ana')).toHaveProperty('error');
    expect(guardarHito(doc(), base, 'Ana')).toHaveProperty('id', 3);
  });
  it('anota en la bitácora y sobrevive al guardar', () => {
    const d = ok(guardarHito(doc(), { ...base, descripcion: 'a | b\nc' }, 'Ana')).doc, r = parseMD(toMD(borrarHito(d, 1, 'Ana')));
    expect(r.hitos.at(-1)?.descripcion).toBe('a / b\nc');
    expect(r.bitacora.map(e => e.accion)).toEqual(['hito', 'hito']);
    expect(r.bitacora[1].detalle).toBe('Eliminó «Diseño aprobado»');
    expect(r.actividades.every(a => !a.hito)).toBe(true);
  });
  it('al quitar un negocio del hito, sus actividades lo dejan', () => {
    const r = ok(guardarHito(doc(), { ...doc().hitos[0], negocios: ['Bodega'] }, 'Ana'));
    expect(r.doc.actividades.every(a => !a.hito)).toBe(true);
  });
});

describe('estado y avance', () => {
  const d = doc(), h = d.hitos[0];
  it('calcula por horas y distingue en tiempo, en riesgo, vencido y cumplido', () => {
    expect(infoHito(d, h, '2026-10-01')).toMatchObject({ estado: 'En riesgo', total: 2, hechas: 1, pct: 33, inicio: '2026-10-01' });
    expect(infoHito(d, { ...h, fecha: '2026-11-30' }, '2026-10-01').estado).toBe('En tiempo');
    expect(infoHito(d, h, '2026-11-02').estado).toBe('Vencido');
    expect(infoHito(d, { ...h, cumplido: '2026-10-29' }, '2026-11-02')).toMatchObject({ estado: 'Cumplido', pct: 100 });
    expect(infoHito(d, d.hitos[1], '2026-10-01')).toMatchObject({ estado: 'En tiempo', total: 0, pct: 0 });
  });
});

describe('integración', () => {
  it('filtra y agrupa por hito', () => {
    const d = doc(), o = { k: 'actividad' as const, asc: true };
    expect(filtrar(d, { ...filtrosVacios(), hito: ['Diseño aprobado'] }, o).map(a => a.id)).toEqual([2, 1]);
    expect(filtrar(d, { ...filtrosVacios(), hito: ['Sin hito'] }, o)).toHaveLength(2);
    expect(filtrar(d, { ...filtrosVacios(), hito: ['ya no existe'] }, o)).toHaveLength(4);
    expect(armarBloques(d.actividades, 'hito', d.actividades, d.hitos).map(b => b.titulo)).toEqual(['Diseño aprobado', 'Sin hito']);
  });
  it('soltar en el carril de un hito lo asigna o lo rechaza', () => {
    const d = doc();
    expect(aplicarSoltar(d.actividades[2], 'Planeado', 'hito:2', 'hito', new Date(), d.hitos).a.hito).toBe(2);
    expect(aplicarSoltar(d.actividades[2], 'Planeado', 'hito:1', 'hito', new Date(), d.hitos).rechazo).toContain('Tienda');
  });
  it('bitácora, novedades, deshacer, respaldo y sprint incluyen los hitos', () => {
    const d = doc(), previo = foto(d.actividades, d.hitos);
    const n = { ...d, actividades: d.actividades.map(a => (a.id === 3 ? { ...a, hito: 2 } : a)) };
    expect(absorberPropios(n, previo, 'Ana').doc.bitacora[0].campos).toEqual([{ k: 'hito', etq: 'Hito', antes: '', despues: 'Lanzamiento' }]);
    expect(calcularNovedades(n, previo, new Set(), 'Luis').cambios).toHaveLength(1);
    let h = registrarDeshacer(historialVacio(), d); const sin = borrarHito(d, 1, 'Ana'); h = registrarDeshacer(h, sin);
    expect(deshacer(h, sin)!.doc.hitos).toHaveLength(2);
    expect(restaurarRespaldo(sin, { fecha: '', motivo: 'x', texto: '', hash: '', usuario: '', n: 4 }, d, 'Ana', 'hoy').hitos).toHaveLength(2);
    const s = crearSprint(d, { nombre: 'S', inicio: '', fin: '', estados: ['En progreso'], negocios: ['Tienda'], notas: false, quitarFechas: false, reiniciar: false }, 'Ana', 'p.md');
    expect(s.hitos.map(x => x.id)).toEqual([1]);
  });
});

describe('vistas y salidas', () => {
  const d = doc();
  it('filtra los visibles y reparte carriles sin encimar', () => {
    expect(hitosVisibles(d.hitos, ['Bodega']).map(h => h.id)).toEqual([2]);
    expect(hitosVisibles(d.hitos, [], ['Diseño aprobado']).map(h => h.id)).toEqual([1]);
    expect(carrilesHitos([0, 50, 120, 130], 100)).toEqual([0, 1, 0, 2]);
    expect(proximosHitos(d, '2026-11-02').map(x => x.info.estado)).toEqual(['Vencido', 'En tiempo']);
  });
  it('mover un hito conserva sus actividades', () => {
    const r = moverHito(d, 1, '2026-11-20', 'Ana');
    expect(r.hitos[0].fecha).toBe('2026-11-20'); expect(r.actividades).toEqual(d.actividades); expect(r.bitacora.at(-1)?.detalle).toContain('→ 2026-11-20');
  });
  it('reporte y reporte semanal los incluyen', () => {
    const x = analizarReporte(d, '2026-11-02');
    expect(x.alertas).toContain('1 hito está vencido.');
    expect(reporteMd(d, x, { nombreApp: 'MDexa', version: '1' })).toContain('## Hitos');
    expect(textoSemanal(d, datosSemana(d, 0, '2026-11-02'), false, { archivo: 'p.md', nombreApp: 'MDexa', hoy: '2026-11-02' }).cuerpo).toContain('• Diseño aprobado — ');
    const sin = parseMD('| Actividad |\n|---|\n| x |');
    expect(reporteMd(sin, analizarReporte(sin), { nombreApp: 'M', version: '1' })).not.toContain('## Hitos');
  });
  it('CSV: exporta la columna y al importar asigna sólo hitos válidos', () => {
    expect(exportarCsv(d, d.actividades, false)).toContain('Diseño aprobado');
    const filas = parseCSV('Negocio,Actividad,Hito\nTienda,Nueva,diseño aprobado\nBodega,Otra,Diseño aprobado\nTienda,Más,No existe'), { mapa } = mapaInicial(filas);
    const l = filasImportar(d, filas, mapa, { encabezado: true, modo: 'agregar', negocioDefecto: '' });
    expect(l.map(f => f.hito)).toEqual([1, undefined, undefined]); expect(l[1].avisos[0]).toContain('no incluye');
    expect(aplicarImportacion(d, l, mapa).doc.actividades.slice(-3).map(a => a.hito)).toEqual([1, undefined, undefined]);
  });
  it('.ics: un evento por hito, según la selección', () => {
    const h = hitosIcs(d, 'todas', d.actividades, '', false);
    expect(generarICS(d, [], false, 'p.md', new Date(), h)).toContain('UID:p-hito-1@mdexa');
    expect(hitosIcs(d, 'filtradas', d.actividades.filter(a => a.id === 1), '', false).map(x => x.id)).toEqual([1]);
  });
});

describe('color', () => {
  it('se guarda aparte, se lee de vuelta y no cambia la versión del formato', () => {
    const d = ok(guardarHito(doc(), { ...doc().hitos[0], color: 'morado' }, 'Ana')).doc, t = toMD(d);
    expect(t).toContain('## Colores de hitos\n\n- H1 | morado'); expect(t).toContain('Versión de MDexa: 19');
    expect(parseMD(t).hitos[0].color).toBe('morado'); expect(toMD(parseMD(t))).toBe(t);
    expect(d.bitacora.at(-1)?.detalle).toContain('color'); expect(claseHito(d.hitos[0], 'Vencido')).toBe('h-Vencido h-color etq-morado');
  });
  it('se puede volver a "según el estado"', () => {
    const d = ok(guardarHito(doc(), { ...doc().hitos[0], color: 'rojo' }, 'Ana')).doc;
    const r = ok(guardarHito(d, { ...d.hitos[0], color: undefined }, 'Ana')).doc;
    expect(r.hitos[0].color).toBeUndefined(); expect(toMD(r)).not.toContain('Colores de hitos');
  });
});

describe('orden entre hitos', () => {
  const dos = () => ok(guardarHito(doc(), { ...doc().hitos[1], depende: [1] }, 'Ana')).doc;
  it('se guarda aparte y se lee de vuelta', () => {
    const d = dos(), t = toMD(d);
    expect(t).toContain('## Dependencias de hitos\n\n- H2 | H1'); expect(parseMD(t).hitos[1].depende).toEqual([1]); expect(toMD(parseMD(t))).toBe(t);
    expect(d.bitacora.at(-1)?.detalle).toContain('depende de «Diseño aprobado»');
  });
  it('no permite círculos ni depender de sí mismo', () => {
    expect(creaCicloHito(dos().hitos, 1, 2)).toBe(true);
    expect(guardarHito(dos(), { ...dos().hitos[0], depende: [2] }, 'Ana')).toHaveProperty('error');
    expect(guardarHito(dos(), { ...dos().hitos[0], depende: [1] }, 'Ana')).toHaveProperty('error');
  });
  it('avisa si el previo venció o está programado después', () => {
    const d = dos(), h2 = d.hitos[1];
    expect(infoHito(d, h2, '2026-10-01')).toMatchObject({ estado: 'En tiempo' });
    expect(infoHito(d, h2, '2026-10-01').espera.map(h => h.id)).toEqual([1]);
    expect(infoHito(d, h2, '2026-11-02')).toMatchObject({ estado: 'En riesgo', detalle: 'Espera a «Diseño aprobado», que está vencido' });
    expect(infoHito(d, { ...h2, fecha: '2026-10-15' }, '2026-10-01').detalle).toContain('programado después');
  });
  it('al borrar un hito, los demás dejan de depender de él; un sprint conserva sólo dependencias copiadas', () => {
    expect(borrarHito(dos(), 1, 'Ana').hitos[0].depende).toBeUndefined();
    expect(hitosDeSprint(dos().hitos, [{ ...doc().actividades[0], hito: 2 }])[0].depende).toBeUndefined();
  });
});

describe('historial de fechas', () => {
  const a = new Date('2026-10-01T10:00:00Z'), b = new Date('2026-10-02T10:00:00Z'), b2 = new Date('2026-10-02T10:01:00Z');
  it('cuenta cada vez que se recorre y junta los ajustes seguidos', () => {
    let d = moverHito(doc(), 1, '2026-11-06', 'Ana', a);
    d = moverHito(d, 1, '2026-11-09', 'Ana', b); d = moverHito(d, 1, '2026-11-13', 'Ana', b2);
    expect(d.hitos[0].cambios?.map(c => [c.antes, c.despues])).toEqual([['2026-10-30', '2026-11-06'], ['2026-11-06', '2026-11-13']]);
    expect(textoRecorrido(d.hitos[0])).toBe('Recorrido 2 veces (+14 días)');
    const t = toMD(d); expect(t).toContain('## Historial de hitos'); expect(parseMD(t).hitos[0].cambios).toEqual(d.hitos[0].cambios); expect(toMD(parseMD(t))).toBe(t);
  });
  it('regresar a la fecha anterior enseguida no cuenta, y editar otra cosa no agrega cambios', () => {
    let d = moverHito(doc(), 1, '2026-11-06', 'Ana', b); d = moverHito(d, 1, '2026-10-30', 'Ana', b2);
    expect(d.hitos[0].cambios).toBeUndefined();
    const falso = [{ cuando: '', autor: '', antes: '2000-01-01', despues: '2000-01-02' }];
    expect(ok(guardarHito(doc(), { ...doc().hitos[0], nombre: 'Otro', cambios: falso }, 'Ana')).doc.hitos[0].cambios).toBeUndefined();
  });
});

describe('mis hitos', () => {
  it('lista los pendientes a los que aporta la persona, con sus actividades', () => {
    const d = { ...doc(), actividades: doc().actividades.map(x => (x.id <= 2 ? { ...x, responsable: x.id === 1 ? 'Ana' : 'ana' } : x)) };
    expect(misHitos(d, 'Ana', '2026-10-01').map(x => [x.h.id, x.mias.length, x.pendientes.map(p => p.id)])).toEqual([[1, 2, [2]]]);
    expect(misHitos(d, 'Luis')).toEqual([]);
  });
});

describe('meta compacta', () => {
  it('dice cuánto falta o cuánto pasó', () => {
    expect(['2026-11-27', '2026-11-28', '2026-11-26', '2026-12-02', '2026-11-25'].map(f => cuandoEs(f, '2026-11-27'))).toEqual(['hoy', 'mañana', 'ayer', 'en 5 días', 'hace 2 días']);
    expect(plazoMeta('2026-10-01', '2026-12-15', '2026-11-27')).toBe('quedan 18 días');
    expect(plazoMeta('2026-10-01', '2026-12-15', '2026-12-15')).toBe('termina hoy');
    expect(plazoMeta('2026-10-01', '2026-12-15', '2026-09-30')).toBe('inicia mañana');
    expect(plazoMeta('2026-10-01', '2026-12-15', '2026-12-17')).toBe('terminó hace 2 días');
  });
  it('coloca los hitos en la escala de la meta, agrupa los cercanos y marca los de fuera', () => {
    const d = doc();
    d.meta = { ...d.meta, inicio: '2026-10-01', fin: '2026-10-10' };
    const h = (id: number, fecha: string) => ({ id, fecha, nombre: `H${id}`, negocios: ['Tienda'], cumplido: '', descripcion: '' });
    d.hitos = [h(1, '2026-09-01'), h(2, '2026-10-05'), h(3, '2026-10-05'), h(4, '2026-10-10'), h(5, '2026-12-01')];
    const m = marcasMeta(d, '2026-10-06');
    expect(m.map(x => [x.x, x.fuera, x.hitos.map(y => y.h.id)])).toEqual([[0, 'antes', [1]], [50, '', [2, 3]], [100, '', [4, 5]]]);
    expect(marcasMeta({ ...d, hitos: [h(5, '2026-12-01')] }, '2026-10-06')[0]!.fuera).toBe('después');
    expect(m[1]!.estado).toBe('Vencido');
    expect(marcasMeta({ ...d, meta: { ...d.meta, fin: '' } })).toEqual([]);
  });
});
