import type { Express, NextFunction, Request, Response } from 'express';
import { writeResponseToNodeResponse, type AngularNodeAppEngine } from '@angular/ssr/node';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { CacheAdapter } from '../../server.cache.adapter';
import type { CacheConfig } from '../../server.cache.config';
import { performanceMonitor } from '../../server.performance';
import { enrichPublicCoursePageIfMissingOg, isEmptyAppRootHtml } from '../../server.seo-shell';
import {
  getHtmlCacheControlHeader,
  getHtmlCacheKey,
  getHtmlCacheTtlSeconds,
  isForceCsrPath,
  shouldCacheSsrHtml,
} from '../cache/html-cache-policy';
import { generateETag } from '../utils/etag';
import {
  createWarmCacheRequest,
  getRequestPath,
  isAssetRequest,
  setNoStoreHtmlHeaders,
  setSsrDiagnosticHeader,
} from '../utils/http-paths';
import { ensureSafeRequest } from '../utils/request-safety';
import {
  isElearnAppShellPath,
  isLocalDevServer,
  resolveElearnDevRedirectUrl,
  resolveElearnIndexPath,
  resolveElearnSpaMountPath,
  sendElearnSpaIndex,
} from './elearn-spa';
import { applyNoIndexHeaderIfPrivate } from '../seo-policy';

export interface SsrCatchAllDeps {
  angularApp: AngularNodeAppEngine;
  browserDistFolder: string;
  elearnBrowserFolder: string;
  htmlCache: CacheAdapter;
  cacheConfig: CacheConfig;
  isProd: boolean;
}

function applyCachedHtmlHeaders(res: Response, requestPath: string, isProd: boolean, etag: string): void {
  res.setHeader('Cache-Control', getHtmlCacheControlHeader(requestPath, isProd));
  res.setHeader('ETag', etag);
  res.setHeader('Vary', 'Accept-Encoding, Cookie');
}

function applyStreamHtmlHeaders(res: Response, requestPath: string, isProd: boolean): void {
  res.setHeader('Cache-Control', getHtmlCacheControlHeader(requestPath, isProd));
  res.setHeader('Vary', 'Accept-Encoding, Cookie');
}

/**
 * The Angular application builder emits `index.csr.html` (not `index.html`)
 * when SSR is enabled. Missing this fallback made every CSR-shell request
 * (dashboard/profile/checkout paths) return HTTP 500 in production —
 * the exact "Server Error (5xx)" Google Search Console reports.
 */
function resolveBrowserIndexPath(browserDistFolder: string): string {
  for (const name of ['index.html', 'index.csr.html']) {
    const candidate = join(browserDistFolder, name);
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return '';
}

async function sendBrowserCsrShell(
  res: Response,
  browserDistFolder: string,
  requestPath: string,
  req: Request,
  diag: 'csr-fallback'
): Promise<void> {
  const indexPath = resolveBrowserIndexPath(browserDistFolder);
  if (!indexPath) {
    // Deployment problem, not a permanent page failure: 503 tells crawlers to
    // retry later — never a 500 that GSC records against the URL.
    res.status(503).setHeader('Retry-After', '30');
    res.type('text/plain').send('Service temporarily unavailable');
    return;
  }
  let html = readFileSync(indexPath, 'utf-8');
  const { html: enriched } = await enrichPublicCoursePageIfMissingOg(html, requestPath, req);
  html = enriched;
  setNoStoreHtmlHeaders(res);
  setSsrDiagnosticHeader(res, diag);
  // Private areas served as CSR shells (dashboard/admin/checkout/…) must carry a
  // header-level noindex — crawlers may not execute the JS that sets the meta tag.
  applyNoIndexHeaderIfPrivate(res, requestPath);
  res.status(200).type('text/html; charset=utf-8').send(html);
}

/**
 * Registers `GET /{*splat}`: Elearn root paths, forced CSR, HTML cache, streaming SSR, CSR fallbacks.
 */
export function registerSsrCatchAll(app: Express, deps: SsrCatchAllDeps): void {
  const { angularApp, browserDistFolder, elearnBrowserFolder, htmlCache, cacheConfig, isProd } = deps;

  app.get('/{*splat}', async (req: Request, res: Response, next: NextFunction) => {
    const safeReq = ensureSafeRequest(req);
    const requestPath = getRequestPath(safeReq);

    if (isAssetRequest(requestPath)) {
      res.status(404).end();
      return;
    }

    const elearnDevRedirect = isLocalDevServer()
      ? resolveElearnDevRedirectUrl(requestPath, req.url ?? requestPath)
      : null;
    if (elearnDevRedirect) {
      res.redirect(302, elearnDevRedirect);
      return;
    }

    const elearnIndexFile = resolveElearnIndexPath(elearnBrowserFolder);
    if (elearnIndexFile && isElearnAppShellPath(requestPath)) {
      sendElearnSpaIndex(res, resolveElearnSpaMountPath(requestPath), elearnIndexFile);
      return;
    }

    const elearnIndexPrimary = join(elearnBrowserFolder, 'index.html');
    if (
      existsSync(elearnIndexPrimary) &&
      (requestPath === '/auth' || requestPath.startsWith('/auth/'))
    ) {
      sendElearnSpaIndex(res, '/auth', elearnIndexPrimary);
      return;
    }

    if (isForceCsrPath(requestPath)) {
      await sendBrowserCsrShell(res, browserDistFolder, requestPath, req, 'csr-fallback');
      return;
    }

    const markId = performanceMonitor.startMeasure(requestPath, safeReq.method, safeReq.headers['user-agent']);

    const cacheKey = getHtmlCacheKey(safeReq);
    const mayCache = isProd && shouldCacheSsrHtml(req, requestPath);

    try {
      performanceMonitor.markCacheStart(markId);

      let cached: { html: string; etag: string } | undefined;
      if (mayCache) {
        const cacheResult = htmlCache.get(cacheKey);
        cached = cacheResult instanceof Promise ? await cacheResult : cacheResult;
      }

      performanceMonitor.markCacheEnd(markId);

      if (cached) {
        // Poisoned cache guard: never replay empty <app-root> shells to crawlers.
        if (isEmptyAppRootHtml(cached.html)) {
          console.warn(`[SSR] discarding empty cached HTML for ${requestPath}`);
          try {
            const del = htmlCache.del(cacheKey);
            if (del instanceof Promise) void del.catch(() => undefined);
          } catch {
            /* best-effort */
          }
        } else {
          const etag = cached.etag;
          const ifNoneMatch = req.headers['if-none-match'];
          if (ifNoneMatch === etag) {
            res.status(304);
            applyCachedHtmlHeaders(res, requestPath, isProd, etag);
            setSsrDiagnosticHeader(res, 'cache');
            res.end();
            performanceMonitor.endMeasure(markId, true);
            return;
          }
          applyCachedHtmlHeaders(res, requestPath, isProd, etag);
          setSsrDiagnosticHeader(res, 'cache');
          res.status(200).type('text/html; charset=utf-8').send(cached.html);
          performanceMonitor.endMeasure(markId, true);
          return;
        }
      }

      performanceMonitor.markRenderStart(markId);

      let response = await angularApp.handle(safeReq);

      if (!response) {
        console.warn(`[SSR] Angular engine returned no response for ${requestPath}`);
        await sendBrowserCsrShell(res, browserDistFolder, requestPath, req, 'csr-fallback');
        performanceMonitor.endMeasure(markId, false);
        return;
      }

      // Safety net for production SEO: if streamed SSR HTML misses OG tags OR
      // left an empty <app-root> (meta-only shell → GSC "crawled not indexed"),
      // enrich from the public API before sending/caching.
      try {
        const contentType = response.headers.get('content-type') || '';
        if (/text\/html/i.test(contentType) && typeof response.clone === 'function') {
          const html = await response.clone().text();
          const needsEnrich =
            !/property\s*=\s*["']og:title["']/i.test(html) || isEmptyAppRootHtml(html);
          if (needsEnrich) {
            const enriched = await enrichPublicCoursePageIfMissingOg(html, requestPath, req);
            if (enriched.injected && enriched.html !== html) {
              const headers = new Headers(response.headers);
              response = new Response(enriched.html, {
                status: response.status,
                statusText: response.statusText,
                headers,
              });
            }
          }
        }
      } catch (enrichErr) {
        console.warn('[SSR] stream enrichment check failed:', enrichErr);
      }

      applyStreamHtmlHeaders(res, requestPath, isProd);

      // Only cache successful renders with real body content. Caching an empty
      // <app-root> shell (even with meta) creates permanent soft-200 pages for
      // Google ("Crawled – currently not indexed"). Cache hits always send 200.
      if (mayCache && response.status === 200 && typeof response.clone === 'function') {
        try {
          const clone = response.clone();
          const ttl = getHtmlCacheTtlSeconds(requestPath, cacheConfig.ttl);
          void clone
            .text()
            .then((html) => {
              if (isEmptyAppRootHtml(html)) {
                console.warn(`[SSR] skip cache for empty app-root: ${requestPath}`);
                return;
              }
              const etag = generateETag(html);
              const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
              if (setResult instanceof Promise) {
                void setResult.catch((e) => console.warn('[SSR] cache set failed', e));
              }
            })
            .catch((e) => console.warn('[SSR] background HTML cache (clone) failed:', e));
        } catch (cloneErr) {
          console.warn('[SSR] response.clone() unavailable; skipping HTML cache for this request', cloneErr);
        }
      }

      setSsrDiagnosticHeader(res, 'stream');
      try {
        await writeResponseToNodeResponse(response, res);
      } catch (writeErr) {
        console.error('[SSR] writeResponseToNodeResponse failed:', writeErr);
        if (!res.headersSent) {
          // Transient render/stream failure — 503 tells crawlers to retry,
          // 500 would be recorded as a Server Error against the URL.
          res.status(503).setHeader('Retry-After', '10');
          res.type('text/plain').send('Service temporarily unavailable');
        }
        performanceMonitor.endMeasure(markId, false);
        return;
      }

      performanceMonitor.endMeasure(markId, false);
    } catch (err) {
      console.error('[SSR] Error:', err);
      try {
        if (isAssetRequest(requestPath)) {
          res.status(404).end();
          performanceMonitor.endMeasure(markId, false);
          return;
        }
        await sendBrowserCsrShell(res, browserDistFolder, requestPath, req, 'csr-fallback');
        console.warn(`[SSR] csr-fallback after error for ${requestPath}`);
      } catch (fallbackErr) {
        console.error('[SSR] CSR fallback failed:', fallbackErr);
        if (!res.headersSent) {
          res.status(503).setHeader('Retry-After', '10');
          res.type('text/plain').send('Service temporarily unavailable');
        }
      }
      performanceMonitor.endMeasure(markId, false);
    }
  });

  app.use('/{*splat}', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const path = getRequestPath(ensureSafeRequest(req));
      if (isAssetRequest(path)) {
        res.status(404).end();
        return;
      }
      const elearnDevRedirect = isLocalDevServer()
        ? resolveElearnDevRedirectUrl(path, req.url ?? path)
        : null;
      if (elearnDevRedirect) {
        res.redirect(302, elearnDevRedirect);
        return;
      }
      const elearnIdx = resolveElearnIndexPath(elearnBrowserFolder);
      if (elearnIdx && isElearnAppShellPath(path)) {
        sendElearnSpaIndex(res, resolveElearnSpaMountPath(path), elearnIdx);
        return;
      }
      const elearnPrimary = join(elearnBrowserFolder, 'index.html');
      if (existsSync(elearnPrimary) && (path === '/auth' || path.startsWith('/auth/'))) {
        sendElearnSpaIndex(res, '/auth', elearnPrimary);
        return;
      }
      if (isForceCsrPath(path)) {
        await sendBrowserCsrShell(res, browserDistFolder, path, req, 'csr-fallback');
        return;
      }
      if (resolveBrowserIndexPath(browserDistFolder)) {
        await sendBrowserCsrShell(res, browserDistFolder, path, req, 'csr-fallback');
      } else {
        res.status(404).type('text/plain').send('Not Found');
      }
    } catch (error) {
      console.error('[SSR] Final fallback error:', error);
      next(error);
    }
  });
}

export async function warmHtmlCache(deps: SsrCatchAllDeps): Promise<void> {
  const { angularApp, htmlCache, cacheConfig, isProd } = deps;
  if (!isProd) {
    return;
  }

  const popularRoutes = ['/', '/about-us', '/contact-us', '/courses', '/events'];
  const catalogSlugs = await fetchWarmCatalogSlugs();
  for (const slug of catalogSlugs) {
    if (slug) {
      popularRoutes.push(`/${slug}`);
    }
  }

  console.log(`🔥 Warming HTML cache for ${popularRoutes.length} routes…`);

  for (const route of popularRoutes) {
    try {
      const mockReq = createWarmCacheRequest(route);
      if (!shouldCacheSsrHtml(mockReq, route)) {
        continue;
      }
      const response = await angularApp.handle(mockReq);
      if (!response || typeof response.clone !== 'function') {
        continue;
      }
      // Never warm-cache error renders — cache hits are always served as 200.
      if (response.status !== 200) {
        console.warn(`⚠️  Skip warm cache for ${route}: status ${response.status}`);
        continue;
      }
      const html = await response.clone().text();
      if (isEmptyAppRootHtml(html)) {
        console.warn(`⚠️  Skip warm cache for ${route}: empty app-root`);
        continue;
      }
      const etag = generateETag(html);
      const cacheKey = getHtmlCacheKey(mockReq);
      const ttl = getHtmlCacheTtlSeconds(route, cacheConfig.ttl);
      const setResult = htmlCache.set(cacheKey, { html, etag }, ttl);
      if (setResult instanceof Promise) {
        await setResult;
      }
      console.log(`✅ Cached: ${route} (TTL: ${ttl}s)`);
    } catch (error) {
      console.warn(`⚠️  Warm cache failed for ${route}:`, error);
    }
  }
  console.log('✅ Cache warming complete');
}

/** Top published course slugs for SSR warm-cache (best effort). */
async function fetchWarmCatalogSlugs(): Promise<string[]> {
  const apiBase = (process.env['API_URL'] || process.env['SSR_API_URL'] || 'https://coursebackend.oilandgasclub.com').replace(/\/$/, '');
  const url = `${apiBase}/api/public/courses/catalog`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      return [];
    }
    const body = await res.json() as { results?: Array<{ slug?: string; canonicalUrl?: string }> };
    const rows = body?.results ?? [];
    return rows
      .slice(0, 12)
      .map((row) => {
        const raw = (row?.slug ?? row?.canonicalUrl ?? '').toString().trim().replace(/^\/+/, '');
        return raw.split('/').pop() ?? raw;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}
