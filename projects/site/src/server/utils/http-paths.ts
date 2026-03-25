import type { Request, Response } from 'express';
import { ensureSafeRequest } from './request-safety';

export function getRequestPath(req: Request): string {
  return req.path || req.url?.split('?')[0] || req.originalUrl || '/';
}

export function getRequestUrl(req: Request): string {
  return req.url || req.originalUrl || getRequestPath(req);
}

/** True for hashed bundles, images, fonts, etc. */
export function isAssetRequest(path: string): boolean {
  return /\.[a-z0-9]+$/i.test(path);
}

export function setNoStoreHtmlHeaders(res: Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

/** `curl -sI … | findstr X-OGC-SSR` — see render | cache | stream | csr-fallback */
export function setSsrDiagnosticHeader(
  res: Response,
  value: 'render' | 'cache' | 'stream' | 'csr-fallback'
): void {
  res.setHeader('X-OGC-SSR', value);
}

export function createWarmCacheRequest(route: string): Request {
  const port = process.env['PORT'] || '4200';
  return ensureSafeRequest({
    method: 'GET',
    url: route,
    path: route,
    originalUrl: route,
    query: {},
    headers: {
      host: `localhost:${port}`,
      'x-forwarded-proto': 'http',
    },
  });
}
