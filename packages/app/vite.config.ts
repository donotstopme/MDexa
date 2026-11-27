import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const raiz = new URL('../../', import.meta.url);
const PLANTILLA = `// Personalización de MDexa: cambia el nombre y pon tu imagen (logo.png) en esta misma carpeta.
window.MDEXA_CONFIG = {
  nombre: 'MDexa'
};
`;

/**
 * Personalización: en desarrollo se usan los mismos mdexa-config.js y logo.png de la raíz del proyecto (los de
 * mdexa.html). Al compilar sólo se deja la plantilla neutra, para que ningún instalador lleve una marca propia.
 */
const marca = (): Plugin => ({
  name: 'mdexa-marca',
  configureServer(servidor) {
    servidor.middlewares.use((req, res, sigue) => {
      const nombre = (req.url || '').split('?')[0].slice(1);
      if (nombre !== 'mdexa-config.js' && nombre !== 'logo.png') return sigue();
      try {
        const datos = readFileSync(new URL(nombre, raiz));
        res.setHeader('content-type', nombre.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'image/png');
        res.setHeader('cache-control', 'no-store');
        res.end(datos);
      } catch { res.statusCode = 404; res.end(); }
    });
  },
  generateBundle() { this.emitFile({ type: 'asset', fileName: 'mdexa-config.js', source: PLANTILLA }); },
});

export default defineConfig({ plugins: [react(), marca()], base: './' });
