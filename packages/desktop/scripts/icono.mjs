// Genera build/icon.png (1024×1024): un diagrama de barras tipo línea de tiempo. Sustitúyelo por el logo real cuando exista.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
const N = 1024, R = 210, px = new Uint8Array(N * N * 4);
const tabla = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let r = 0xffffffff; for (const x of b) r = tabla[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
const trozo = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const dentro = (x, y, x0, y0, x1, y1, r) => {   // rectángulo redondeado
  if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
  const cx = x < x0 + r ? x0 + r : x >= x1 - r ? x1 - r : x, cy = y < y0 + r ? y0 + r : y >= y1 - r ? y1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const barras = [[200, 250, 640, '#2f6fed'], [330, 460, 800, '#e0a800'], [260, 670, 700, '#079455']].map(([x0, y0, x1, c]) => [x0, y0, x1, y0 + 120, c]);
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const i = (y * N + x) * 4;
  if (!dentro(x, y, 0, 0, N, N, R)) continue;
  const t = y / N; let c = [Math.round(15 + 12 * t), Math.round(29 + 25 * t), Math.round(51 + 40 * t)];
  for (const [x0, y0, x1, y1, col] of barras) if (dentro(x, y, x0, y0, x1, y1, 38)) c = hex(col);
  if (x >= 520 && x < 540 && y >= 170 && y < 850) c = [217, 45, 32];
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
}
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) { raw[y * (N * 4 + 1)] = 0; Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
mkdirSync(new URL('../build/', import.meta.url), { recursive: true });
writeFileSync(new URL('../build/icon.png', import.meta.url), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ihdr), trozo('IDAT', deflateSync(raw, { level: 9 })), trozo('IEND', Buffer.alloc(0))]));
console.log('build/icon.png listo');
