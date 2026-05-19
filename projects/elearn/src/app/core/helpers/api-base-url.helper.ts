import { environment } from 'src/environments/environment';

function normalizeTrailingSlash(url: string): string {
  const s = (url ?? '').trim();
  if (!s) {
    return '';
  }
  return s.endsWith('/') ? s : `${s}/`;
}

function isLocalBrowserHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
}

/**
 * API origin for HttpClient. On local unified SSR, use same-origin `/api` (proxied to Kestrel)
 * so billing and other calls avoid CORS and stale absolute prod URLs in cached chunks.
 */
export function getApiBaseUrl(): string {
  const envUrl = normalizeTrailingSlash(environment.apiUrl ?? '');

  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:52288/';
  }

  const { hostname, origin } = window.location;
  if (isLocalBrowserHost(hostname)) {
    return `${origin}/`;
  }

  return envUrl || 'http://localhost:52288/';
}
