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
import { existsSync, readFileSync } from 'fs';
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

function getCacheKey(request: express.Request | undefined): string {
  const req = ensureSafeRequest(request);
  const userPart = req.headers.authorization ? 'auth' : 'guest';
  const queryPart = JSON.stringify(req.query || {});
  return `ssr:${getRequestPath(req)}:${queryPart}:${userPart}`;
}

function createWarmCacheRequest(route: string): express.Request {
  return ensureSafeRequest({
    method: 'GET',
    url: route,
    path: route,
    originalUrl: route,
    query: {},
    headers: {},
  });
}

// 1️⃣ Serve static assets
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    etag: true,
    lastModified: true
  }),
);

// 1b️⃣ Elearn (student dashboard / course player): SPA only — must run BEFORE SSR catch-all.
// Production: baseHref /Elearn/ or /course/ (Docker unified domain) — assets under that prefix
// Optional: build elearn with baseHref /app/ if you only mount /app (see docs/NGINX_SSR.md).
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
    const escaped = mountPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    app.get(new RegExp(`^${escaped}(\\/.*)?$`), (_req, res) => {
      res.sendFile(indexFile);
    });
  };
  console.log(
    `[SSR] Elearn SPA: ${elearnBrowserFolder} → /course/* (unified domain), /Elearn/*, /app/*`
  );
  mountSpa('/course');
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
    const cacheResult = htmlCache.get(cacheKey);
    if (cacheResult instanceof Promise) {
      cached = await cacheResult;
    } else {
      cached = cacheResult;
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
      const ttl = isStaticRoute(requestPath) ? cacheConfig.ttl.static : cacheConfig.ttl.dynamic;
      const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
      if (setResult instanceof Promise) {
        await setResult;
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
        const indexPath = join(browserDistFolder, 'index.html');
        if (existsSync(indexPath)) {
          const html = readFileSync(indexPath, 'utf-8');
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
      const indexPath = join(browserDistFolder, 'index.html');
      if (existsSync(indexPath)) {
        const html = readFileSync(indexPath, 'utf-8');
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
    const indexPath = join(browserDistFolder, 'index.html');
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, 'utf-8');
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
  const port = process.env['PORT'] || 4000;
  app.listen(port, async () => {
    console.log(`✅ Node Express server running at http://localhost:${port}`);
    console.log(`📂 Serving browser assets from: ${browserDistFolder}`);
    console.log(`📊 Cache stats available at http://localhost:${port}/cache-stats`);
    
    // ✅ CACHING: Warm cache after server starts
    // Delay to ensure server is ready
    setTimeout(() => {
      warmCache().catch(console.error);
    }, 2000);
  });
}

  reqHandler = createNodeRequestHandler(app);
}

void import(angularAppEngineManifestUrl).then(({ default: m }) => {
  setAngularAppEngineManifest(m);
  main();
});
