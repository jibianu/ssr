import { environment } from 'src/environments/environment';

/** Same-origin checkout route on the unified domain (Elearn SPA at `/checkout/:id`). */
export function sameOriginCheckoutPath(courseId: string): string {
  return `/checkout/${encodeURIComponent(courseId)}`;
}

function elearnAppUrlBase(): string {
  return ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
}

/** True when Elearn runs on a separate dev origin (e.g. http://localhost:4201). */
export function isSplitElearnOrigin(): boolean {
  const base = elearnAppUrlBase();
  return base.startsWith('http://') || base.startsWith('https://');
}

/**
 * Full checkout URL when Elearn runs on another origin (split dev).
 * On unified production (`elearnAppUrl: '/course'`), checkout is at `/checkout/:id` on the same host — not under `/course/`.
 */
export function absoluteElearnCheckoutUrl(courseId: string): string {
  const base = elearnAppUrlBase();
  const segment = `/checkout/${encodeURIComponent(courseId)}`;
  if (!base) return segment;
  if (isSplitElearnOrigin()) {
    return `${base}${segment}`;
  }
  return segment;
}

/** Checkout URL for Buy buttons and redirects (works on localhost split dev and live unified domain). */
export function resolveCourseCheckoutUrl(courseId: string): string {
  if (isSplitElearnOrigin()) {
    return absoluteElearnCheckoutUrl(courseId);
  }
  return sameOriginCheckoutPath(courseId);
}

/** Student course player URL after enroll / resume (unified: `/app/student/course/:id` at domain root). */
export function resolveStudentCourseUrl(courseId: string): string {
  const base = elearnAppUrlBase();
  const segment = `/app/student/course/${encodeURIComponent(courseId)}`;
  if (isSplitElearnOrigin()) {
    return `${base}${segment}`;
  }
  return segment;
}

/** Append query string (with leading ?) when non-empty. */
export function withQueryString(path: string, queryString: string): string {
  const qs = (queryString ?? '').trim();
  if (!qs) return path;
  return `${path}${qs.startsWith('?') ? qs : `?${qs}`}`;
}
