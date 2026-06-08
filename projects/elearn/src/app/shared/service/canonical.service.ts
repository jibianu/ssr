import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CanonicalService {
  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  private getMarketingOrigin(): string {
    return (environment.seoUrl || 'https://oilandgasclub.com/').replace(/\/+$/, '');
  }

  private toAbsoluteCanonicalHref(input: string): string {
    let s = (input ?? '').trim();
    if (!s) {
      return this.getMarketingOrigin();
    }
    s = s.split('#')[0] ?? s;

    if (/^https?:\/\//i.test(s)) {
      if (environment.production && /localhost|127\.0\.0\.1|\[::1\]/i.test(s)) {
        try {
          const u = new URL(s);
          return this.stripTrailingSlashOnlyPath(`${this.getMarketingOrigin()}${u.pathname}${u.search}`);
        } catch {
          return s;
        }
      }
      return this.stripTrailingSlashOnlyPath(s);
    }

    const path = s.startsWith('/') ? s : `/${s}`;
    const joined = `${this.getMarketingOrigin()}${path}`.replace(/([^:]\/)\/+/g, '$1');
    return this.stripTrailingSlashOnlyPath(joined);
  }

  private stripTrailingSlashOnlyPath(url: string): string {
    const u = url.replace(/\/+$/, '');
    return u || this.getMarketingOrigin();
  }

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
    this.document.head.querySelectorAll('link[rel="canonical"]').forEach((link) => link.remove());
  }
}
