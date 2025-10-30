import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { mergeMap, retryWhen, scan } from 'rxjs/operators';

/**
 * HTTP Retry Interceptor
 * 
 * Automatically retries failed HTTP requests with exponential backoff.
 * Only retries on network errors and server errors (5xx), not client errors (4xx).
 * 
 * Benefits:
 * - Better resilience to transient network failures
 * - Improved user experience on slow/unstable networks
 * - Automatic recovery from temporary server issues
 */
@Injectable()
export class RetryInterceptor implements HttpInterceptor {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000; // Initial delay: 1 second
  private readonly MAX_RETRY_DELAY_MS = 10000; // Max delay: 10 seconds

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Don't retry POST/PUT/DELETE requests with body (to avoid duplicate operations)
    if (request.method !== 'GET' && request.body) {
      return next.handle(request);
    }

    return next.handle(request).pipe(
      retryWhen(errors => 
        errors.pipe(
          scan((retryCount: number, error: HttpErrorResponse) => {
            // Don't retry if max retries reached
            if (retryCount >= this.MAX_RETRIES) {
              throw error;
            }

            // Only retry on network errors or server errors (5xx)
            if (this.shouldRetry(error)) {
              const delay = this.calculateDelay(retryCount);
              
              // Log retry attempt (only in browser)
              if (typeof window !== 'undefined') {
                console.warn(`Retry attempt ${retryCount + 1}/${this.MAX_RETRIES} for ${request.url} after ${delay}ms`);
              }

              return retryCount + 1;
            }

            // Don't retry - throw error immediately
            throw error;
          }, 0),
          mergeMap((retryCount: number) => {
            const delay = this.calculateDelay(retryCount - 1);
            return timer(delay);
          })
        )
      )
    );
  }

  /**
   * Determine if request should be retried based on error
   */
  private shouldRetry(error: HttpErrorResponse): boolean {
    // Retry on network errors (status 0) or server errors (5xx)
    if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
      return true;
    }

    // Don't retry on client errors (4xx)
    // Exception: 429 (Too Many Requests) - retry with backoff
    if (error.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Calculate exponential backoff delay
   * Formula: min(RETRY_DELAY * 2^retryCount, MAX_RETRY_DELAY)
   */
  private calculateDelay(retryCount: number): number {
    const exponentialDelay = this.RETRY_DELAY_MS * Math.pow(2, retryCount);
    return Math.min(exponentialDelay, this.MAX_RETRY_DELAY_MS);
  }
}

