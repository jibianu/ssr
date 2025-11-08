import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
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
  private readonly http: HttpClient;
  private readonly isBrowser: boolean;
  
  private apiUrl: string;
  
  // ✅ FIX: Use the resolved API URL from config (handles proxy in dev, full URL in prod/SSR)
  constructor(
    private readonly httpClient: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(API_URL) injectedApiUrl: string
  ) {
    this.http = this.httpClient;
    this.isBrowser = isPlatformBrowser(platformId);
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
    // Return the actual backend URL (should already be full URL, but handle proxy paths for backward compatibility)
    if (currentUrl === '/api/' || currentUrl.startsWith('/api/')) {
      return 'http://localhost:52046/';
    }
    // If it's just "/" or empty, return the backend URL
    if (currentUrl === '/' || !currentUrl || currentUrl.trim() === '') {
      return 'http://localhost:52046/';
    }
    // Already a full URL, return as-is
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
      timeout(5000), // 5 second timeout for health check (increased for SSL handshake)
      map(() => {
        // Cache successful result
        console.log(`✅ Health check passed: Backend is available at ${healthCheckUrl}`);
        this.healthCheckCache = { available: true, timestamp: Date.now() };
        return true;
      }),
      catchError((error) => {
        // Cache failed result (shorter cache duration)
        const errorMessage = error?.message || 'Unknown error';
        const errorStatus = error?.status || error?.statusCode || 'N/A';
        
        // Provide detailed error information
        if (error?.name === 'TimeoutError' || error?.name === 'Timeout') {
          console.warn(`⚠️ Health check timeout: Backend did not respond within 5 seconds at ${healthCheckUrl}`);
          console.warn(`💡 Possible causes: Backend not running, SSL certificate issue, or network problem`);
        } else if (errorStatus === 0 || !errorStatus) {
          console.error(`❌ ERR_EMPTY_RESPONSE: Connection refused or closed at ${healthCheckUrl}`);
          console.error(`💡 DIAGNOSTIC STEPS:`);
          console.error(`   1. ✅ Check if backend is running:`);
          console.error(`      - Open: ${healthCheckUrl} in your browser`);
          console.error(`      - If page loads → Backend is running (likely CORS issue)`);
          console.error(`      - If "Connection refused" → Backend is NOT running`);
          console.error(`   2. ✅ Verify backend port:`);
          console.error(`      - Check backend logs to confirm port 52046 (HTTP) or 52045 (HTTPS)`);
          console.error(`      - Try: http://localhost:52046/ (HTTP) or https://localhost:52045/ (HTTPS)`);
          console.error(`   3. ✅ Check backend protocol:`);
          console.error(`      - If backend uses HTTPS, change environment.ts to https://`);
          console.error(`      - If backend uses HTTP, current config is correct`);
          console.error(`   4. ✅ Check firewall/antivirus:`);
          console.error(`      - Temporarily disable to test`);
          console.error(`   5. ✅ Check backend logs:`);
          console.error(`      - Look for errors when requests arrive`);
        } else {
          console.warn(`⚠️ Health check failed: Backend returned status ${errorStatus} at ${healthCheckUrl}`, errorMessage);
        }
        
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

  /**
   * ✅ DIAGNOSTIC: Test backend connectivity manually
   * Can be called from browser console for debugging:
   * window.backendHealth?.testBackendConnection()
   */
  async testBackendConnection(): Promise<void> {
    if (!this.isBrowser) {
      console.warn('⚠️ Backend connectivity test only works in browser');
      return;
    }

    const backendUrl = this.getActualBackendUrl();
    const testUrl = `${backendUrl}page/category`;
    
    console.log('🔍 Testing backend connectivity...');
    console.log(`📍 Backend URL: ${backendUrl}`);
    console.log(`📍 Test URL: ${testUrl}`);
    console.log('');
    
    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Health-Check': 'true'
        }
      });
      
      if (response.ok) {
        console.log('✅ Backend is accessible!');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Connection successful`);
      } else {
        console.warn(`⚠️ Backend responded with error:`);
        console.warn(`   Status: ${response.status} ${response.statusText}`);
        console.warn(`   This might be a CORS issue or backend error`);
      }
    } catch (error: any) {
      console.error('❌ Backend connection failed:');
      console.error(`   Error: ${error?.message || error}`);
      console.error('');
      console.error('💡 TROUBLESHOOTING:');
      console.error(`   1. Open ${testUrl} directly in your browser`);
      console.error(`   2. Check if backend is running on port 52046 (HTTP) or 52045 (HTTPS)`);
      console.error(`   3. Verify CORS is configured on backend`);
      console.error(`   4. Check backend logs for errors`);
      throw error;
    }
  }
}
