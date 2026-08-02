/**
 * Express application factory: middleware, static assets, Elearn SPA, ops routes, SSR catch-all.
 */

import type { Express, Request, Response } from 'express';
import express from 'express';
import compression from 'compression';
import { existsSync } from 'fs';
import { join } from 'path';
import type { AngularNodeAppEngine } from '@angular/ssr/node';
import { getCacheConfig } from '../server.cache.config';
import { createCacheAdapter, type CacheAdapter } from '../server.cache.adapter';
import { performanceMonitor } from '../server.performance';
import { cdnCacheMiddleware } from './middleware/cdn.middleware';
import { securityHeadersMiddleware } from './middleware/security-headers.middleware';
import { requestTimingMiddleware } from './middleware/request-timing.middleware';
import {
  mountElearnSpaIfPresent,
  registerElearnStaticAssetShortcut,
  resolveElearnBrowserFolder,
  resolveElearnCheckoutDevRedirect,
  resolveElearnDevRedirectUrl,
  isLocalDevServer,
} from './ssr-handler/elearn-spa';
import { registerSsrCatchAll, warmHtmlCache, type SsrCatchAllDeps } from './ssr-handler/ssr-catch-all';
import { resolveBrowserDistFolder } from './utils/dist-paths';
import { registerApiBackendProxy } from './api-backend-proxy';
import { registerSeoBackendProxy } from './seo-backend-proxy';
import { registerGoneUrls, registerTenantPortalNoIndex, registerLegacyBlogHostRedirect, registerWwwCanonicalRedirect } from './seo-policy';

export interface CreateProductionServerOptions {
  /** Directory containing `server.mjs` (Angular SSR entry). Use `dirname(fileURLToPath(import.meta.url))` from `server.ts` only. */
  serverDistFolder: string;
}

export interface ProductionServerResult {
  app: Express;
  angularApp: AngularNodeAppEngine;
  browserDistFolder: string;
  elearnBrowserFolder: string;
  htmlCache: CacheAdapter;
  isProd: boolean;
  warmCache: () => Promise<void>;
}

export function createProductionServer(
  angularApp: AngularNodeAppEngine,
  options: CreateProductionServerOptions
): ProductionServerResult {
  const serverDistFolder = options.serverDistFolder;
  const browserDistFolder = resolveBrowserDistFolder(serverDistFolder);
  const elearnBrowserFolder = resolveElearnBrowserFolder(serverDistFolder);

  // SSR builds emit index.csr.html; CSR-only builds emit index.html.
  const hasIndex =
    existsSync(join(browserDistFolder, 'index.html')) ||
    existsSync(join(browserDistFolder, 'index.csr.html'));
  if (!hasIndex) {
    console.error(
      `[SSR] index(.csr).html not found in ${browserDistFolder}. ` +
        `Run \`ng build site\` from frontend/oilandgasclub, or set BROWSER_DIST_FOLDER to your browser output. ` +
        `cwd=${process.cwd()} serverDist=${serverDistFolder}`
    );
  }

  const app = express();
  const isProd = process.env['NODE_ENV'] === 'production';

  // --- Checkout on :4200 → live elearn ng serve on :4201 (must run before any static/SPA) ---
  if (isLocalDevServer()) {
    const redirectCheckoutToElearnDev = (req: Request, res: Response): void => {
      const path = req.path || '/';
      const target = resolveElearnCheckoutDevRedirect(path, req.originalUrl || path);
      if (target) {
        res.redirect(302, target);
        return;
      }
      res.status(502).type('text/plain').send(
        'Checkout requires the Elearn dev server. Run: npm run start:elearn (port 4201) or npm run start:both'
      );
    };
    app.get('/checkout', redirectCheckoutToElearnDev);
    app.get('/checkout/{*splat}', redirectCheckoutToElearnDev);
    console.log('[SSR] Local dev: /checkout/* → http://localhost:4201/checkout/*');
  }

  const cacheConfig = getCacheConfig();
  const htmlCache = createCacheAdapter({
    type: cacheConfig.type,
    redisUrl: cacheConfig.redis?.url,
    redisKeyPrefix: cacheConfig.redis?.keyPrefix,
    memoryConfig: cacheConfig.memory,
  });

  // --- Global middleware (order matters) ---
  app.disable('x-powered-by');
  app.use(securityHeadersMiddleware);
  app.use(requestTimingMiddleware);
  app.use(compression({ threshold: 1024 }));

  // --- Dev: proxy /api to Kestrel so Elearn can call same-origin /api on localhost:4200 ---
  registerApiBackendProxy(app, !isProd);

  // --- SEO: company tenant portals ({sub}.oilandgasclub.com) are private apps —
  // noindex every response + Disallow-all robots.txt (before the public SEO proxy) ---
  registerTenantPortalNoIndex(app);

  // --- SEO: legacy blog.* / www.blog.* → one-hop 301 to apex (lowercase path) ---
  registerLegacyBlogHostRedirect(app);

  // --- SEO: www.oilandgasclub.com → apex (one hop; safety net if nginx misses) ---
  registerWwwCanonicalRedirect(app);

  // --- SEO: sitemap + robots from .NET (before static + SSR; Angular must not own these routes) ---
  registerSeoBackendProxy(app);

  // --- SEO: permanently removed URLs answer 410 Gone (never 404/500) ---
  registerGoneUrls(app);

  // --- Split dev: redirect remaining Elearn shell paths to ng serve ---
  app.use((req, res, next) => {
    if (!isLocalDevServer() || (req.method !== 'GET' && req.method !== 'HEAD')) {
      return next();
    }
    const path = req.path || '/';
    const target = resolveElearnDevRedirectUrl(path, req.originalUrl || path);
    if (target) {
      res.redirect(302, target);
      return;
    }
    next();
  });

  // --- Elearn hashed assets (before site static) ---
  registerElearnStaticAssetShortcut(app, elearnBrowserFolder);

  // --- Site browser build: long-cache immutable filenames ---
  app.use(
    express.static(browserDistFolder, {
      maxAge: '1y',
      index: false,
      etag: true,
      lastModified: true,
      immutable: true,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    })
  );

  // --- Legacy redirects (SEO / bookmarks) ---
  // Alternate spelling → the real route (only /forget-password serves 200).
  app.get('/forgot-password', (req, res) => {
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, `/forget-password${query}`);
  });

  app.get('/course/auth/:path', (req, res) => {
    const authPath = (req.params['path'] || 'login').toString().trim() || 'login';
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, `/${encodeURIComponent(authPath)}${query}`);
  });

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const p = req.path || '';
    if (p !== '/auth' && !p.startsWith('/auth/')) {
      return next();
    }
    const tail = p === '/auth' ? '' : p.slice('/auth/'.length);
    const target = tail ? `/${tail}` : '/login';
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, target + query);
  });

  app.get(/^\/course\/([^/?#]+)\/?$/, (req, res, next) => {
    const path = req.path || '';
    const segment = (req.params?.[0] || '').toString();
    if (
      /^\/course\/(?:app|auth|student|admin)(?:\/|$)/i.test(path) ||
      /\.[a-z0-9]+$/i.test(segment)
    ) {
      next();
      return;
    }
    const slug = segment.trim();
    if (!slug) {
      next();
      return;
    }
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, `/${encodeURIComponent(slug)}${query}`);
  });

  // /courses/:slug → /:slug (Angular also navigates client-side; Express must 301
  // so Google never sees a soft-200 homepage duplicate for this alias).
  app.get(/^\/courses\/([^/?#]+)\/?$/, (req, res, next) => {
    const segment = (req.params?.[0] || '').toString().trim();
    if (!segment || /\.[a-z0-9]+$/i.test(segment)) {
      next();
      return;
    }
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, `/${encodeURIComponent(segment)}${query}`);
  });

  app.get(/^\/events\/([^/?#]+)\/?$/, (req, res, next) => {
    const path = req.path || '';
    const segment = (req.params?.[0] || '').toString();
    if (/^\/events\/(?:payment)(?:\/|$)/i.test(path) || /\.[a-z0-9]+$/i.test(segment)) {
      next();
      return;
    }
    const slug = segment.trim();
    if (!slug) {
      next();
      return;
    }
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, `/${encodeURIComponent(slug)}${query}`);
  });

  // --- Trailing-slash policy: canonical format has NO trailing slash ---
  // /affiliate-program/ → 301 /affiliate-program (query preserved, one hop).
  // Registered AFTER the legacy /course//events handlers above so e.g.
  // /course/x/ still reaches its final target in a single 301.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const path = req.path || '/';
    if (path.length <= 1 || !path.endsWith('/')) {
      return next();
    }
    // Never rewrite asset-like paths (contain a file extension).
    if (/\.[a-z0-9]+\/$/i.test(path)) {
      return next();
    }
    const stripped = path.replace(/\/+$/, '') || '/';
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    res.redirect(301, stripped + query);
  });

  // --- Elearn SPA mounts (never SSR) ---
  mountElearnSpaIfPresent(app, elearnBrowserFolder);

  // --- Health (load balancers) ---
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // --- Ops: cache + performance ---
  app.get('/cache-stats', async (req, res) => {
    const stats = htmlCache.getStats();
    const hitRate = stats.hits + stats.misses > 0 ? (stats.hits / (stats.hits + stats.misses)) * 100 : 0;
    let keyCount = stats.keys;
    if (cacheConfig.type === 'redis') {
      try {
        const keys = await htmlCache.keys();
        keyCount = keys.length;
      } catch (error) {
        console.warn('Failed to get Redis key count:', error);
      }
    }
    res.json({
      cacheType: cacheConfig.type,
      keys: keyCount,
      hits: stats.hits,
      misses: stats.misses,
      hitRate: `${hitRate.toFixed(2)}%`,
      ksize: `${(stats.ksize / 1024).toFixed(2)} KB`,
      vsize: `${(stats.vsize / 1024 / 1024).toFixed(2)} MB`,
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/cache/invalidate', express.json(), async (req, res) => {
    const { pattern, purgeCDN } = req.body as { pattern?: string; purgeCDN?: boolean };
    if (!pattern) {
      return res.status(400).json({ error: 'Pattern is required' });
    }
    try {
      const keys = await htmlCache.keys();
      const matchingKeys = keys.filter((key: string) => key.includes(pattern));
      for (const key of matchingKeys) {
        const result = htmlCache.del(key);
        if (result instanceof Promise) {
          await result;
        }
      }
      let cdnPurged = false;
      if (purgeCDN === true) {
        const { purgeCDNCache } = await import('./middleware/cdn.middleware');
        const cdnProvider = (process.env['CDN_TYPE'] || 'cloudflare') as 'cloudflare' | 'cloudfront' | 'fastly';
        cdnPurged = await purgeCDNCache(`page:${pattern}`, cdnProvider);
      }
      return res.json({
        success: true,
        invalidated: matchingKeys.length,
        keys: matchingKeys,
        cdnPurged,
        message: `Invalidated ${matchingKeys.length} cache entries matching "${pattern}"${cdnPurged ? ' (CDN cache also purged)' : ''}`,
      });
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return res.status(500).json({ error: 'Failed to invalidate cache' });
    }
  });

  app.post('/cache/clear', async (_req, res) => {
    try {
      const result = htmlCache.flushAll();
      if (result instanceof Promise) {
        await result;
      }
      res.json({ success: true, message: 'All cache cleared' });
    } catch (error) {
      console.error('Cache clear error:', error);
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

  app.get('/performance-stats', (req, res) => {
    const timeRange = parseInt((req.query.minutes as string) || '60', 10);
    res.json({
      performance: performanceMonitor.getStats(timeRange),
      system: performanceMonitor.getSystemMetrics(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/performance-metrics', (req, res) => {
    const limit = parseInt((req.query.limit as string) || '100', 10);
    const metrics = performanceMonitor.getRecentMetrics(limit);
    res.json({
      metrics,
      count: metrics.length,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(cdnCacheMiddleware);

  const ssrDeps: SsrCatchAllDeps = {
    angularApp,
    browserDistFolder,
    elearnBrowserFolder,
    htmlCache,
    cacheConfig,
    isProd,
  };

  registerSsrCatchAll(app, ssrDeps);

  // Final safety net: without this, `next(error)` reaches Express's default
  // handler, which renders a raw 500 page (with a stack trace outside
  // NODE_ENV=production). Log internals; send a clean 500 — reserved for
  // genuinely unexpected failures only.
  app.use((err: Error, _req: Request, res: Response, _next: (e?: unknown) => void) => {
    console.error('[SSR] Unhandled server error:', err);
    if (res.headersSent) {
      return;
    }
    res.status(500).type('text/plain').send('Internal Server Error');
  });

  const warmCache = () => warmHtmlCache(ssrDeps);

  return {
    app,
    angularApp,
    browserDistFolder,
    elearnBrowserFolder,
    htmlCache,
    isProd,
    warmCache,
  };
}
