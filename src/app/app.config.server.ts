import { ApplicationConfig, LOCALE_ID } from '@angular/core';
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

// ✅ FIX: Server config with server rendering + client hydration
// provideClientHydration() MUST be in both client and server configs for hydration to work
// The duplicate provider issue was from mergeApplicationConfig, not from this provider
export const config: ApplicationConfig = {
  providers: [
    // ✅ Server rendering provider - MUST be provided only once
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
          return req.method === 'GET' && 
                 !req.url.includes('/account/') &&
                 !req.url.includes('/upload/') &&
                 !req.url.includes('/webhook/') &&
                 (
                   req.url.includes('/api/page/') ||
                   req.url.includes('/api/course/') ||
                   req.url.includes('/api/category/') ||
                   req.url.includes('/api/event/')
                 );
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
    { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ]
};
