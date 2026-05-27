import type { Express, Request, Response } from 'express';
import express from 'express';
import { existsSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { getRequestPath, isAssetRequest, setNoStoreHtmlHeaders } from '../utils/http-paths';
import { ensureSafeRequest } from '../utils/request-safety';

const elearnPatchedIndexHtml = new Map<string, string>();

function patchElearnIndexBaseHref(html: string, mountPath: string): string {
  const base = mountPath.endsWith('/') ? mountPath : `${mountPath}/`;
  return html.replace(/<base\s+href="[^"]*"/i, `<base href="${base}"`);
}

export function sendElearnSpaIndex(res: Response, mountPath: string, indexPath: string): void {
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

/** Elearn auth/checkout routes when SPA uses `baseHref` `/` on the unified domain. */
export function isElearnSpaRootPath(requestPath: string): boolean {
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  const roots = new Set([
    '/login',
    '/register',
    '/sso-callback',
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
  if (roots.has(p)) {
    return true;
  }
  if (/^\/register\/[^/]+$/.test(p)) {
    return true;
  }
  if (p === '/checkout' || p.startsWith('/checkout/')) {
    return true;
  }
  return false;
}

/** Authenticated Elearn areas (unified build uses base href `/`, not under `/app` only). */
const ELEARN_APP_SHELL_PREFIXES = [
  '/company',
  '/trainer',
  '/admin',
  '/student',
  '/management',
  '/affiliate',
];

/** True when the request should serve the Elearn SPA (auth, checkout, or logged-in shell). */
export function isElearnAppShellPath(requestPath: string): boolean {
  if (isElearnSpaRootPath(requestPath)) {
    return true;
  }
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/app' || p.startsWith('/app/')) {
    return true;
  }
  for (const prefix of ELEARN_APP_SHELL_PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

/** Base href patch for Elearn index: `/app/*` uses `/app/`, role shells use `/`. */
export function resolveElearnSpaMountPath(requestPath: string): string {
  const p = requestPath.split('?')[0].replace(/\/$/, '') || '/';
  if (p === '/app' || p.startsWith('/app/')) {
    return '/app';
  }
  return '/';
}

/**
 * Prefer Elearn hashed bundles when the file exists (unified build).
 */
export function registerElearnStaticAssetShortcut(
  app: Express,
  elearnBrowserFolder: string
): void {
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
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          res.sendFile(resolve(fp));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    return next();
  });
}

/**
 * Pure SPA — never SSR. `/course/*` always serves Elearn `index.html` (public course URLs use `/:slug` on the site app).
 */
export function mountElearnSpaIfPresent(app: Express, elearnBrowserFolder: string): void {
  const indexFile = join(elearnBrowserFolder, 'index.html');
  if (!existsSync(indexFile)) {
    console.log(
      `[SSR] Elearn browser not found at ${elearnBrowserFolder} — skip Elearn SPA mounts. ` +
        `Build: ng build elearn --configuration production (or unified).`
    );
    return;
  }

  const staticOpts = {
    maxAge: '1y' as const,
    index: false,
    etag: true,
    lastModified: true,
    immutable: true,
    setHeaders: (res: Response) => {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  };

  const mountSpa = (mountPath: string) => {
    app.use(mountPath, express.static(elearnBrowserFolder, staticOpts));
    const sendSpa = (req: Request, res: Response, _next: () => void) => {
      sendElearnSpaIndex(res, mountPath, indexFile);
    };
    app.get(mountPath, sendSpa);
    app.get(`${mountPath}/{*splat}`, sendSpa);
  };

  const sendElearnRootSpa = (_req: Request, res: Response) => {
    sendElearnSpaIndex(res, '/', indexFile);
  };

  console.log(
    `[SSR] Elearn SPA: ${elearnBrowserFolder} → /login, /register, /checkout, /course/*, /auth/*, /Elearn/*, /app/*, role shells`
  );
  mountSpa('/course');
  mountSpa('/auth');
  mountSpa('/Elearn');
  mountSpa('/app');
  for (const prefix of ELEARN_APP_SHELL_PREFIXES) {
    app.get(prefix, sendElearnRootSpa);
    app.get(`${prefix}/{*splat}`, sendElearnRootSpa);
  }
}

export function resolveElearnBrowserFolder(serverDistFolder: string): string {
  return process.env['ELEARN_BROWSER_DIST']
    ? resolve(process.env['ELEARN_BROWSER_DIST'])
    : resolve(serverDistFolder, '../../elearn');
}

export function resolveElearnIndexPath(elearnBrowserFolder: string): string {
  const primary = join(elearnBrowserFolder, 'index.html');
  const nested = join(elearnBrowserFolder, 'browser', 'index.html');
  if (existsSync(primary)) {
    return primary;
  }
  if (existsSync(nested)) {
    return nested;
  }
  return '';
}
