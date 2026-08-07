import { Injectable, RESPONSE_INIT, inject } from '@angular/core';

/**
 * Sets the HTTP status code of the server-rendered response (Angular 20 SSR).
 * No-op in the browser — RESPONSE_INIT is only provided during server rendering.
 *
 * Used so soft-404s (rendering "not found" content with HTTP 200) become real
 * 404/410 responses that Google Search Console understands.
 */
@Injectable({ providedIn: 'root' })
export class SsrResponseStatusService {
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  setStatus(status: number, statusText?: string): void {
    if (this.responseInit) {
      this.responseInit.status = status;
      if (statusText) {
        this.responseInit.statusText = statusText;
      }
    }
  }

  setNotFound(): void {
    this.setStatus(404, 'Not Found');
  }

  setGone(): void {
    this.setStatus(410, 'Gone');
  }

  /**
   * Temporary SSR/API failure — crawlers must retry, never treat as a permanent 404.
   * Sets Retry-After so Google/Bing know to come back.
   */
  setUnavailable(retryAfterSeconds = 10): void {
    if (!this.responseInit) {
      return;
    }
    this.responseInit.status = 503;
    this.responseInit.statusText = 'Service Unavailable';
    const headers = new Headers(this.responseInit.headers ?? undefined);
    headers.set('Retry-After', String(Math.max(1, retryAfterSeconds)));
    this.responseInit.headers = headers;
  }

  /**
   * Turns the server-rendered response into a permanent redirect (default 301).
   * Used for slug-alias migrations so the crawler gets ONE direct 301 instead
   * of a 200 page that navigates away client-side. No-op in the browser.
   */
  setRedirect(location: string, status: 301 | 302 | 308 = 301): void {
    if (!this.responseInit) {
      return;
    }
    this.responseInit.status = status;
    if (status === 301) {
      this.responseInit.statusText = 'Moved Permanently';
    }
    const headers = new Headers(this.responseInit.headers ?? undefined);
    headers.set('Location', location);
    this.responseInit.headers = headers;
  }
}
