/**
 * Normalize event canonical URL from API/admin into a root slug segment (/:slug).
 * Handles full URLs, /events/ prefix, leading slashes, and casing.
 */
export function normalizeEventCanonicalSlug(raw: string | null | undefined): string {
  let s = (raw ?? '').toString().trim();
  if (!s) {
    return '';
  }

  try {
    s = decodeURIComponent(s);
  } catch {
    // keep original when malformed
  }

  if (/^https?:\/\//i.test(s)) {
    try {
      s = new URL(s).pathname;
    } catch {
      s = s.replace(/^https?:\/\/[^/?#]+/i, '');
    }
  }

  s = s.replace(/^\/+/, '').replace(/^events\/+/i, '').replace(/[?#].*$/, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return s;
}
