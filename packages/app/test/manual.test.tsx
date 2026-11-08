import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manualHtml, normaliza } from '../src/original/manual';
import { DialogoManual } from '../src/componentes/DialogoManual';

describe('Manual de uso', () => {
  const h = manualHtml();
  it('no deja marcadores sin resolver y trae íconos, insignias y teclas reales', () => {
    expect(h).not.toMatch(/\{\{/); expect(h).toContain('<svg class="ic"'); expect(h).toContain('class="tam tam-L"'); expect(h).toContain('class="pri pri-Alta"'); expect(h).toContain('<kbd>');
  });
  it('tiene las 45 secciones con su índice', () => {
    expect((h.match(/<h2 id="man-\d+"/g) || []).length).toBe(45);
    expect((h.match(/<nav>.*?<\/nav>/s)![0].match(/<a href="#man-\d+"/g) || []).length).toBe(45);
    for (const s of ['Para qué sirve', 'Trabajo en equipo', 'Tamaños', 'Línea de tiempo', 'Tablero', 'Calendario', 'Notas', 'Bitácora', 'Respaldos', 'Nuevo sprint', 'Importar y exportar', 'Imágenes', 'Dependencias', 'Subtareas', 'Deshacer', 'Reporte semanal', 'Menciones', 'Actividades recurrentes', 'Modo presentación', 'Carga por persona', 'Exportar al calendario']) expect(h).toContain(s);
  });
  it('está adaptado a esta aplicación (sin referencias al HTML original ni a funciones que no existen)', () => {
    expect(h).not.toContain('gestor-actividades.html'); expect(h).not.toContain('Explorar…'); expect(h).not.toContain('Archivos recientes'); expect(h).not.toContain('el HTML más reciente');
    expect(h).toContain('Al abrir la aplicación'); expect(h).toContain('aplicación de escritorio'); expect(h).toContain('<kbd>1</kbd> a <kbd>6</kbd>');
  });
  it('la ventana tiene buscador, resultado, imprimir y cerrar', () => {
    const d = renderToStaticMarkup(<DialogoManual onCerrar={() => {}} />);
    for (const s of ['Manual de uso', 'type="search"', 'Buscar en el manual', 'Imprimir', 'Cerrar', 'aria-live="polite"']) expect(d).toContain(s);
  });
  it('normaliza para buscar sin acentos ni mayúsculas', () => expect(normaliza('  Línea de TIEMPO ')).toBe('linea de tiempo'));
});
