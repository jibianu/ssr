import { environment } from 'src/environments/environment';

/** Same-origin checkout route on the public site (CheckoutGuard → Elearn payment page). */
export function sameOriginCheckoutPath(courseId: string): string {
  return `/checkout/${encodeURIComponent(courseId)}`;
}

/**
 * Full checkout URL when Elearn runs on another origin (e.g. localhost:4201 in dev).
 * On unified production, prefer {@link sameOriginCheckoutPath} so auth cookies stay on one host.
 */
export function absoluteElearnCheckoutUrl(courseId: string): string {
  const base = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
  const path = sameOriginCheckoutPath(courseId);
  if (!base) return path;
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}/checkout/${encodeURIComponent(courseId)}`;
  }
  return `${base}/checkout/${encodeURIComponent(courseId)}`;
}

/** Pick the checkout URL that works for the current environment. */
export function resolveCourseCheckoutUrl(courseId: string): string {
  const base = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return absoluteElearnCheckoutUrl(courseId);
  }
  return sameOriginCheckoutPath(courseId);
}
