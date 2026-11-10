import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { escrituraAtomica, guardarDato, leerDato, nombreSeguro, rutaImagenSegura } from '../src/archivos';

let dir = '';
beforeEach(() => { dir = mkdtempSync(path.join(tmpdir(), 'mdexa-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('escrituraAtomica', () => {
  it('reemplaza el contenido y no deja archivos temporales', async () => {
    const f = path.join(dir, 'p.md'); writeFileSync(f, 'viejo');
    await escrituraAtomica(f, 'nuevo con acentos: ñ á é');
    expect(readFileSync(f, 'utf8')).toBe('nuevo con acentos: ñ á é');
    expect(readdirSync(dir)).toEqual(['p.md']);
  });
  it('crea el archivo si no existe', async () => {
    const f = path.join(dir, 'nuevo.md'); await escrituraAtomica(f, 'x'); expect(readFileSync(f, 'utf8')).toBe('x');
  });
  it('si la carpeta no existe falla sin dejar basura', async () => {
    await expect(escrituraAtomica(path.join(dir, 'no', 'p.md'), 'x')).rejects.toThrow();
    expect(readdirSync(dir)).toEqual([]);
  });
});

describe('rutaImagenSegura', () => {
  const md = path.join(dir || tmpdir(), 'proyecto.md');
  it('acepta carpeta-imagenes/archivo y devuelve la ruta junto al .md', () => {
    expect(rutaImagenSegura(md, 'proyecto-imagenes/5-a.png')).toBe(path.join(path.dirname(md), 'proyecto-imagenes', '5-a.png'));
  });
  it.each(['../secreto.png', 'proyecto-imagenes/../x.png', 'proyecto-imagenes/sub/x.png', 'otra/x.png', '/etc/passwd', 'proyecto-imagenes/', '', 'proyecto-imagenes/..', 'proyecto-imagenes\\x.png', 'C:/x.png', 'proyecto-imagenes/a:b.png', 'proyecto-imagenes/x\0.png'])('rechaza %j', r => {
    expect(rutaImagenSegura(md, r)).toBeNull();
  });
});

describe('nombreSeguro', () => {
  it('quita los caracteres que algún sistema no admite', () => {
    expect(nombreSeguro('a/b\\c:d*e?.md')).toBe('a-b-c-d-e-.md'); expect(nombreSeguro('  ')).toBe('actividades.md'); expect(nombreSeguro('Proyecto Ñandú.md')).toBe('Proyecto Ñandú.md');
  });
});

describe('datos locales', () => {
  it('guarda y lee valores por clave, aunque la clave traiga / o :', async () => {
    const d = path.join(dir, 'datos');
    expect(await leerDato(d, 'respaldos|p/q:r.md')).toBeUndefined();
    await guardarDato(d, 'respaldos|p/q:r.md', [{ a: 1, texto: 'ñ' }]); await guardarDato(d, 'visto|x', { f: 'y' });
    expect(await leerDato(d, 'respaldos|p/q:r.md')).toEqual([{ a: 1, texto: 'ñ' }]); expect(await leerDato(d, 'visto|x')).toEqual({ f: 'y' });
    await guardarDato(d, 'visto|x', null); expect(await leerDato(d, 'visto|x')).toBeNull();
    expect(readdirSync(d).every(n => n.endsWith('.json'))).toBe(true);
  });
  it('un archivo dañado se trata como vacío', async () => {
    const d = path.join(dir, 'datos2'); await guardarDato(d, 'k', 1);
    writeFileSync(path.join(d, readdirSync(d)[0]), '{no es json');
    expect(await leerDato(d, 'k')).toBeUndefined();
  });
});
