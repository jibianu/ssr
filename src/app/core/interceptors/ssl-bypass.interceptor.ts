import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * SSLBypassInterceptor
 * 
 * For local development only: Helps handle self-signed SSL certificates
 * by providing better error messages when SSL certificate validation fails.
 * 
 * NOTE: This does NOT bypass SSL validation - it only provides better error messages.
 * To actually use self-signed certificates, you need to trust them on your system:
 * - Windows: Install certificate in "Trusted Root Certification Authorities"
 * - Linux/Mac: Use `dotnet dev-certs https --trust` (for .NET Core backend)
 * 
 * For production, always use valid SSL certificates.
 */
@Injectable()
export class SSLBypassInterceptor implements HttpInterceptor {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly isDevelopment = !environment.production;

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Only active in development and browser
    if (!this.isBrowser || !this.isDevelopment) {
      return next.handle(request);
    }

    // Check if request is to localhost with HTTPS
    const isLocalHttps = request.url.startsWith('https://localhost') || 
                        request.url.startsWith('https://127.0.0.1');

    if (isLocalHttps) {
      // Add a header to indicate this is a local development request
      // The backend can use this to provide better error messages if needed
      const modifiedRequest = request.clone({
        setHeaders: {
          'X-Local-Development': 'true'
        }
      });
      return next.handle(modifiedRequest);
    }

    return next.handle(request);
  }
}
