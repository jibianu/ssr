import { HTTP_INTERCEPTORS, provideHttpClient, withFetch, withInterceptorsFromDi } from "@angular/common/http";
import { LOCALE_ID, APP_INITIALIZER, ApplicationConfig } from "@angular/core";
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

const commonProviders = [
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
  provideRouter(routes, withComponentInputBinding()),
  provideHttpClient(withFetch(), withInterceptorsFromDi()),
  provideAnimations(),
  // INTERCEPTOR ORDER MATTERS: Process in this order
  { provide: HTTP_INTERCEPTORS, useClass: DeduplicationInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: CacheInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: TimeoutInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: RetryInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: JwtInterceptor, multi: true },
  { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
];

export const hydrationProviders = [
  provideClientHydration(
    withEventReplay(),
    withHttpTransferCacheOptions({
      includePostRequests: false,
      includeRequestsWithAuthHeaders: false,
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
  )
];

export const appConfigWithoutHydration: ApplicationConfig = {
  providers: [...commonProviders]
};

export const appConfig: ApplicationConfig = {
  providers: [...commonProviders, ...hydrationProviders]
};
  