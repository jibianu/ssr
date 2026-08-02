/**
 * Proxies /sitemap.xml to the .NET API host. /robots.txt is served as a static file from the browser build.
 * Set SSR_API_URL or PUBLIC_API_URL to the API origin (strip trailing /api if present).
 *
 * Uses Node http/https (not fetch): ASP.NET Core often redirects HTTP→HTTPS; fetch() then fails on
 * the dev HTTPS certificate. We disable TLS verification only for localhost/127.0.0.1 in development.
 */

import * as http from 'node:http';
import * as https from 'node:https';
import type { Express, Request, Response } from 'express';

const MAX_REDIRECTS = 5;

/** API base URL may end with /api/ — SEO endpoints live on the host root, not under /api. */
export function normalizeApiBaseToOrigin(apiBase: string): string {
  let u = apiBase.trim().replace(/\/+$/, '');
  if (u.toLowerCase().endsWith('/api')) {
    u = u.slice(0, -4);
  }
  return u;
}

/** Prefer loopback IP so we avoid IPv6 ::1 vs 127.0.0.1 mismatches with Kestrel. */
const DEV_DEFAULT_API_ORIGIN = 'https://127.0.0.1:52287';

export function resolveBackendOriginForSeo(): string | null {
  const raw =
    process.env['SSR_API_URL'] ||
    process.env['PUBLIC_API_URL'] ||
    (process.env['NODE_ENV'] === 'development' ? DEV_DEFAULT_API_ORIGIN : '');
  if (!raw.trim()) {
    return null;
  }
  return normalizeApiBaseToOrigin(raw);
}

function isLocalDevHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function allowInsecureLocalTls(hostname: string): boolean {
  return process.env.NODE_ENV === 'development' && isLocalDevHost(hostname);
}

function requestBackend(
  targetUrl: string,
  redirectDepth: number
): Promise<{ status: number; body: string; contentType?: string }> {
  if (redirectDepth > MAX_REDIRECTS) {
    return Promise.reject(new Error('Too many redirects'));
  }

  return new Promise((resolve, reject) => {
    let u: URL;
    try {
      u = new URL(targetUrl);
    } catch {
      reject(new Error(`Invalid URL: ${targetUrl}`));
      return;
    }

    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const port =
      u.port ||
      (isHttps ? '443' : '80');

    const opts: http.RequestOptions = {
      hostname: u.hostname,
      port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        Accept: '*/*',
        'User-Agent': 'oilandgasclub-ssr-seo-proxy/1.0',
      },
      timeout: 15000,
    };

    if (isHttps && allowInsecureLocalTls(u.hostname)) {
      (opts as https.RequestOptions).rejectUnauthorized = false;
    }

    const req = lib.request(opts, (res) => {
      const code = res.statusCode ?? 502;
      const loc = res.headers.location;
      if (code >= 300 && code < 400 && loc) {
        res.resume();
        const next = new URL(loc, targetUrl).href;
        requestBackend(next, redirectDepth + 1).then(resolve).catch(reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer | string) => {
        chunks.push(typeof c === 'string' ? Buffer.from(c) : c);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const ct = res.headers['content-type'];
        const contentType = Array.isArray(ct) ? ct[0] : ct;
        resolve({
          status: code,
          body,
          contentType: contentType?.split(';')[0]?.trim(),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

export function registerSeoBackendProxy(app: Express): void {
  const origin = resolveBackendOriginForSeo();
  if (!origin) {
    const msg =
      'SEO proxy not configured. Set SSR_API_URL to your .NET API origin (e.g. https://127.0.0.1:52287). See scripts/serve-ssr-dev.mjs.';
    console.warn('[SEO] ' + msg);
    app.get('/sitemap.xml', (_req, res) => {
      res.status(503).type('text/plain').send(msg);
    });
    return;
  }

  // Keep the last successful response per path: if the API is briefly down,
  // Google gets a stale-but-valid sitemap (200) instead of a 5xx it records
  // as "sitemap could not be read".
  const lastGood = new Map<string, { body: string; contentType?: string }>();

  const sendServiceUnavailable = (res: Response): void => {
    res.status(503).setHeader('Retry-After', '30');
    res.type('text/plain').send('Service temporarily unavailable. Please retry.');
  };

  const proxyGet =
    (path: string) =>
    async (_req: Request, res: Response): Promise<void> => {
      const target = `${origin}${path}`;
      try {
        const { status, body, contentType } = await requestBackend(target, 0);
        if (status === 200) {
          lastGood.set(path, { body, contentType });
          if (contentType) {
            res.setHeader('Content-Type', contentType);
          }
          res.status(200).send(body);
          return;
        }
        // Upstream error: prefer serving the last known-good copy.
        const stale = lastGood.get(path);
        if (status >= 500 && stale) {
          console.warn(`[SEO] Upstream ${status} for ${target} — serving stale copy`);
          if (stale.contentType) {
            res.setHeader('Content-Type', stale.contentType);
          }
          res.status(200).send(stale.body);
          return;
        }
        if (status >= 500) {
          console.error(`[SEO] Upstream ${status} for ${target} and no cached copy`);
          sendServiceUnavailable(res);
          return;
        }
        // Pass through non-5xx statuses (e.g. 404) as-is.
        if (contentType) {
          res.setHeader('Content-Type', contentType);
        }
        res.status(status).send(body);
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        console.error(`[SEO] Proxy failed for ${target}:`, err);
        const stale = lastGood.get(path);
        if (stale) {
          if (stale.contentType) {
            res.setHeader('Content-Type', stale.contentType);
          }
          res.status(200).send(stale.body);
          return;
        }
        // No internal details in the body — they belong in the logs only.
        sendServiceUnavailable(res);
      }
    };

  app.get('/sitemap.xml', proxyGet('/sitemap.xml'));
  console.log(`[SEO] /sitemap.xml → ${origin} (robots.txt from static build)`);
}
