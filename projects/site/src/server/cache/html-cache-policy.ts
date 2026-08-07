import type { Request } from 'express';
import { ensureSafeRequest } from '../utils/request-safety';
import { isStaticRoute as checkStaticRoute } from '../../server.cache.config';
import { isEmptyAppRootHtml } from '../../server.seo-shell';

/** Mirror of SeoService private prefixes — keep Node cache policy free of Angular DI imports. */
const NOINDEX_PATH_PREFIXES: readonly string[] = [
  '/login',
  '/register',
  '/auth',
  '/forget-password',
  '/fg-code',
  '/change-password',
  '/verification',
  '/callback',
  '/google-callback',
  '/sso-callback',
  '/checkout',
  '/payment',
  '/dashboard',
  '/profile',
  '/admin',
  '/app',
  '/company',
  '/trainer',
  '/student',
  '/management',
  '/affiliate',
  '/elearn',
  '/unauthorized',
  '/user-unavailable',
];

function isPrivateNoIndexPath(path: string): boolean {
  const p = (path.split('?')[0].split('#')[0] || '/').replace(/\/+$/, '') || '/';
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.toLowerCase().startsWith(`${prefix.toLowerCase()}/`)
  );
}

/**
 * Backend REST prefix only: `/api` or `/api/...`.
 * Must NOT match course slugs like `/api-653-above-ground-...` (hyphen after `api`, not slash).
 */
export function isBackendApiPath(requestPath: string): boolean {
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  return p === '/api' || p.startsWith('/api/');
}

/** Elearn + app shells + authenticated areas — never run Angular SSR for these paths. */
export function isForceCsrPath(requestPath: string): boolean {
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  if (isBackendApiPath(p)) {
    return true;
  }
  const prefixes = [
    '/dashboard',
    '/profile',
    '/admin',
    '/course',
    '/Elearn',
    '/app',
    '/learn',
    '/student',
  ];
  for (const prefix of prefixes) {
    if (p === prefix || p.startsWith(prefix + '/')) {
      return true;
    }
  }
  return false;
}

/** In-memory / Redis TTL (seconds) for HTML entries — align with `CACHE_TTL_DYNAMIC` (default 10m). */
export function getHtmlCacheTtlSeconds(path: string, ttlConfig: { static: number; dynamic: number }): number {
  return checkStaticRoute(path) ? ttlConfig.static : ttlConfig.dynamic;
}

/**
 * Cache only anonymous GET/HEAD document requests for SSR HTML.
 * Key: full URL including query (`originalUrl`) + guest|auth bucket.
 */
export function getHtmlCacheKey(req: Request): string {
  const safe = ensureSafeRequest(req);
  const url = safe.originalUrl || safe.url || '/';
  const guest = safe.headers.authorization ? 'auth' : 'guest';
  return `ssr:html:${url}:${guest}`;
}

export function shouldCacheSsrHtml(req: Request, pathOnly: string): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }
  if (req.headers.authorization) {
    return false;
  }
  const p = pathOnly.split('?')[0];
  if (isBackendApiPath(p)) {
    return false;
  }
  if (/^\/admin(\/|$)/i.test(p) || /^\/dashboard(\/|$)/i.test(p) || /^\/profile(\/|$)/i.test(p)) {
    return false;
  }
  if (/^\/user(\/|$)/i.test(p)) {
    return false;
  }
  if (isForceCsrPath(p)) {
    return false;
  }
  // Never cache the dedicated 404 UI route.
  if ((p.replace(/\/+$/, '') || '/') === '/page-not-found') {
    return false;
  }
  return true;
}

/**
 * Detect poisoned HTML that must never be stored or replayed for public URLs.
 * Catches the GSC failure mode: valid article slug served with noindex +
 * canonical → /page-not-found.
 */
export function isPoisonedIndexableHtml(html: string, requestPath: string): boolean {
  if (!html || typeof html !== 'string') {
    return true;
  }
  if (isEmptyAppRootHtml(html)) {
    return true;
  }

  const path = (requestPath.split('?')[0].split('#')[0] || '/').replace(/\/+$/, '') || '/';
  const privatePath = isPrivateNoIndexPath(path) || path === '/page-not-found';

  const canonicalHref =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] ||
    '';
  if (/page-not-found/i.test(canonicalHref)) {
    return true;
  }

  const robots =
    html.match(/<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*name=["']robots["']/i)?.[1] ||
    '';
  if (!privatePath && /noindex/i.test(robots)) {
    return true;
  }

  // Indexable article/course/event slugs need an H1.
  if (!privatePath && path !== '/' && !/^\/(blog|events|courses|about-us|contact-us)(\/|$)/i.test(path)) {
    if (!/<h1\b/i.test(html)) {
      return true;
    }
  }

  return false;
}

/**
 * Browser/proxy `Cache-Control` for returned HTML (stale-while-revalidate).
 */
export function getHtmlCacheControlHeader(path: string, isProd: boolean): string {
  if (!isProd) {
    return 'no-store, no-cache, must-revalidate, proxy-revalidate';
  }
  if (checkStaticRoute(path)) {
    return 'public, max-age=3600, stale-while-revalidate=86400, must-revalidate';
  }
  const maxAge = parseInt(process.env['CACHE_TTL_DYNAMIC'] || '600', 10);
  return `public, max-age=${maxAge}, stale-while-revalidate=86400, must-revalidate`;
}
