import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { claveNota, calcularNovedades, foto, parseMD, agregarNota, conEstado } from '@gestor/core';
import { DialogoNotas } from '../src/componentes/DialogoNotas';
import { DialogoNovedades } from '../src/componentes/DialogoNovedades';
import { PopEtiquetas } from '../src/componentes/PopEtiquetas';
import { PopSubtareas } from '../src/componentes/PopSubtareas';

const doc = parseMD(readFileSync(new URL('../../core/test/fixtures/demo.md', import.meta.url), 'utf8'));
const sin = (h: string) => h.replaceAll('<!-- -->', '');
const anc = (typeof document !== 'undefined' ? document.body : ({} as HTMLElement));

describe('Notas (ventana original)', () => {
  const html = (ok = true, usuario = 'Pedro') => sin(renderToStaticMarkup(<DialogoNotas doc={doc} id={5} usuario={usuario} escritura={{ ok, msg: ok ? 'Se guarda directo en el archivo compartido; no necesitas tomarlo.' : 'Ana está editando el archivo; podrás agregar notas cuando lo suelte.' }}
    nuevas={new Set()} onAgregar={async () => true} onBorrar={() => {}} onCerrar={() => {}} />));
  it('muestra título, conversación con avatares, menciones y el campo de nota nueva', () => {
    const h = html();
    expect(h).toContain('Autenticación y roles'); expect(h).toContain('class="avatar"'); expect(h).toContain('class="nota mia"');
    expect(h).toContain('class="mencion'); expect(h).toContain('Escribe una nota como Pedro'); expect(h).toContain('no necesitas tomarlo');
  });
  it('solo puedes borrar tus notas, y si no se puede escribir queda deshabilitado', () => {
    expect(html()).toContain('aria-label="Eliminar mi nota"');
    expect(html(true, 'Otra')).not.toContain('aria-label="Eliminar mi nota"');
    const h = html(false);
    expect(h).toContain('disabled=""'); expect(h).toContain('podrás agregar notas cuando lo suelte');
  });
});

describe('Novedades (ventana original)', () => {
  const visto = foto(doc.actividades);
  let d = { ...doc, actividades: doc.actividades.map(a => (a.id === 6 ? conEstado(a, 'En progreso') : a)) };
  d = agregarNota(d, 6, 'Luis', 'Revisa esto @Ana', new Date('2026-11-06T15:00:00Z'));
  const nov = calcularNovedades(d, visto, new Set(), 'Ana');
  it('agrupa por tipo y muestra el antes → después', () => {
    const h = sin(renderToStaticMarkup(<DialogoNovedades doc={d} nov={nov} usuario="Ana" vistoFecha="2026-11-01T00:00:00.000Z" acc={{ ir() {}, notas() {} }}
      onVisto={() => {}} onNotaVista={() => {}} onTodo={() => {}} onSoloNovedades={() => {}} onBitacora={() => {}} onCerrar={() => {}} />));
    expect(h).toContain('Te mencionaron'); expect(h).toContain('Modificadas'); expect(h).toContain('Estado: <s>'); expect(h).toContain('Marcar todo como visto');
  });
  it('sin cambios: "Estás al día"', () => {
    const h = renderToStaticMarkup(<DialogoNovedades doc={doc} nov={calcularNovedades(doc, visto, new Set(doc.notas.map(claveNota)), 'Ana')} usuario="Ana" vistoFecha="2026-11-01T00:00:00.000Z" acc={{ ir() {}, notas() {} }}
      onVisto={() => {}} onNotaVista={() => {}} onTodo={() => {}} onSoloNovedades={() => {}} onBitacora={() => {}} onCerrar={() => {}} />);
    expect(h).toContain('Estás al día');
  });
});

describe('Subtareas y etiquetas (ventanas flotantes)', () => {
  it('subtareas: progreso, casillas y botón para terminar si todo está listo', () => {
    const listo = { ...doc, actividades: doc.actividades.map(a => (a.id === 4 ? { ...a, subtareas: a.subtareas!.map(s => ({ ...s, ok: true })) } : a)) };
    const h = sin(renderToStaticMarkup(<PopSubtareas doc={listo} id={4} ancla={anc} escritura={{ ok: true, msg: '' }} editando={false} onCambiar={async () => true} onTerminar={() => {}} onCerrar={() => {}} />));
    expect(h).toContain('Subtareas de #4'); expect(h).toContain('4/4'); expect(h).toContain('Todo listo: marcar #4 como Terminado'); expect(h).toContain('sin tomarlo');
  });
  it('subtareas sin permiso de escritura: casillas deshabilitadas y sin campo para agregar', () => {
    const h = renderToStaticMarkup(<PopSubtareas doc={doc} id={4} ancla={anc} escritura={{ ok: false, msg: 'Ana está editando' }} editando={false} onCambiar={async () => true} onTerminar={() => {}} onCerrar={() => {}} />);
    expect(h).toContain('disabled=""'); expect(h).not.toContain('Agregar subtarea…');
  });
  it('etiquetas: lista con casillas y colores', () => {
    const h = renderToStaticMarkup(<PopEtiquetas doc={doc} ids={[5]} ancla={anc} onPoner={() => {}} onColor={() => {}} onCerrar={() => {}} />);
    expect(h).toContain('Etiquetas de #5'); expect(h).toContain('type="checkbox"'); expect(h).toContain('etq-col');
  });
});

import { DialogoBitacora } from '../src/componentes/DialogoBitacora';
import { DialogoReporte, documentoReporte } from '../src/componentes/DialogoReporte';

describe('Bitácora y reporte', () => {
  it('bitácora: agrupa por día, muestra autor, acción y antes → después', () => {
    const h = sin(renderToStaticMarkup(<DialogoBitacora doc={doc} act={null} onIr={() => {}} onCerrar={() => {}} />));
    expect(h).toContain('Bitácora'); expect(h).toContain('Últimos 7 días');
    const todo = sin(renderToStaticMarkup(<DialogoBitacora doc={doc} act={3} onIr={() => {}} onCerrar={() => {}} />));
    expect(todo).toContain('class="bit-dia"'); expect(todo).toContain('Wireframes'); expect(todo).toContain('<s>'); expect(todo).toContain('Descargar .csv'); expect(todo).toContain('Solo:');
  });
  it('reporte: secciones, cifras de la meta y botones de descarga', () => {
    const h = sin(renderToStaticMarkup(<DialogoReporte doc={doc} usuario="Ana" archivo="p.md" onSemanal={() => {}} onCerrar={() => {}} />));
    for (const s of ['Resumen general', 'Alertas', 'Avance por responsable', 'Avance por negocio', 'Tamaño y esfuerzo', 'Actividades terminadas (3)', 'Quién hizo qué', 'Avance acumulado contra la meta', 'Por semana', 'Reporte semanal', 'Descargar .html', 'Descargar .md', 'Imprimir / PDF']) expect(h).toContain(s);
    expect(h).toContain('Atrasado'); expect(h).toContain('2 días tarde');
  });
  it('documento del reporte: HTML independiente con estilos', () => {
    const d = documentoReporte(doc, 'Ana', 'p.md');
    expect(d.startsWith('<!doctype html>')).toBe(true); expect(d).toContain('<style>'); expect(d).toContain('.rep h1'); expect(d).toContain('Lanzamiento Portal de Clientes'); expect(d).toContain('Generado el');
  });
});

import { DialogoSemanal } from '../src/componentes/DialogoSemanal';
describe('Reporte semanal', () => {
  it('ventana con selector de semana, copiar y hoja con secciones', () => {
    const h = sin(renderToStaticMarkup(<DialogoSemanal doc={doc} archivo="p.md" aviso={() => {}} onCerrar={() => {}} />));
    for (const s of ['Reporte semanal', 'Esta semana', 'Semana pasada', 'Copiar para correo', 'Abrir en el correo', 'class="sem-hoja"', 'Avance semanal', 'Atrasadas', 'En progreso']) expect(h).toContain(s);
  });
});

import { BarraMasiva } from '../src/componentes/BarraMasiva';
import { DialogoExportar } from '../src/componentes/DialogoExportar';
import { DialogoImportar } from '../src/componentes/DialogoImportar';
import { DialogoMasivo } from '../src/componentes/DialogoMasivo';

describe('CSV y selección múltiple', () => {
  const nada = () => {};
  it('importar: primer paso con archivo o pegado, y plantilla', () => {
    const h = sin(renderToStaticMarkup(<DialogoImportar doc={doc} editando={false} onImportar={nada} onCerrar={nada} />));
    for (const s of ['Importar actividades', 'Descargar plantilla', '1. Elige el archivo', 'Elegir archivo .csv', 'pega las celdas copiadas de Excel']) expect(h).toContain(s);
    expect(h).not.toContain('2. Indica qué columna');
  });
  it('exportar: todas o sólo las filtradas (deshabilitada si no hay filtro) y notas', () => {
    const h = sin(renderToStaticMarkup(<DialogoExportar total={16} visibles={16} onExportar={nada} onCerrar={nada} />));
    expect(h).toContain('Exportar a CSV'); expect(h).toContain('(16)'); expect(h).toContain('disabled=""'); expect(h).toContain('Incluir el texto de las notas');
    expect(sin(renderToStaticMarkup(<DialogoExportar total={16} visibles={5} onExportar={nada} onCerrar={nada} />))).not.toContain('disabled=""');
  });
  const acc = { estado: nada, tamano: nada, prioridad: nada, etiquetas: nada, cambio: nada, favoritas: nada, eliminar: nada, todas: nada, limpiar: nada };
  it('barra masiva: oculta sin selección; con selección muestra el conteo y las acciones', () => {
    expect(renderToStaticMarkup(<BarraMasiva n={0} todasFav={false} hayMasVisibles acc={acc} />)).toBe('');
    const h = sin(renderToStaticMarkup(<BarraMasiva n={3} todasFav={false} hayMasVisibles acc={acc} />));
    for (const s of ['<b>3</b>', 'seleccionadas', 'Todas las visibles', 'Estado…', 'Tamaño…', 'Prioridad…', 'Etiquetas', 'Responsable', 'Negocio', 'Fechas', 'Favoritas', 'Eliminar']) expect(h).toContain(s);
    expect(sin(renderToStaticMarkup(<BarraMasiva n={1} todasFav hayMasVisibles={false} acc={acc} />))).toContain('Quitar de favoritas');
  });
  it('ventana de cambio en lote: responsable (con lista), negocio y fechas', () => {
    const r = sin(renderToStaticMarkup(<DialogoMasivo doc={doc} tipo="responsable" n={2} onAplicar={nada} onCerrar={nada} />));
    expect(r).toContain('Cambiar responsable'); expect(r).toContain('Se aplicará a 2 actividades seleccionadas'); expect(r).toContain('Elige uno o escribe uno nuevo'); expect(r).toContain('Dejarlas sin responsable');
    expect(sin(renderToStaticMarkup(<DialogoMasivo doc={doc} tipo="negocio" n={1} onAplicar={nada} onCerrar={nada} />))).toContain('Mover a otro negocio');
    const f = sin(renderToStaticMarkup(<DialogoMasivo doc={doc} tipo="fechas" n={1} onAplicar={nada} onCerrar={nada} />));
    expect(f).toContain('Mover las fechas'); expect(f).toContain('Fijar fecha de inicio'); expect(f).toContain('Quitar fechas de inicio y fin');
  });
});

import { DialogoEtiquetasAdmin } from '../src/componentes/DialogoEtiquetasAdmin';
import { DialogoRenombrar } from '../src/componentes/DialogoRenombrar';
import { DialogoSprint } from '../src/componentes/DialogoSprint';

describe('Renombrar negocio, administrar etiquetas y nuevo sprint', () => {
  const nada = () => {};
  it('renombrar: lista de negocios, el elegido y el aviso de a cuántas actividades afecta', () => {
    const h = sin(renderToStaticMarkup(<DialogoRenombrar doc={doc} inicial="Calidad" onRenombrar={nada} onCerrar={nada} />));
    expect(h).toContain('Renombrar negocio'); expect(h).toContain('<option value="Calidad"'); expect(h).toContain('Es el mismo nombre.'); expect(h).toContain('Se puede deshacer con Ctrl+Z');
  });
  it('etiquetas: cada una con su color, nombre editable, conteo y borrar; sólo lectura si no se edita', () => {
    const h = (ed: boolean) => sin(renderToStaticMarkup(<DialogoEtiquetasAdmin doc={doc} editando={ed} onRenombrar={nada} onColor={nada} onBorrar={nada} onCerrar={nada} />));
    expect(h(true)).toContain('Administrar etiquetas'); expect(h(true)).toContain('class="etq-adm-nom"'); expect(h(true)).toContain('3 actividades'); expect(h(true)).toContain('aria-label="Borrar"');
    expect(h(false)).toContain('disabled=""'); expect(h(false)).toContain('Toma el archivo para editar las etiquetas');
  });
  it('sprint: nombre y fechas sugeridas, estados y negocios por elegir, resumen', () => {
    const h = sin(renderToStaticMarkup(<DialogoSprint doc={doc} archivo="proyecto-demo.md" hoy="2026-11-06" onCrear={nada} onCerrar={nada} />));
    expect(h).toContain('Nuevo sprint'); expect(h).toContain('Lanzamiento Portal de Clientes · Sprint 2'); expect(h).toContain('value="2026-12-19"'); expect(h).toContain('Copiar las actividades en estado');
    expect(h).toContain('Se copiarán'); expect(h).toContain('12 actividades'); expect(h).toContain('Crear sprint'); expect(h).toContain('Regresar las &quot;En progreso&quot; a &quot;Planeado&quot;');
  });
});

import { BarraPresentacion } from '../src/componentes/BarraPresentacion';
import { DialogoAtajos } from '../src/componentes/DialogoAtajos';
import { DialogoIcs } from '../src/componentes/DialogoIcs';

describe('Calendario .ics, atajos y presentación', () => {
  const nada = () => {};
  it('.ics: opciones, conteo y descarga', () => {
    const h = sin(renderToStaticMarkup(<DialogoIcs doc={doc} archivo="p.md" usuario="Ana" visibles={doc.actividades} onExportar={nada} onCerrar={nada} />));
    for (const s of ['Exportar al calendario', 'Solo las mías', '(Ana)', 'Las que se ven con los filtros actuales', 'Incluir terminadas y canceladas', 'Recordatorio la tarde anterior', 'Se exportarán', 'Descargar .ics']) expect(h).toContain(s);
    const sin_ = sin(renderToStaticMarkup(<DialogoIcs doc={doc} archivo="p.md" usuario="" visibles={[]} onExportar={nada} onCerrar={nada} />));
    expect(sin_).toContain('indica tu nombre primero'); expect(sin_).toContain('disabled=""');
  });
  it('atajos: secciones y teclas', () => {
    const h = sin(renderToStaticMarkup(<DialogoAtajos onCerrar={nada} />));
    for (const s of ['Atajos de teclado', 'General', 'Vistas', 'Editar', 'Presentación', '<kbd>Ctrl</kbd>', 'Línea de tiempo', 'Funcionan cuando no estás escribiendo']) expect(h).toContain(s);
  });
  it('barra de presentación: avance, vistas, negocio, letra y salir', () => {
    const h = sin(renderToStaticMarkup(<BarraPresentacion proyecto="P" fecha="Viernes" pct={25} ritmo="Atrasado" vencidas={2} vista="kanban" onVista={nada} negocio="Calidad · 1 de 9" onNegocio={nada} onZoom={nada} onSalir={nada} />));
    for (const s of ['class="pres-barra"', '<b>25%</b> terminado', 'Atrasado', '2 vencidas', 'class="on">Tablero', 'Calidad · 1 de 9', 'A−', 'A+', 'Salir']) expect(h).toContain(s);
  });
});

import { DialogoImagenes } from '../src/componentes/DialogoImagenes';
describe('Imágenes (ventana original)', () => {
  const docImg = { ...doc, imagenes: [{ act: 5, fecha: '2026-11-03T10:00:00.000Z', autor: 'Pedro', nombre: 'diagrama.png', archivo: 'p-imagenes/5-a.png' }] };
  const alm = (disponible: boolean) => ({ imagenesDisponibles: () => disponible, imagenesAcceso: async () => false } as never);
  const h = (disponible: boolean, ok = true, d = docImg) => sin(renderToStaticMarkup(<DialogoImagenes doc={d} id={5} archivo="proyecto-demo.md" almacen={alm(disponible)} escritura={{ ok, msg: ok ? 'Se guarda directo en el archivo compartido; no necesitas tomarlo.' : 'Ana está editando el archivo' }} onAgregar={async () => true} onBorrar={() => {}} onCerrar={() => {}} />));
  it('título, carpeta, galería con autor y aviso de acceso a la carpeta', () => {
    const x = h(true);
    for (const s of ['Autenticación y roles', '1 imagen', 'proyecto-demo-imagenes', 'class="img-it"', 'diagrama.png', 'Pedro', 'da acceso a la carpeta donde está', 'Dar acceso a la carpeta', 'Arrastra imágenes aquí', 'Elegir imágenes', 'no necesitas tomarlo']) expect(x).toContain(s);
  });
  it('navegador sin carpetas: avisa y no ofrece agregar; sin permiso de escritura tampoco', () => {
    const x = h(false); expect(x).toContain('abre el .md desde su carpeta con Chrome o Edge'); expect(x).not.toContain('Elegir imágenes');
    const y = h(true, false); expect(y).not.toContain('Elegir imágenes'); expect(y).not.toContain('aria-label="Eliminar imagen"'); expect(y).toContain('Ana está editando');
  });
  it('sin imágenes: mensaje vacío', () => expect(h(true, true, { ...doc, imagenes: [] })).toContain('Aún no hay imágenes en esta actividad.'));
});

import { DialogoUsuario } from '../src/componentes/DialogoUsuario';
describe('Nombre de usuario (sin window.prompt)', () => {
  it('pide el nombre con explicación y no deja guardar vacío', () => {
    const h = sin(renderToStaticMarkup(<DialogoUsuario inicial="" onListo={() => {}} />));
    expect(h).toContain('¿Cómo te llamas?'); expect(h).toContain('quién hizo cada cambio'); expect(h).toContain('disabled=""');
    expect(sin(renderToStaticMarkup(<DialogoUsuario inicial="Ana" onListo={() => {}} />))).toContain('value="Ana"');
  });
});
