/**
 * Dev-only: proxy browser `/api/*` to the .NET API (SSR_API_URL / http://localhost:52288).
 * Lets Elearn use same-origin API URLs on localhost:4200 and avoids CORS failures.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import type { Express, Request, Response } from 'express';
import { normalizeApiBaseToOrigin, resolveBackendOriginForSeo } from './seo-backend-proxy';

function allowInsecureLocalTls(hostname: string): boolean {
  return process.env.NODE_ENV === 'development' && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]');
}

export function registerApiBackendProxy(app: Express, enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const origin = resolveBackendOriginForSeo() ?? normalizeApiBaseToOrigin(process.env['SSR_API_URL'] || 'http://localhost:52288/');
  if (!origin) {
    console.warn('[SSR] Dev API proxy skipped: set SSR_API_URL (e.g. http://localhost:52288/)');
    return;
  }

  console.log(`[SSR] Dev API proxy: /api/* and /certificate/* → ${origin}`);

  const proxyToBackend = (req: Request, res: Response) => {
    let target: URL;
    try {
      target = new URL(req.originalUrl, origin);
    } catch {
      res.status(502).json({ message: 'Invalid proxy target URL' });
      return;
    }

    const isHttps = target.protocol === 'https:';
    const lib = isHttps ? https : http;
    const port = target.port || (isHttps ? '443' : '80');

    const headers = { ...req.headers } as http.OutgoingHttpHeaders;
    delete headers.host;
    headers.host = target.host;

    const opts: http.RequestOptions = {
      hostname: target.hostname,
      port,
      path: target.pathname + target.search,
      method: req.method,
      headers,
    };

    if (isHttps && allowInsecureLocalTls(target.hostname)) {
      (opts as https.RequestOptions).rejectUnauthorized = false;
    }

    const proxyReq = lib.request(opts, (proxyRes) => {
      res.status(proxyRes.statusCode ?? 502);
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (value !== undefined) {
          res.setHeader(key, value);
        }
      }
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({
          message: `API proxy could not reach ${origin}. Start Elearn.Serverless and refresh.`,
          detail: err.message,
        });
      }
    });

    if (req.method === 'GET' || req.method === 'HEAD') {
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  };

  app.use('/api', proxyToBackend);
  app.use('/certificate', proxyToBackend);
}
