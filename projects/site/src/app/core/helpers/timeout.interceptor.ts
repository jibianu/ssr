import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * HTTP Timeout Interceptor
 * 
 * Adds timeout to HTTP requests to prevent indefinite hanging.
 * Default timeout: 30 seconds
 * Can be customized per request via 'X-Timeout' header
 * 
 * Benefits:
 * - Prevents requests from hanging indefinitely
 * - Better UX on slow/unstable networks
 * - Automatic error handling for timeouts
 */
@Injectable()
export class TimeoutInterceptor implements HttpInterceptor {
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get timeout from custom header or use default
    const timeoutValue = this.getTimeout(request);

    return next.handle(request).pipe(
      timeout(timeoutValue),
      catchError(error => {
        // Handle timeout errors
        if (error.name === 'TimeoutError' || error.name === 'Timeout') {
          const timeoutError = new HttpErrorResponse({
            error: { 
              message: `Request timeout after ${timeoutValue}ms. Please try again.`,
              status: 408
            },
            status: 408,
            statusText: 'Request Timeout',
            url: request.url
          });

          return throwError(() => this.normalizeError(timeoutError));
        }

        // Re-throw other errors
        return throwError(() => this.normalizeError(error));
      })
    );
  }

  /**
   * Get timeout value from request header or use default
   * Dashboard endpoints get longer timeout (60s) as they may process more data
   */
  private getTimeout(request: HttpRequest<any>): number {
    // Check for custom timeout header first
    const timeoutHeader = request.headers.get('X-Timeout');
    
    if (timeoutHeader) {
      const customTimeout = parseInt(timeoutHeader, 10);
      if (!isNaN(customTimeout) && customTimeout > 0) {
        return customTimeout;
      }
    }

    const u = request.url.toLowerCase();

    // Event slug lookup: production detail endpoint can be slow; allow 45s before fallback.
    if (u.includes('/api/events/event/')) {
      return 45000;
    }

    if (u.includes('/api/events/published')) {
      return 20000;
    }

    // Course detail by slug (and /location/ variants): can be slow; keep 60s without X-Timeout header
    // so browser CORS stays a "simple" GET (no OPTIONS preflight for a custom header).
    if (u.includes('/page/course/course/')) {
      return 60000;
    }

    // ✅ SSR OPTIMIZATION: Longer timeout for Dashboard endpoints (slow queries)
    if (u.includes('/dashboard')) {
      return 60000; // 60 seconds for dashboard endpoints
    }

    return this.DEFAULT_TIMEOUT;
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (error && typeof error === 'object') {
      const message = 'message' in error ? String((error as { message?: unknown }).message ?? 'Unexpected error') : 'Unexpected error';
      const normalized = new Error(message);
      return Object.assign(normalized, error);
    }
    return new Error('Unexpected error');
  }
}

