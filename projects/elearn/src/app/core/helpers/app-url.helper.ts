import { environment } from 'src/environments/environment';

/** Which admin shell the user is in (handles legacy `/app/app/admin/...` URLs). */
export type AdminAppSegment = 'admin' | 'trainer' | 'management';

/**
 * Reads admin | trainer | management from a path or full URL.
 */
export function resolveAdminAppSegment(pathOrUrl: string): AdminAppSegment {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    return 'admin';
  }
  const path = pathOrUrl.split('?')[0].split('#')[0];
  const segments = path.split('/').filter(Boolean);
  for (const s of segments) {
    if (s === 'admin' || s === 'trainer' || s === 'management') {
      return s;
    }
  }
  return 'admin';
}

/** True when Elearn is served under `/app/` (unified SSR mount). */
export function isUnifiedElearnMount(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  const base = document.querySelector('base')?.getAttribute('href')?.trim().replace(/\/+$/, '') ?? '';
  return base === '/app';
}

/**
 * Base URL of the elearn app (auth, student dashboard).
 */
export function getElearnAppBaseUrl(): string {
  const env = environment as { elearnAppUrl?: string; seoUrl?: string; googleRedirectUri?: string };
  if (env.elearnAppUrl && String(env.elearnAppUrl).trim()) {
    return String(env.elearnAppUrl).trim().replace(/\/$/, '');
  }
  try {
    if (env.seoUrl && String(env.seoUrl).trim()) {
      return new URL(env.seoUrl).origin;
    }
  } catch (_) {}
  try {
    if (env.googleRedirectUri && String(env.googleRedirectUri).trim()) {
      return new URL(env.googleRedirectUri).origin;
    }
  } catch (_) {}
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function getAbsoluteAppBaseUrlForStripeReturn(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const baseHref = document.querySelector('base')?.getAttribute('href')?.trim();
  if (baseHref) {
    try {
      const u = new URL(baseHref, window.location.href);
      return u.href.replace(/\/+$/, '');
    } catch {
      /* use origin */
    }
  }
  return window.location.origin.replace(/\/+$/, '');
}

/** Canonical browser path: always single `/app/...` (never `/app/app/...`). */
export function normalizeAppRouterUrl(pathOrUrl: string): string {
  const s = (pathOrUrl ?? '').trim();
  if (!s) {
    return s;
  }
  if (s.startsWith('/app/app/')) {
    return s.replace(/^\/app\/app\//, '/app/');
  }
  return s;
}

/** Role landing paths after login. */
export function normalizeRoleLandingRoute(route: string): string {
  return normalizeAppRouterUrl(route);
}

/**
 * RouterLink commands for menu items.
 * Unified (`<base href="/app/">`): `['admin','students']` → browser `/app/admin/students`.
 * Standalone (`<base href="/">`): `['app','admin','students']` → browser `/app/admin/students`.
 */
export function menuLinkToRouterCommands(pathOrUrl: string): string[] {
  const path = normalizeAppRouterUrl((pathOrUrl ?? '').trim()).split('?')[0].split('#')[0];
  let segments = path.split('/').filter(Boolean);
  if (segments[0] === 'app') {
    segments = segments.slice(1);
  }
  // Leading `/` = absolute navigation (relative arrays break from e.g. admin/students).
  if (isUnifiedElearnMount()) {
    return segments.length ? ['/', ...segments] : ['/'];
  }
  return segments.length ? ['/', 'app', ...segments] : ['/app'];
}

/** Turn a path like `/app/payment/success?...` into a full URL using the site origin on unified domain. */
export function resolveToAbsoluteAppUrl(redirectPathOrUrl: string): string {
  const s = (redirectPathOrUrl ?? '').trim();
  if (!s) {
    return getAbsoluteAppBaseUrlForStripeReturn();
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const path = normalizeAppRouterUrl(s.startsWith('/') ? s : `/${s}`);
  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/+$/, '');
    // Unified domain: app shell + checkout + auth live at origin root, not under /course/
    if (
      path.startsWith('/app/') ||
      path.startsWith('/checkout/') ||
      path.startsWith('/login') ||
      path.startsWith('/register')
    ) {
      return `${origin}${path}`;
    }
  }
  const base = getAbsoluteAppBaseUrlForStripeReturn();
  return `${base}${path}`;
}
