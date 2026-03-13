import { environment } from 'src/environments/environment';

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
