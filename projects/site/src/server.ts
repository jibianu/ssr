import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import { ɵsetAngularAppEngineManifest as setAngularAppEngineManifest } from '@angular/ssr';
import express from 'express';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { EventEmitter } from 'events';
import type { Socket } from 'net';
import { getCacheConfig, isStaticRoute as checkStaticRoute } from './server.cache.config';
import { createCacheAdapter, CacheAdapter } from './server.cache.adapter';
import { performanceMonitor } from './server.performance';
import { cdnCacheMiddleware } from './server.cdn.middleware';

/** Set after `main()` runs (Angular CLI may import before listen). */
export let reqHandler: ReturnType<typeof createNodeRequestHandler>;

// Angular 20: without `outputMode: "server"`, the build does not inject the virtual module that
// calls setAngularAppEngineManifest. Load the generated file next to this bundle at startup.
const angularAppEngineManifestUrl = new URL('./angular-app-engine-manifest.mjs', import.meta.url).href;

function main(): void {
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

/** Elearn SPA (no SSR): `ng build elearn` outputs to dist/elearn/ (index.html). Override with ELEARN_BROWSER_DIST if needed. */
const elearnBrowserFolder = process.env['ELEARN_BROWSER_DIST']
  ? resolve(process.env['ELEARN_BROWSER_DIST'])
  : resolve(serverDistFolder, '../../elearn');

const app = express();
const angularApp = new AngularNodeAppEngine();
const isProd = process.env['NODE_ENV'] === 'production';

// ✅ PROXY: SSR proxy disabled - using direct backend URLs from environment config
// SSR will make direct API calls to the backend URL configured in environment.ts
// No proxy middleware needed - frontend uses full backend URLs directly

// ✅ CACHING: Initialize cache adapter (memory or Redis based on config)
const cacheConfig = getCacheConfig();
const htmlCache: CacheAdapter = createCacheAdapter({
  type: cacheConfig.type,
  redisUrl: cacheConfig.redis?.url,
  redisKeyPrefix: cacheConfig.redis?.keyPrefix,
  memoryConfig: cacheConfig.memory
});

// ✅ CACHING: Helper to check if route is static (imported from config)
function isStaticRoute(path: string): boolean {
  return checkStaticRoute(path);
}

// ✅ CACHING: Generate ETag from content hash
function generateETag(content: string): string {
  const hash = createHash('md5').update(content).digest('hex');
  return `"${hash.substring(0, 16)}"`;
}

// ✅ CACHING: Get cache headers based on route type
function getCacheHeaders(path: string, etag: string): Record<string, string> {
  if (!isProd) {
    return {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'ETag': etag,
      'Vary': 'Accept-Encoding, Cookie',
      'X-Content-Type-Options': 'nosniff'
    };
  }

  const isStatic = isStaticRoute(path);
  
  if (isStatic) {
    // Static pages: Cache for 1 hour, revalidate with ETag, allow stale-while-revalidate
    return {
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400, must-revalidate',
      'ETag': etag,
      'Vary': 'Accept-Encoding',
      'X-Content-Type-Options': 'nosniff'
    };
  }
  
  // Dynamic pages: Short cache, must revalidate
  return {
    'Cache-Control': 'public, max-age=60, must-revalidate',
    'ETag': etag,
    'Vary': 'Accept-Encoding, Cookie',
    'X-Content-Type-Options': 'nosniff'
  };
}

// ✅ SAFETY: Normalize request/socket before SSR so Angular internals never access undefined properties
function ensureSafeSocket(existing?: Socket): Socket {
  if (existing) {
    if (typeof (existing as any).encrypted === 'undefined') {
      (existing as any).encrypted = false;
    }
    return existing;
  }

  const socket = new EventEmitter() as unknown as Socket;
  (socket as any).encrypted = false;
  (socket as any).remoteAddress = '127.0.0.1';
  return socket;
}

function ensureSafeRequest(req?: Partial<express.Request>): express.Request {
  if (req) {
    const socket = ensureSafeSocket(req.socket as Socket | undefined);
    if (!(req as any).socket) {
      (req as any).socket = socket;
    } else if (req.socket !== socket) {
      (req as any).socket = socket;
    }
    if (!(req as any).connection) {
      (req as any).connection = socket;
    }
    if (!(req as any).headers) {
      (req as any).headers = {};
    }
    if (!(req as any).headers.host) {
      (req as any).headers.host = `localhost:${process.env['PORT'] || 4200}`;
    }
    if (!(req as any).protocol) {
      (req as any).protocol = 'http';
    }
    return req as express.Request;
  }

  const socket = ensureSafeSocket();
  const safeReq = {
    method: 'GET',
    url: '/',
    originalUrl: '/',
    path: '/',
    headers: {},
    query: {},
    socket,
    connection: socket,
  } as express.Request;

  return safeReq;
}

function getRequestPath(req: express.Request): string {
  return req.path || req.url?.split('?')[0] || req.originalUrl || '/';
}

function getRequestUrl(req: express.Request): string {
  return req.url || req.originalUrl || getRequestPath(req);
}

function isAssetRequest(path: string): boolean {
  return /\.[a-z0-9]+$/i.test(path);
}

function setNoStoreHtmlHeaders(res: express.Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function getCacheKey(request: express.Request | undefined): string {
  const req = ensureSafeRequest(request);
  const userPart = req.headers.authorization ? 'auth' : 'guest';
  const queryPart = JSON.stringify(req.query || {});
  return `ssr:${getRequestPath(req)}:${queryPart}:${userPart}`;
}

function createWarmCacheRequest(route: string): express.Request {
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

/** Elearn routes mounted at site root (same SPA as /course, /auth); see AUTH_ROUTES in elearn app. */
function isElearnSpaRootPath(requestPath: string): boolean {
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  const roots = new Set([
    '/login',
    '/register',
    '/callback',
    '/google-callback',
    '/forget-password',
    '/verification',
    '/fg-code',
    '/change-password',
    '/user-unavailable',
    '/register-company',
    '/register-trainer',
    '/register-affiliate',
    '/register-management',
  ]);
  if (roots.has(p)) return true;
  if (/^\/register\/[^/]+$/.test(p)) return true;
  if (p === '/checkout' || p.startsWith('/checkout/')) return true;
  return false;
}

// 1️⃣ Prefer Elearn hashed bundles when the file exists (unified build baseHref /).
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  if (!existsSync(elearnBrowserFolder)) {
    return next();
  }
  const p = getRequestPath(ensureSafeRequest(req));
  if (!isAssetRequest(p)) {
    return next();
  }
  const rel = p.replace(/^\//, '');
  const candidates = [join(elearnBrowserFolder, rel), join(elearnBrowserFolder, 'browser', rel)];
  for (const fp of candidates) {
    try {
      if (existsSync(fp) && statSync(fp).isFile()) {
        res.sendFile(resolve(fp));
        return;
      }
    } catch {
      /* ignore */
    }
  }
  return next();
});

// 1️⃣ Serve static assets
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    etag: true,
    lastModified: true
  }),
);

// Legacy /course/auth/* → canonical root auth paths (/login, /register, …).
app.get('/course/auth/:path', (req, res) => {
  const authPath = (req.params['path'] || 'login').toString().trim() || 'login';
  const queryIdx = req.originalUrl.indexOf('?');
  const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
  res.redirect(301, `/${encodeURIComponent(authPath)}${query}`);
});

// Legacy /auth/* (Elearn used to be mounted here) → /login, /register, …
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  const p = getRequestPath(ensureSafeRequest(req));
  if (p !== '/auth' && !p.startsWith('/auth/')) {
    return next();
  }
  const tail = p === '/auth' ? '' : p.slice('/auth/'.length);
  const target = tail ? `/${tail}` : '/login';
  const queryIdx = req.originalUrl.indexOf('?');
  const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
  res.redirect(301, target + query);
});

// Legacy public-course URL redirect: /course/:slug -> /:slug
app.get(/^\/course\/([^/?#]+)\/?$/, (req, res, next) => {
  const path = req.path || '';
  const segment = (req.params?.[0] || '').toString();
  // Keep Elearn auth/app paths and static assets under /course untouched.
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

// Legacy public-event URL redirect: /events/:slug -> /:slug
app.get(/^\/events\/([^/?#]+)\/?$/, (req, res, next) => {
  const path = req.path || '';
  const segment = (req.params?.[0] || '').toString();
  // Keep non-detail event routes (e.g. payment callbacks) and static assets untouched.
  if (
    /^\/events\/(?:payment)(?:\/|$)/i.test(path) ||
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

// 1b️⃣ Elearn (student dashboard / course player): SPA only — must run BEFORE SSR catch-all.
// Production: baseHref /Elearn/ or /course/ (Docker unified domain) — assets under that prefix
// Optional: build elearn with baseHref /app/ if you only mount /app (see docs/NGINX_SSR.md).
//
// Elearn dist/index.html ships with `<base href="/">`. Serving it under /auth or /course without
// patching makes `styles.css` + `main.js` resolve to the site root → 404. Patch base to the mount.
/** Memoized patched HTML per mount path (same index file on disk). */
const elearnPatchedIndexHtml = new Map<string, string>();

function patchElearnIndexBaseHref(html: string, mountPath: string): string {
  const base = mountPath.endsWith('/') ? mountPath : `${mountPath}/`;
  return html.replace(/<base\s+href="[^"]*"/i, `<base href="${base}"`);
}

function sendElearnSpaIndex(res: express.Response, mountPath: string, indexPath: string): void {
  const cacheKey = `${mountPath}:${indexPath}`;
  let html = elearnPatchedIndexHtml.get(cacheKey);
  if (!html) {
    const raw = readFileSync(indexPath, 'utf-8');
    html = patchElearnIndexBaseHref(raw, mountPath);
    elearnPatchedIndexHtml.set(cacheKey, html);
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  setNoStoreHtmlHeaders(res);
  res.send(html);
}

function mountElearnSpaIfPresent(): void {
  const indexFile = join(elearnBrowserFolder, 'index.html');
  if (!existsSync(indexFile)) {
    console.log(
      `[SSR] Elearn browser not found at ${elearnBrowserFolder} — skip Elearn SPA mounts. ` +
        `Build: ng build elearn --configuration production (or unified for /course)`
    );
    return;
  }
  const staticOpts = { maxAge: '1y' as const, index: false, etag: true, lastModified: true };
  const mountSpa = (mountPath: string) => {
    app.use(mountPath, express.static(elearnBrowserFolder, staticOpts));
    const sendSpa = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Keep public course detail routes SSR-rendered.
      // Example: /course/api-570-closed-book-mock-exam-comprehensive-preparation
      if (
        mountPath === '/course' &&
        /^\/course\/[^/?#]+\/?$/.test(req.path) &&
        !/^\/course\/(?:app|auth|student|admin)(?:\/|$)/i.test(req.path)
      ) {
        next();
        return;
      }
      sendElearnSpaIndex(res, mountPath, indexFile);
    };
    // Express 5 + path-to-regexp v8: named splat — RegExp routes can lose to `/{*splat}` SSR.
    app.get(mountPath, sendSpa);
    app.get(`${mountPath}/{*splat}`, sendSpa);
  };
  console.log(
    `[SSR] Elearn SPA: ${elearnBrowserFolder} → /login, /register, /checkout, /course/*, /auth/*, /Elearn/*, /app/*`
  );
  mountSpa('/course');
  mountSpa('/auth');
  mountSpa('/Elearn');
  mountSpa('/app');
}
mountElearnSpaIfPresent();

// ✅ CACHING: Cache statistics endpoint (for monitoring)
app.get('/cache-stats', async (req, res) => {
  const stats = htmlCache.getStats();
  const hitRate = stats.hits + stats.misses > 0 
    ? (stats.hits / (stats.hits + stats.misses)) * 100 
    : 0;
  
  // Get actual key count for Redis
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
    timestamp: new Date().toISOString()
  });
});

// ✅ CACHING: Cache invalidation endpoint (for cache management)
app.post('/cache/invalidate', express.json(), async (req, res) => {
  const { pattern, purgeCDN } = req.body;
  
  if (!pattern) {
    return res.status(400).json({ error: 'Pattern is required' });
  }
  
  try {
    const keys = await htmlCache.keys();
    const matchingKeys = keys.filter((key: string) => key.includes(pattern));
    
    // Delete all matching keys (supports both sync and async)
    for (const key of matchingKeys) {
      const result = htmlCache.del(key);
      if (result instanceof Promise) {
        await result;
      }
    }
    
    // ✅ CDN: Optionally purge CDN cache if requested
    let cdnPurged = false;
    if (purgeCDN === true) {
      const { purgeCDNCache } = await import('./server.cdn.middleware.js');
      const cdnProvider = (process.env['CDN_TYPE'] || 'cloudflare') as 'cloudflare' | 'cloudfront' | 'fastly';
      cdnPurged = await purgeCDNCache(`page:${pattern}`, cdnProvider);
    }
    
    return res.json({
      success: true,
      invalidated: matchingKeys.length,
      keys: matchingKeys,
      cdnPurged,
      message: `Invalidated ${matchingKeys.length} cache entries matching "${pattern}"${cdnPurged ? ' (CDN cache also purged)' : ''}`
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return res.status(500).json({ error: 'Failed to invalidate cache' });
  }
});

// ✅ CACHING: Clear all cache endpoint (for cache reset)
app.post('/cache/clear', async (req, res) => {
  try {
    const result = htmlCache.flushAll();
    if (result instanceof Promise) {
      await result;
    }
    res.json({
      success: true,
      message: 'All cache cleared'
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ✅ PERFORMANCE: Performance stats endpoint
app.get('/performance-stats', (req, res) => {
  const timeRange = parseInt(req.query.minutes as string || '60', 10);
  const stats = performanceMonitor.getStats(timeRange);
  const system = performanceMonitor.getSystemMetrics();
  
  res.json({
    performance: stats,
    system,
    timestamp: new Date().toISOString()
  });
});

// ✅ PERFORMANCE: Recent metrics endpoint
app.get('/performance-metrics', (req, res) => {
  const limit = parseInt(req.query.limit as string || '100', 10);
  const metrics = performanceMonitor.getRecentMetrics(limit);
  
  res.json({
    metrics,
    count: metrics.length,
    timestamp: new Date().toISOString()
  });
});

// ✅ CDN: Add CDN cache headers middleware before SSR
app.use(cdnCacheMiddleware);

// 2️⃣ SSR with caching middleware (Express 5 / path-to-regexp v8: use named splat, not '*')
app.get('/{*splat}', async (req, res, next) => {
  // ✅ PERFORMANCE: Start performance measurement
  const safeReq = ensureSafeRequest(req);
  const requestPath = getRequestPath(safeReq);
  if (isAssetRequest(requestPath)) {
    res.status(404).end();
    return;
  }
  // Elearn SPA at root URLs (/login, /register, /checkout, …) — unified build uses baseHref /.
  const elearnIndexPrimary = join(elearnBrowserFolder, 'index.html');
  const elearnIndexNested = join(elearnBrowserFolder, 'browser', 'index.html');
  const elearnIndexFile = existsSync(elearnIndexPrimary)
    ? elearnIndexPrimary
    : existsSync(elearnIndexNested)
      ? elearnIndexNested
      : '';
  if (elearnIndexFile && isElearnSpaRootPath(requestPath)) {
    sendElearnSpaIndex(res, '/', elearnIndexFile);
    return;
  }
  // Elearn SPA under /auth (legacy bookmarks); prefer /login etc. via redirect middleware.
  if (
    existsSync(elearnIndexPrimary) &&
    (requestPath === '/auth' || requestPath.startsWith('/auth/'))
  ) {
    sendElearnSpaIndex(res, '/auth', elearnIndexPrimary);
    return;
  }
  const markId = performanceMonitor.startMeasure(
    requestPath,
    safeReq.method,
    safeReq.headers['user-agent']
  );
  
  try {
    const cacheKey = getCacheKey(safeReq);
    
    // ✅ PERFORMANCE: Mark cache check start
    performanceMonitor.markCacheStart(markId);
    
    // ✅ CACHING: Check cache first (supports both sync and async)
    let cached: { html: string; etag: string } | undefined;
    if (isProd) {
      const cacheResult = htmlCache.get(cacheKey);
      if (cacheResult instanceof Promise) {
        cached = await cacheResult;
      } else {
        cached = cacheResult;
      }
    }
    
    // ✅ PERFORMANCE: Mark cache check end
    performanceMonitor.markCacheEnd(markId);
    
    if (cached) {
      const ifNoneMatch = req.headers['if-none-match'];
      
      // ✅ CACHING: Handle conditional request (304 Not Modified)
      if (ifNoneMatch === cached.etag) {
        res.status(304);
        Object.entries(getCacheHeaders(requestPath, cached.etag)).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        res.end();
        
        // ✅ PERFORMANCE: Record metrics for cache hit
        performanceMonitor.endMeasure(markId, true);
        return;
      }
      
      // ✅ CACHING: Serve cached HTML
      Object.entries(getCacheHeaders(requestPath, cached.etag)).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.send(cached.html);
      
      // ✅ PERFORMANCE: Record metrics for cache hit
      performanceMonitor.endMeasure(markId, true);
      return;
    }
    
    // ✅ PERFORMANCE: Mark render start
    performanceMonitor.markRenderStart(markId);
    
    // ✅ CACHING: Render if not cached
    const response = await angularApp.handle(safeReq);
    
    if (response) {
      // Get HTML content for caching (Response may have text() method or we need to extract differently)
      let html = '';
      try {
        // Try standard Response.text() method
        if (typeof response.text === 'function') {
          html = await response.text();
        } else {
          // Fallback: Use writeResponseToNodeResponse but capture output
          // For now, write response without caching HTML extraction
          // Cache will work on subsequent requests
          Object.entries(getCacheHeaders(requestPath, generateETag(''))).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
          writeResponseToNodeResponse(response, res);
          return;
        }
      } catch (error) {
        // If extraction fails, just send response without caching
        console.warn('Could not extract HTML for caching:', error);
        writeResponseToNodeResponse(response, res);
        return;
      }
      
      const etag = generateETag(html);
      
      // ✅ CACHING: Store in cache with appropriate TTL (supports both sync and async)
      if (isProd) {
        const ttl = isStaticRoute(requestPath) ? cacheConfig.ttl.static : cacheConfig.ttl.dynamic;
        const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
        if (setResult instanceof Promise) {
          await setResult;
        }
      }
      
      // ✅ CACHING: Set cache headers and send HTML
      Object.entries(getCacheHeaders(requestPath, etag)).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.send(html);
      
      // ✅ PERFORMANCE: Record metrics for cache miss (render happened)
      performanceMonitor.endMeasure(markId, false);
    } else {
      // ✅ FIX: If SSR returns no response, fallback to index.html for client-side routing
      // This ensures deep links work correctly on refresh or direct access
      try {
        if (isAssetRequest(requestPath)) {
          res.status(404).end();
          performanceMonitor.endMeasure(markId, false);
          return;
        }
        const indexPath = join(browserDistFolder, 'index.html');
        if (existsSync(indexPath)) {
          const html = readFileSync(indexPath, 'utf-8');
          setNoStoreHtmlHeaders(res);
          res.status(200).send(html);
          performanceMonitor.endMeasure(markId, false);
          return;
        }
      } catch (fallbackError) {
        console.warn('Could not serve index.html fallback:', fallbackError);
      }
      
      // ✅ PERFORMANCE: Record metrics even if no response
      performanceMonitor.endMeasure(markId, false);
      next();
    }
  } catch (err) {
    console.error('SSR Error:', err);
    // ✅ FIX: On SSR error, try to serve index.html as fallback
    // This prevents 404 errors when Angular SSR fails but route might be valid client-side
    try {
      if (isAssetRequest(requestPath)) {
        res.status(404).end();
        performanceMonitor.endMeasure(markId, false);
        return;
      }
      const indexPath = join(browserDistFolder, 'index.html');
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, 'utf-8');
        setNoStoreHtmlHeaders(res);
        res.status(200).send(html);
        performanceMonitor.endMeasure(markId, false);
        return;
      }
    } catch (fallbackError) {
      console.warn('Could not serve index.html fallback after SSR error:', fallbackError);
    }
    
    // ✅ PERFORMANCE: Record metrics on error
    performanceMonitor.endMeasure(markId, false);
    next(err);
  }
});

// ✅ FIX: Final fallback - serve index.html for any unmatched routes
// This ensures Angular handles routing client-side when SSR doesn't match
app.use('/{*splat}', (req, res) => {
  try {
    const path = getRequestPath(ensureSafeRequest(req));
    if (isAssetRequest(path)) {
      res.status(404).end();
      return;
    }
    const elearnIdxPrimary = join(elearnBrowserFolder, 'index.html');
    const elearnIdxNested = join(elearnBrowserFolder, 'browser', 'index.html');
    const elearnIdxFallback = existsSync(elearnIdxPrimary)
      ? elearnIdxPrimary
      : existsSync(elearnIdxNested)
        ? elearnIdxNested
        : '';
    if (elearnIdxFallback && isElearnSpaRootPath(path)) {
      sendElearnSpaIndex(res, '/', elearnIdxFallback);
      return;
    }
    if (
      existsSync(elearnIdxPrimary) &&
      (path === '/auth' || path.startsWith('/auth/'))
    ) {
      sendElearnSpaIndex(res, '/auth', elearnIdxPrimary);
      return;
    }
    const indexPath = join(browserDistFolder, 'index.html');
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8');
      setNoStoreHtmlHeaders(res);
      res.status(200).send(html);
    } else {
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('Error serving index.html fallback:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ✅ CACHING: Cache warming function (call after server starts)
async function warmCache(): Promise<void> {
  // Note: /course is the Elearn SPA (not SSR) — do not warm it here
  const popularRoutes = ['/', '/about-us', '/contact-us'];
  
  console.log(`🔥 Warming ${cacheConfig.type} cache for popular routes...`);
  
  for (const route of popularRoutes) {
    try {
      const mockReq = createWarmCacheRequest(route);
      
      const response = await angularApp.handle(mockReq);
      if (response && typeof response.text === 'function') {
        try {
          const html = await response.text();
          const etag = generateETag(html);
          const cacheKey = getCacheKey(mockReq);
          const ttl = isStaticRoute(route) ? cacheConfig.ttl.static : cacheConfig.ttl.dynamic;
          
          const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
          if (setResult instanceof Promise) {
            await setResult;
          }
          
          console.log(`✅ Cached: ${route} (TTL: ${ttl}s)`);
        } catch (error) {
          console.warn(`⚠️  Could not cache ${route}:`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Failed to cache ${route}:`, error);
    }
  }
  
  console.log('✅ Cache warming complete');
}

// 3️⃣ Start server
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4200;
  app.listen(port, async () => {
    console.log(`✅ Node Express server running at http://localhost:${port}`);
    console.log(`📂 Serving browser assets from: ${browserDistFolder}`);
    console.log(`📊 Cache stats available at http://localhost:${port}/cache-stats`);
    
    // ✅ CACHING: Warm cache after server starts
    // Delay to ensure server is ready
    if (isProd) {
      setTimeout(() => {
        warmCache().catch(console.error);
      }, 2000);
    } else {
      console.log('ℹ️ Dev mode: SSR page cache + warm-cache disabled');
    }
  });
}

  reqHandler = createNodeRequestHandler(app);
}

void import(angularAppEngineManifestUrl).then(({ default: m }) => {
  setAngularAppEngineManifest(m);
  main();
});

