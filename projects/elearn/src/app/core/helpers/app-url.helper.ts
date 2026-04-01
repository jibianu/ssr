import { environment } from 'src/environments/environment';

/** Which admin shell the user is in (handles `/app/app/admin/...` duplicate segments). */
export type AdminAppSegment = 'admin' | 'trainer' | 'management';

/**
 * Reads admin | trainer | management from a path or full URL.
 * Do not use `segments[segments.indexOf('app') + 1]` — with `/app/app/admin/...` that yields `app`.
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

/**
 * Base URL of the elearn app (auth, student dashboard).
 * Derived from existing env so no hardcoded domain is required in production.
 * Order: optional elearnAppUrl → seoUrl origin → googleRedirectUri origin → window.location.origin.
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

/**
 * Absolute base of the deployed SPA for Stripe `return_url` (includes path prefix, e.g. `https://host/course`).
 * On oilandgasclub.com the learn app is under `/course/`; using `window.location.origin` alone sends users to
 * `https://host/app/...` (marketing shell) so payment success never runs and enrollment is skipped.
 */
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

/** Turn a path like `/app/payment/success?...` into a full URL using the same prefix as the SPA. */
export function resolveToAbsoluteAppUrl(redirectPathOrUrl: string): string {
  const s = (redirectPathOrUrl ?? '').trim();
  if (!s) {
    return getAbsoluteAppBaseUrlForStripeReturn();
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  const base = getAbsoluteAppBaseUrlForStripeReturn();
  const path = s.startsWith('/') ? s : `/${s}`;
  return `${base}${path}`;
}
