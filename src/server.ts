import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { getCacheConfig, isStaticRoute as checkStaticRoute } from './server.cache.config';
import { createCacheAdapter, CacheAdapter } from './server.cache.adapter';
import { performanceMonitor } from './server.performance';
import { cdnCacheMiddleware } from './server.cdn.middleware';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

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

// ✅ CACHING: Get cache key for request
function getCacheKey(req: express.Request): string {
  // Include path, query params, and auth status in cache key
  const userPart = req.headers.authorization ? 'auth' : 'guest';
  const queryPart = JSON.stringify(req.query || {});
  return `ssr:${req.path}:${queryPart}:${userPart}`;
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
    
    res.json({
      success: true,
      invalidated: matchingKeys.length,
      keys: matchingKeys,
      cdnPurged,
      message: `Invalidated ${matchingKeys.length} cache entries matching "${pattern}"${cdnPurged ? ' (CDN cache also purged)' : ''}`
    });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({ error: 'Failed to invalidate cache' });
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

// 2️⃣ SSR with caching middleware
app.get('*', async (req, res, next) => {
  // ✅ PERFORMANCE: Start performance measurement
  const markId = performanceMonitor.startMeasure(
    req.path,
    req.method,
    req.headers['user-agent']
  );
  
  try {
    const cacheKey = getCacheKey(req);
    
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
        Object.entries(getCacheHeaders(req.path, cached.etag)).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
        res.end();
        
        // ✅ PERFORMANCE: Record metrics for cache hit
        performanceMonitor.endMeasure(markId, true);
        return;
      }
      
      // ✅ CACHING: Serve cached HTML
      Object.entries(getCacheHeaders(req.path, cached.etag)).forEach(([key, value]) => {
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
    const response = await angularApp.handle(req);
    
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
          Object.entries(getCacheHeaders(req.path, generateETag(''))).forEach(([key, value]) => {
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
      const ttl = isStaticRoute(req.path) ? cacheConfig.ttl.static : cacheConfig.ttl.dynamic;
      const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
      if (setResult instanceof Promise) {
        await setResult;
      }
      
      // ✅ CACHING: Set cache headers and send HTML
      Object.entries(getCacheHeaders(req.path, etag)).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.send(html);
      
      // ✅ PERFORMANCE: Record metrics for cache miss (render happened)
      performanceMonitor.endMeasure(markId, false);
    } else {
      // ✅ PERFORMANCE: Record metrics even if no response
      performanceMonitor.endMeasure(markId, false);
      next();
    }
  } catch (err) {
    console.error('SSR Error:', err);
    // ✅ PERFORMANCE: Record metrics on error
    performanceMonitor.endMeasure(markId, false);
    next(err);
  }
});

// ✅ CACHING: Cache warming function (call after server starts)
async function warmCache(): Promise<void> {
  const popularRoutes = ['/', '/course', '/about-us', '/contact-us'];
  
  console.log(`🔥 Warming ${cacheConfig.type} cache for popular routes...`);
  
  for (const route of popularRoutes) {
    try {
      const mockReq = {
        path: route,
        query: {},
        headers: {}
      } as express.Request;
      
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
if (isMainModule(import.meta.url)) {
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

export const reqHandler = createNodeRequestHandler(app);
