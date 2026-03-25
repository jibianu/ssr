import { existsSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Browser build must live next to the server bundle: `dist/site/server/../browser`.
 * Fallback: `cwd/dist/site/browser` (if `node` is started from repo `frontend/oilandgasclub`).
 * Override: `BROWSER_DIST_FOLDER` or `SITE_BROWSER_DIST`.
 */
export function resolveBrowserDistFolder(serverEntryDir: string): string {
  const fromEnv = process.env['BROWSER_DIST_FOLDER'] || process.env['SITE_BROWSER_DIST'];
  if (fromEnv) {
    return resolve(fromEnv.trim());
  }

  const nextToServer = resolve(serverEntryDir, '../browser');
  if (existsSync(join(nextToServer, 'index.html'))) {
    return nextToServer;
  }

  const cwdDist = resolve(process.cwd(), 'dist/site/browser');
  if (existsSync(join(cwdDist, 'index.html'))) {
    return cwdDist;
  }

  return nextToServer;
}
