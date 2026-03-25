import { ApplicationConfig, LOCALE_ID, APP_INITIALIZER } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideZoneChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { routes } from './app-routing.module';
import { serverRoutes } from './app.routes.server';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { ErrorInterceptor } from './core/helpers/error.interceptor';
import { JwtInterceptor } from './core/helpers/jwt.interceptor';
import { CacheInterceptor } from './core/helpers/cache.interceptor';
import { DeduplicationInterceptor } from './core/helpers/deduplication.interceptor';
import { RetryInterceptor } from './core/helpers/retry.interceptor';
import { TimeoutInterceptor } from './core/helpers/timeout.interceptor';
import { ApiUrlAuditInterceptor } from './core/helpers/api-url-audit.interceptor';
import { API_URL, getApiUrl, loadApiUrl, normalizeApiUrlBase } from './core/config/api-url.config';

// ✅ FIX: Server config with server rendering + client hydration
// provideClientHydration() MUST be in both client and server configs for hydration to work
// ✅ IMPORTANT: provideServerRendering() MUST be provided ONLY ONCE - do not use ServerModule
export const config: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: loadApiUrl,
      multi: true
    },
    {
      provide: API_URL,
      useFactory: () => {
        const fromEnv = typeof process !== 'undefined' ? process.env['SSR_API_URL'] : undefined;
        if (fromEnv?.trim()) {
          return normalizeApiUrlBase(fromEnv);
        }
        return getApiUrl();
      }
    },
    // ✅ Server rendering provider - MUST be provided only once (not with ServerModule)
    provideServerRendering(withRoutes(serverRoutes)),
    
    // ✅ Client hydration - Required for SSR hydration (must be in server config too)
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        // Don't cache POST requests (mutations)
        includePostRequests: false,
        // Don't cache authenticated requests (they may be user-specific)
        includeRequestsWithAuthHeaders: false,
        // Cache API endpoints to reduce duplicate calls
        filter: (req) => {
          if (req.method !== 'GET') {
            return false;
          }

          const url = req.url || '';
          const normalizedUrl = url.toLowerCase();

          if (normalizedUrl.includes('/account/') || normalizedUrl.includes('/upload/') || normalizedUrl.includes('/webhook/')) {
            return false;
          }

          return normalizedUrl.includes('/api/page/') ||
                 normalizedUrl.includes('/api/course/') ||
                 normalizedUrl.includes('/api/public/') ||
                 normalizedUrl.includes('/api/category/') ||
                 normalizedUrl.includes('/api/event/') ||
                 normalizedUrl.includes('/api/blog') ||
                 normalizedUrl.includes('/api/slug-resolver') ||
                 normalizedUrl.includes('/page/course') ||
                 normalizedUrl.includes('/page/category') ||
                 normalizedUrl.includes('/page/dashboard');
        }
      })
    ),
    
    // Server default locale
    { provide: LOCALE_ID, useFactory: () => process.env['DEFAULT_LOCALE'] || 'en-US' },
    
    // Shared providers (work on both client and server)
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideAnimations(),
    
    // HTTP Interceptors (server-compatible)
    { provide: HTTP_INTERCEPTORS, useClass: DeduplicationInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: CacheInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ApiUrlAuditInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
};
