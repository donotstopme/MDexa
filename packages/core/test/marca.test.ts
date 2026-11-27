import { describe, expect, it } from 'vitest';
import { limpiaMarca, nombreEnConfig, NOMBRE_APP, ponerNombreApp } from '../src';

describe('personalización', () => {
  it('limpia el nombre y cae al original', () => {
    expect(limpiaMarca('  A&B <b>"x"  ')).toBe('A&B bx');
    for (const v of [undefined, '', '   ', 5]) expect(limpiaMarca(v)).toBe('MDexa');
    expect(limpiaMarca('x'.repeat(80))).toHaveLength(40);
  });
  it('lee el nombre de mdexa-config.js sin ejecutarlo', () => {
    expect(nombreEnConfig("// nombre: 'comentado'\nwindow.MDEXA_CONFIG = {\n  nombre: 'Mi Empresa'\n};")).toBe('Mi Empresa');
    expect(nombreEnConfig('window.MDEXA_CONFIG = { "nombre": "O\'Brien" };')).toBe("O'Brien");
    expect(nombreEnConfig("x = { nombre: 'D\\'Angelo' }")).toBe("D'Angelo");
    expect(nombreEnConfig('alert(1)')).toBeUndefined();
  });
  it('cambia el nombre mostrado', () => { ponerNombreApp('Taller'); expect(NOMBRE_APP).toBe('Taller'); ponerNombreApp(undefined); expect(NOMBRE_APP).toBe('MDexa'); });
});
