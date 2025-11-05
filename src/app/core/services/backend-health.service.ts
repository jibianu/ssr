import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { API_URL, getApiUrl } from '../config/api-url.config';

/**
 * BackendHealthService
 * 
 * Checks if the backend API server is available and responsive.
 * Useful for:
 * - Detecting if backend is running before making API calls
 * - Showing user-friendly error messages when backend is offline
 * - Graceful degradation when backend is unavailable
 * 
 * Benefits:
 * - Prevents multiple failed API calls when backend is down
 * - Better user experience with clear error messages
 * - Allows UI to show fallback content when backend unavailable
 */
@Injectable({
  providedIn: 'root'
})
export class BackendHealthService {
  private http = inject(HttpClient);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  
  private apiUrl: string;
  
  // ✅ FIX: Use the resolved API URL from config (handles proxy in dev, full URL in prod/SSR)
  constructor(@Inject(API_URL) injectedApiUrl: string) {
    // In browser, use /api/ for proxy (works with Angular dev server)
    // In SSR or production, use full URL
    this.apiUrl = injectedApiUrl || getApiUrl();
    
    // For browser with proxy, keep /api/ prefix (proxy handles forwarding)
    // For display/error messages, we'll use getApiUrl() which resolves to actual backend
  }
  
  /**
   * Get the actual backend URL for error messages (not the proxy path)
   */
  getActualBackendUrl(): string {
    const currentUrl = getApiUrl();
    // If it's the proxy path, return the actual backend URL (without /api/ since proxy removes it)
    if (currentUrl === '/api/' || currentUrl.startsWith('/api/')) {
      return 'http://localhost:52045/';
    }
    return currentUrl;
  }
  
  private healthCheckCache: { available: boolean; timestamp: number } | null = null;
  private readonly CACHE_DURATION = 30000; // Cache health status for 30 seconds

  /**
   * Check if backend API is available
   * Uses a lightweight endpoint (categories) to test connectivity
   */
  checkHealth(): Observable<boolean> {
    // Skip health check on server (SSR doesn't need it)
    if (!this.isBrowser) {
      return of(true); // Assume available during SSR
    }

    // Return cached result if still valid
    if (this.healthCheckCache) {
      const now = Date.now();
      if (now - this.healthCheckCache.timestamp < this.CACHE_DURATION) {
        return of(this.healthCheckCache.available);
      }
    }

    // Use a lightweight endpoint for health check
    const healthCheckUrl = `${this.apiUrl}page/category`;
    console.log(`🔍 Health check: Testing backend at ${healthCheckUrl}`);
    
    return this.http.get(healthCheckUrl, { 
      observe: 'response',
      // Don't retry health checks - fail fast
      headers: { 'X-Health-Check': 'true' }
    }).pipe(
      timeout(3000), // 3 second timeout for health check
      map(() => {
        // Cache successful result
        console.log(`✅ Health check passed: Backend is available at ${healthCheckUrl}`);
        this.healthCheckCache = { available: true, timestamp: Date.now() };
        return true;
      }),
      catchError((error) => {
        // Cache failed result (shorter cache duration)
        console.warn(`⚠️ Health check failed: Backend unavailable at ${healthCheckUrl}`, error);
        this.healthCheckCache = { available: false, timestamp: Date.now() };
        return of(false);
      })
    );
  }

  /**
   * Check health with custom timeout
   */
  checkHealthWithTimeout(timeoutMs: number = 3000): Observable<boolean> {
    return this.checkHealth().pipe(
      timeout(timeoutMs),
      catchError(() => of(false))
    );
  }

  /**
   * Clear health check cache (force re-check)
   */
  clearCache(): void {
    this.healthCheckCache = null;
  }

  /**
   * Get cached health status (synchronous, returns last known status)
   */
  getCachedHealthStatus(): boolean | null {
    if (!this.healthCheckCache) {
      return null; // No cache available
    }

    const now = Date.now();
    if (now - this.healthCheckCache.timestamp >= this.CACHE_DURATION) {
      return null; // Cache expired
    }

    return this.healthCheckCache.available;
  }
}
