import type { Express, Request, Response } from 'express';

/**
 * Server-side SEO policy shared by the Express layer.
 *
 * Three concerns:
 *  1. Private areas (auth/payment/dashboards/admin) → `X-Robots-Tag: noindex, nofollow`
 *     response header. Header-level robots works even for CSR shells where
 *     crawlers may not execute JavaScript.
 *  2. Permanently removed URLs → HTTP 410 Gone (tells Google to drop the URL
 *     quickly instead of retrying a 404 or, worse, recording a 5xx).
 *  3. Company tenant portals ({sub}.oilandgasclub.com, e.g. anu.oilandgasclub.com)
 *     are private applications: every response gets noindex and robots.txt
 *     answers `Disallow: /` — they must never be indexed as duplicates of
 *     the main site.
 */

/** Keep in sync with NOINDEX_PATH_PREFIXES in seo.service.ts and robots.txt. */
const PRIVATE_PATH_PREFIXES: readonly string[] = [
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
  '/course',
  '/learn',
  '/api',
  '/unauthorized',
  '/user-unavailable',
];

function normalizePath(requestPath: string): string {
  return (requestPath.split('?')[0].split('#')[0] || '/').replace(/\/+$/, '') || '/';
}

export function isPrivateNoIndexPath(requestPath: string): boolean {
  const p = normalizePath(requestPath).toLowerCase();
  return PRIVATE_PATH_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`));
}

/** Adds `X-Robots-Tag: noindex, nofollow` when the path belongs to a private area. */
export function applyNoIndexHeaderIfPrivate(res: Response, requestPath: string): void {
  if (isPrivateNoIndexPath(requestPath)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
}

/**
 * Permanently removed content → 410 Gone.
 *
 * Defaults cover legacy WordPress-era junk that Google still recrawls.
 * Extend via the GONE_PATHS env var (comma-separated; suffix `/*` for a
 * prefix match), e.g.:
 *   GONE_PATHS="/old-page,/legacy-section/*"
 */
const DEFAULT_GONE_EXACT: readonly string[] = [];

const DEFAULT_GONE_PREFIXES: readonly string[] = [
  '/wp-content',
  '/wp-admin',
  '/wp-includes',
  '/wp-json',
  '/xmlrpc.php',
];

function parseGonePathsEnv(): { exact: string[]; prefixes: string[] } {
  const exact: string[] = [...DEFAULT_GONE_EXACT];
  const prefixes: string[] = [...DEFAULT_GONE_PREFIXES];
  const raw = (process.env['GONE_PATHS'] || '').trim();
  if (raw) {
    for (const entry of raw.split(',')) {
      const value = entry.trim();
      if (!value) continue;
      if (value.endsWith('/*')) {
        prefixes.push(normalizePath(value.slice(0, -2)));
      } else {
        exact.push(normalizePath(value));
      }
    }
  }
  return { exact, prefixes };
}

const GONE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>410 Gone - Oilandgasclub</title>
  <meta name="robots" content="noindex">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:4rem 1rem">
  <h1>410 &mdash; This page has been permanently removed</h1>
  <p><a href="/">Go to the Oilandgasclub homepage</a></p>
</body>
</html>`;

const DEFAULT_APEX_HOST = 'oilandgasclub.com';

/** Hosts that are not company tenant portals (mirrors CompanySubdomainHelper.Reserved + apex). */
const NON_TENANT_HOST_LABELS = new Set([
  'www', 'api', 'app', 'mail', 'admin', 'cdn', 'static', 'login', 'register',
  'elearn', 'blog', 'dev', 'test', 'staging', 'prod', 'ftp', 'smtp',
  'coursebackend', 'courses', 'support', 'help', 'status', 'docs',
]);

/**
 * Canonical public apex hosts — everything else under *.{apex} is a company
 * tenant portal (private application, mirrors backend CompanySubdomainHelper).
 * PUBLIC_HOST env adds a staging apex; the production apex always applies.
 */
function getCanonicalApexHosts(): string[] {
  const configured = (process.env['PUBLIC_HOST'] || '').trim().toLowerCase().replace(/^www\./, '').split(':')[0];
  return configured && configured !== DEFAULT_APEX_HOST && configured !== 'localhost'
    ? [DEFAULT_APEX_HOST, configured]
    : [DEFAULT_APEX_HOST];
}

/** True when the request host is a company tenant portal (anu.oilandgasclub.com, sub.localhost). */
export function isTenantPortalHost(req: Request): boolean {
  const raw =
    (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
    req.headers.host ||
    '';
  const host = raw.toLowerCase().split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return false;
  }
  for (const apex of getCanonicalApexHosts()) {
    if (host === apex || host === `www.${apex}`) {
      return false;
    }
  }
  // {sub}.localhost = local tenant testing; {sub}.{apex} = production tenant.
  if (host.endsWith('.localhost')) {
    const label = host.slice(0, -'.localhost'.length);
    return !!label && !label.includes('.') && !NON_TENANT_HOST_LABELS.has(label);
  }
  for (const apex of getCanonicalApexHosts()) {
    if (!host.endsWith(`.${apex}`)) continue;
    const label = host.slice(0, -(apex.length + 1));
    if (!label || label.includes('.')) return false;
    // www.blog.oilandgasclub.com → label "www.blog" already rejected; blog. → reserved.
    if (NON_TENANT_HOST_LABELS.has(label)) return false;
    return true;
  }
  return false;
}

const TENANT_ROBOTS_TXT = 'User-agent: *\nDisallow: /\n';

/**
 * Tenant portals (Case C — private applications): noindex every response and
 * serve a Disallow-all robots.txt. Register BEFORE the SEO backend proxy so
 * tenant hosts never expose the public sitemap/robots. The portal keeps
 * working for logged-in company users — it just becomes invisible to crawlers.
 */
export function registerTenantPortalNoIndex(app: Express): void {
  app.use((req, res, next) => {
    if (!isTenantPortalHost(req)) {
      return next();
    }
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    const p = normalizePath(req.path || '/').toLowerCase();
    if (p === '/robots.txt') {
      res.status(200).type('text/plain; charset=utf-8').send(TENANT_ROBOTS_TXT);
      return;
    }
    if (p === '/sitemap.xml') {
      res.status(404).type('text/plain; charset=utf-8').send('Not Found');
      return;
    }
    next();
  });
}

/**
 * Legacy blog hosts (blog.oilandgasclub.com / www.blog.…) must never serve
 * duplicate 200 content. One permanent redirect to the apex, lowercase path,
 * no trailing slash. Prefer nginx; this is the Express safety net when the
 * request still reaches Node (misconfigured vhost / proxy).
 */
export function registerLegacyBlogHostRedirect(app: Express): void {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const raw =
      (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
      req.headers.host ||
      '';
    const host = raw.toLowerCase().split(':')[0];
    if (host !== 'blog.oilandgasclub.com' && host !== 'www.blog.oilandgasclub.com') {
      return next();
    }
    const pathRaw = (req.path || '/').split('?')[0] || '/';
    const stripped = pathRaw.replace(/\/+$/, '') || '/';
    const lower = stripped === '/' ? '/' : stripped.toLowerCase();
    const queryIdx = req.originalUrl.indexOf('?');
    const query = queryIdx >= 0 ? req.originalUrl.slice(queryIdx) : '';
    // Blog root → /blog hub; article paths → matching apex slug.
    const targetPath = lower === '/' ? '/blog' : lower;
    res.redirect(301, `https://oilandgasclub.com${targetPath}${query}`);
  });
}

/**
 * www → non-www (and force https on the Location). Prefer nginx; this is the
 * Express safety net when Host/X-Forwarded-Host is still www (GSC "Duplicate,
 * Google chose different canonical" when both hosts return 200).
 */
export function registerWwwCanonicalRedirect(app: Express): void {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const raw =
      (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim() ||
      req.headers.host ||
      '';
    const host = raw.toLowerCase().split(':')[0];
    if (!host.startsWith('www.')) {
      return next();
    }
    // Leave www.blog.* to registerLegacyBlogHostRedirect (registered after this
    // only if we register www first — order: www general, then blog-specific).
    // Actually www.blog starts with www. — handle blog hosts first in create-production-server.
    const apex = host.replace(/^www\./, '');
    if (apex !== 'oilandgasclub.com' && !apex.endsWith('.oilandgasclub.com')) {
      return next();
    }
    // Tenant www.anu.oilandgasclub.com is unusual; only force apex for www.oilandgasclub.com.
    if (host !== 'www.oilandgasclub.com') {
      return next();
    }
    const pathRaw = (req.originalUrl || req.url || '/').split('#')[0];
    const pathOnly = pathRaw.split('?')[0] || '/';
    const stripped = pathOnly.length > 1 && pathOnly.endsWith('/') ? pathOnly.replace(/\/+$/, '') : pathOnly;
    const queryIdx = pathRaw.indexOf('?');
    const query = queryIdx >= 0 ? pathRaw.slice(queryIdx) : '';
    res.redirect(301, `https://oilandgasclub.com${stripped || '/'}${query}`);
  });
}

/** Registers the 410 middleware. Call BEFORE the SSR catch-all. */
export function registerGoneUrls(app: Express): void {
  const { exact, prefixes } = parseGonePathsEnv();
  const exactSet = new Set(exact.map((p) => p.toLowerCase()));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    const p = normalizePath(req.path || '/').toLowerCase();
    const isGone = exactSet.has(p) || prefixes.some((prefix) => p === prefix.toLowerCase() || p.startsWith(`${prefix.toLowerCase()}/`));
    if (!isGone) {
      return next();
    }
    res
      .status(410)
      .setHeader('X-Robots-Tag', 'noindex')
      .setHeader('Cache-Control', 'public, max-age=86400')
      .type('text/html; charset=utf-8')
      .send(GONE_HTML);
  });

  if (exactSet.size > 0 || prefixes.length > 0) {
    console.log(`[SSR] 410 Gone active for ${exactSet.size} exact path(s) + ${prefixes.length} prefix(es)`);
  }
}
