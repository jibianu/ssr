/**
 * Single marketing-site origin for SEO (canonical, OG, JSON-LD, redirects).
 * Never use www here. API hosts belong in PUBLIC_API_URL / SSR_API_URL.
 *
 * Override at runtime (SSR/Node): process.env.CANONICAL_ORIGIN
 * Build-time default matches environment.seoUrl production value.
 */
export const DEFAULT_CANONICAL_ORIGIN = 'https://oilandgasclub.com';

function readRuntimeCanonicalOrigin(): string {
  try {
    if (typeof process === 'undefined' || !process.env) {
      return '';
    }
    return String(process.env['CANONICAL_ORIGIN'] || '').trim();
  } catch {
    return '';
  }
}

/** Absolute origin with no trailing slash. */
export function getCanonicalOrigin(envSeoUrl?: string): string {
  const fromRuntime = readRuntimeCanonicalOrigin();
  if (fromRuntime) {
    return normalizeCanonicalOrigin(fromRuntime);
  }
  if (envSeoUrl && envSeoUrl.trim()) {
    return normalizeCanonicalOrigin(envSeoUrl);
  }
  return DEFAULT_CANONICAL_ORIGIN;
}

/** Force https + strip www. Marketing apex always https://oilandgasclub.com. */
export function normalizeCanonicalOrigin(raw: string): string {
  let s = (raw || '').trim();
  if (!s) return DEFAULT_CANONICAL_ORIGIN;
  if (!/^https?:\/\//i.test(s)) {
    s = `https://${s}`;
  }
  try {
    const u = new URL(s);
    let host = u.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }
    if (host === 'oilandgasclub.com') {
      return DEFAULT_CANONICAL_ORIGIN;
    }
    return `https://${host}`;
  } catch {
    return DEFAULT_CANONICAL_ORIGIN;
  }
}

export function canonicalUrlForPath(path: string, origin = getCanonicalOrigin()): string {
  const o = origin.replace(/\/+$/, '');
  let p = (path || '/').split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p === '/' ? `${o}/` : `${o}${p}`;
}
