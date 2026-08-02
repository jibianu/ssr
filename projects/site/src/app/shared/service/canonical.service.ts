import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Query parameters that never change page content — must not appear in
 * rel=canonical hrefs (they create infinite duplicate URL variants in GSC).
 * Content-changing params (e.g. ?page= pagination) are preserved.
 */
const TRACKING_QUERY_PARAMS: readonly string[] = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'fbclid', 'msclkid', 'ref', 'affiliate', 'returnUrl', 'redirectUrl',
];

@Injectable({
  providedIn: 'root'
})
export class CanonicalService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  /** Drop tracking params from a query string; returns '' or '?...' with content params only. */
  private stripTrackingParams(search: string): string {
    if (!search || search === '?') {
      return '';
    }
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    for (const name of TRACKING_QUERY_PARAMS) {
      params.delete(name);
      // Params are matched case-insensitively (?ReturnUrl=, ?UTM_Source=)
      for (const key of [...params.keys()]) {
        if (key.toLowerCase() === name.toLowerCase()) {
          params.delete(key);
        }
      }
    }
    const remaining = params.toString();
    return remaining ? `?${remaining}` : '';
  }

  /** Marketing site origin without trailing slash (matches sitemap / Stripe PublicSiteUrl style). */
  private getMarketingOrigin(): string {
    return (environment.seoUrl || 'https://oilandgasclub.com/').replace(/\/+$/, '');
  }

  /**
   * Builds an absolute href for rel=canonical.
   * - Relative paths (e.g. `/about-us`) resolve against environment.seoUrl.
   * - In production, absolute http(s) URLs on localhost are rewritten to the marketing origin (SSR/dev proxy).
   */
  private toAbsoluteCanonicalHref(input: string): string {
    let s = (input ?? '').trim();
    if (!s) {
      return this.getMarketingOrigin();
    }
    s = s.split('#')[0] ?? s;

    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        // Canonical host policy: https, non-www. localhost (SSR/dev proxy)
        // and www both rewrite onto the marketing origin.
        const useMarketingOrigin =
          /localhost|127\.0\.0\.1|\[::1\]/i.test(u.hostname) || /^www\./i.test(u.hostname);
        const origin = useMarketingOrigin ? this.getMarketingOrigin() : `https://${u.hostname.toLowerCase()}`;
        const search = this.stripTrackingParams(u.search);
        return this.stripTrailingSlashOnlyPath(`${origin}${u.pathname}`) + search;
      } catch {
        return this.stripTrailingSlashOnlyPath(s);
      }
    }

    const [rawPath, rawQuery] = s.split('?');
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const search = this.stripTrackingParams(rawQuery ? `?${rawQuery}` : '');
    const joined = `${this.getMarketingOrigin()}${path}`.replace(/([^:]\/)\/+/g, '$1');
    return this.stripTrailingSlashOnlyPath(joined) + search;
  }

  /** Remove trailing slash except for bare origin (keep https://host as canonical root). */
  private stripTrailingSlashOnlyPath(url: string): string {
    const u = url.replace(/\/+$/, '');
    return u || this.getMarketingOrigin();
  }

  /**
   * Sets a single &lt;link rel="canonical"&gt; in document head.
   * Prefer passing an explicit public URL; if omitted, uses current path + search on the marketing origin.
   */
  setCanonicalURL(url?: string): void {
    try {
      const pathOrUrl =
        url !== undefined && url.trim() !== ''
          ? url.trim()
          : `${this.document.location?.pathname || '/'}${this.document.location?.search || ''}`;
      const canonicalUrl = this.toAbsoluteCanonicalHref(pathOrUrl);

      this.removeExistingCanonicalLink();

      const link: HTMLLinkElement = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', canonicalUrl);
      this.document.head.appendChild(link);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error setting canonical URL:', message);
    }
  }

  getURL(): string {
    return this.document.URL;
  }

  private removeExistingCanonicalLink(): void {
    const existingLinks = this.document.head.querySelectorAll('link[rel="canonical"]');
    existingLinks.forEach((link) => link.remove());
  }
}
