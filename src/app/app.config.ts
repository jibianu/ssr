import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from "@angular/common/http";
import { LOCALE_ID, APP_INITIALIZER } from "@angular/core";
import { provideAnimations } from "@angular/platform-browser/animations";
import { provideRouter, withComponentInputBinding } from "@angular/router";
import { routes } from "./app-routing.module";
import { provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from "@angular/core";
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from "@angular/platform-browser";
import { ErrorInterceptor } from "./core/helpers/error.interceptor";
import { JwtInterceptor } from "./core/helpers/jwt.interceptor";
import { CacheInterceptor } from "./core/helpers/cache.interceptor";
import { DeduplicationInterceptor } from "./core/helpers/deduplication.interceptor";
import { RetryInterceptor } from "./core/helpers/retry.interceptor";
import { TimeoutInterceptor } from "./core/helpers/timeout.interceptor";
import { API_URL, loadApiUrl, getApiUrl } from "./core/config/api-url.config";

export const appConfig = {
    providers: [
      // ✅ DYNAMIC API URL: Load config.json before app initialization
      {
        provide: APP_INITIALIZER,
        useFactory: loadApiUrl,
        multi: true
      },
      // ✅ DYNAMIC API URL: Provide API_URL token with loaded value
      {
        provide: API_URL,
        useFactory: () => {
          // getApiUrl() returns loaded config or default
          return getApiUrl();
        }
      },
      // Locale detection on the client (browser)
      { 
        provide: LOCALE_ID, 
        useFactory: () => {
          const nav: any = (typeof navigator !== 'undefined') ? navigator : null;
          const lang = nav?.language || nav?.languages?.[0] || 'en-US';
          return lang;
        }
      },
      provideBrowserGlobalErrorListeners(),
      provideZoneChangeDetection({ eventCoalescing: true }),
      // ✅ SSR OPTIMIZATION: Enhanced hydration with HTTP transfer cache
      provideClientHydration(
        withEventReplay(),
        withHttpTransferCacheOptions({
          // Don't cache POST requests (mutations)
          includePostRequests: false,
          // Don't cache authenticated requests (they may be user-specific)
          includeRequestsWithAuthHeaders: false,
          // ✅ OPTIMIZED: Cache more API endpoints to reduce duplicate calls
          filter: (req) => {
            // Cache all GET requests except:
            // - Auth endpoints (user-specific)
            // - File uploads
            // - Webhooks
            return req.method === 'GET' && 
                   !req.url.includes('/account/') &&
                   !req.url.includes('/upload/') &&
                   !req.url.includes('/webhook/') &&
                   (
                     req.url.includes('/api/page/') ||
                     req.url.includes('/api/course/') ||    // ✅ Add courses
                     req.url.includes('/api/category/') || // ✅ Add categories  
                     req.url.includes('/api/event/')       // ✅ Add events
                   );
          }
        })
      ),
      provideRouter(routes, withComponentInputBinding()),
      provideHttpClient(withFetch(), withInterceptorsFromDi()),
      provideAnimations(),
      // INTERCEPTOR ORDER MATTERS: Process in this order
      { provide: HTTP_INTERCEPTORS, useClass: DeduplicationInterceptor, multi: true }, // 1. Deduplicate requests first
      { provide: HTTP_INTERCEPTORS, useClass: CacheInterceptor, multi: true },         // 2. Check cache
      { provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true },       // 3. Add timeout
      { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true },         // 4. Retry on failure
      { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },           // 5. Add auth headers
      { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },        // 6. Handle errors (last)
  ]
  };
  