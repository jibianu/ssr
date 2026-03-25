import { Injectable, Inject } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { API_URL } from '../config/api-url.config';

/**
 * Dev-only: flags impossible URL shapes (e.g. accidental triple "course" segment).
 * Does not change requests. Backend legitimately uses page/course/course/{slug}
 * (controller route "page/course" + action "course/{slug}").
 */
@Injectable()
export class ApiUrlAuditInterceptor implements HttpInterceptor {
  constructor(@Inject(API_URL) private readonly apiUrl: string) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!environment.production && typeof ngDevMode !== 'undefined' && ngDevMode) {
      const u = request.url || '';
      const base = (this.apiUrl || '').replace(/\/+$/, '');
      if (base && u.startsWith(base)) {
        const path = u.slice(base.length);
        if (path.includes('page/course/course/course/')) {
          console.warn('[ApiUrlAudit] Unexpected triple course segment — check URL builder:', u);
        }
      }
    }
    return next.handle(request);
  }
}
