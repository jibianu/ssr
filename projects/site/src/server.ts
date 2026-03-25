/**
 * Angular SSR entry: load engine manifest, build Express app, export Node request handler for CLI.
 */

import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule } from '@angular/ssr/node';
import { ɵsetAngularAppEngineManifest as setAngularAppEngineManifest } from '@angular/ssr';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { createProductionServer } from './server/create-production-server';

export let reqHandler: ReturnType<typeof createNodeRequestHandler>;

const angularAppEngineManifestUrl = new URL('./angular-app-engine-manifest.mjs', import.meta.url).href;

void import(angularAppEngineManifestUrl).then(({ default: m }) => {
  setAngularAppEngineManifest(m);

  /** Always the folder that contains `server.mjs` — not a lazy chunk (fixes ../browser resolution). */
  const serverDistFolder = dirname(fileURLToPath(import.meta.url));

  const angularApp = new AngularNodeAppEngine();
  const { app, isProd, warmCache, browserDistFolder } = createProductionServer(angularApp, { serverDistFolder });

  reqHandler = createNodeRequestHandler(app);

  if (isMainModule(import.meta.url) || process.env['pm_id']) {
    const port = Number(process.env['PORT'] || 4200);
    app.listen(port, () => {
      console.log(`✅ Node Express SSR server at http://localhost:${port}`);
      console.log(`📂 Browser dist: ${browserDistFolder}`);
      console.log(`🏥 Health: GET /health`);
      if (isProd) {
        setTimeout(() => {
          warmCache().catch(console.error);
        }, 2000);
      } else {
        console.log('ℹ️ Dev mode: production HTML cache + warm-cache use shorter/no-store headers');
      }
    });
  }
});
