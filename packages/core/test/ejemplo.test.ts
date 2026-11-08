import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { creaCiclo, parseMD, toMD } from '../src';

/** El archivo de ejemplo que se publica (ejemplos/proyecto-demo.md) debe seguir siendo un archivo válido aunque se use y se edite. */
describe('ejemplos/proyecto-demo.md (el que se publica)', () => {
  const doc = parseMD(readFileSync(new URL('../../../ejemplos/proyecto-demo.md', import.meta.url), 'utf8'));
  it('se lee, tiene actividades y meta', () => {
    expect(doc.actividades.length).toBeGreaterThanOrEqual(10);
    expect(doc.meta.proyecto).not.toBe(''); expect(doc.meta.inicio < doc.meta.fin).toBe(true);
  });
  it('sobrevive a leer → guardar → leer', () => expect(parseMD(toMD(doc))).toEqual(doc));
  it('no tiene dependencias circulares ni a actividades que no existen', () => {
    const ids = new Set(doc.actividades.map(a => a.id));
    for (const a of doc.actividades) for (const d of a.depende) { expect(ids.has(d)).toBe(true); expect(creaCiclo(doc.actividades, a.id, d) && d === a.id).toBe(false); }
  });
});
