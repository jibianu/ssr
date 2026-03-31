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
