import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { ToasterService } from '../../shared/component/toaster/toaster.service';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { NetworkStatusService } from '../services/network-status.service';
import { LoggerService } from '../services/logger.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService,
        private networkStatusService: NetworkStatusService,
        private logger: LoggerService
    ) {}

    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID)); 

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // ✅ SSR-FRIENDLY: Suppress verbose logging for network errors during SSR
                // Network errors during SSR are expected if backend is not running
                const isNetworkError = !error.status || error.status === 0;
                const isSSR = !this.isBrowser;
                
                if (isSSR && isNetworkError) {
                    // ✅ SSR: Only log network errors at warning level (they're expected if backend is down)
                    this.logger.warn('SSR: Network error (backend may not be running)', {
                        url: request.url,
                        method: request.method
                    });
                } else {
                    // ✅ Browser or non-network errors: Log normally
                    this.logger.error('Error during http request', error);
                }
                
                // ✅ SUGGESTION 1: Enhanced error classification and handling
                this.handleErrorByStatus(error);

                const errorMessage = this.getErrorMessage(error);
                if (this.isBrowser)
                    this.toasterService.showError(errorMessage);

                // ✅ SSR-friendly: throw an Error object, not a string
                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * ✅ SUGGESTION 1: Handle errors by status code with specific actions
     * Different error types get different handling:
     * - 401: Unauthorized - Auto logout
     * - 403: Forbidden - Show permission message
     * - 404: Not Found - Handle gracefully
     * - 429: Rate Limited - Show retry message
     * - 500-599: Server Error - Show server error message
     * - Network Error: Show connectivity message
     */
    private handleErrorByStatus(error: HttpErrorResponse): void {
        switch (error.status) {
            case 401:
                this.handleUnauthorizedError();
                break;
            case 403:
                this.handleForbiddenError();
                break;
            case 404:
                this.handleNotFoundError();
                break;
            case 429:
                this.handleRateLimitError();
                break;
            default:
                // Handle server errors (500-599)
                if (error.status >= 500 && error.status < 600) {
                    this.handleServerError(error);
                }
                // Handle network errors (status 0 or no status)
                else if (error.status === 0 || !error.status) {
                    this.handleNetworkError(error);
                }
                break;
        }
    }

    private handleUnauthorizedError(): void {
        // Only show toaster and navigate in browser
        if (this.isBrowser) {
            this.authenticationService.logout();
            this.toasterService.showError("Your session has expired or you don't have permission to access this resource");
            this.router.navigate(['/auth/login']);
        }
    }

    /**
     * ✅ SUGGESTION 1: Handle 403 Forbidden errors
     */
    private handleForbiddenError(): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        this.logger.warn('403 Forbidden: User does not have permission for this resource');
    }

    /**
     * ✅ SUGGESTION 1: Handle 404 Not Found errors gracefully
     */
    private handleNotFoundError(): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        this.logger.warn('404 Not Found: The requested resource was not found');
    }

    /**
     * ✅ SUGGESTION 1: Handle 429 Rate Limit errors
     */
    private handleRateLimitError(): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        this.logger.warn('429 Rate Limited: Too many requests. Please wait a moment and try again.');
        // Note: RetryInterceptor will handle the actual retry with backoff
    }

    /**
     * ✅ SUGGESTION 1: Handle 500-599 Server errors
     */
    private handleServerError(error: HttpErrorResponse): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        this.logger.error(`Server Error ${error.status}: The server encountered an error processing your request`, error);
        // Note: RetryInterceptor will handle retries for 5xx errors
    }

    /**
     * ✅ SUGGESTION 1 & 4: Handle network/connectivity errors with network status detection
     */
    private handleNetworkError(error?: HttpErrorResponse): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        const isOffline = this.networkStatusService.isOffline;
        if (isOffline) {
            this.logger.error('Network Error: You are currently offline. Please check your internet connection.');
        } else {
            // ✅ Check if this is a CORS error
            const isCorsError = this.isCorsError(error);
            
            if (isCorsError) {
                const frontendOrigin = this.isBrowser ? window.location.origin : 'SSR';
                const backendUrl = error?.url || 'http://localhost:52046/';
                
                const corsMessage = '🚫 CORS ERROR: Backend is blocking cross-origin requests\n\n' +
                    `Frontend Origin: ${frontendOrigin}\n` +
                    `Backend URL: ${backendUrl}\n\n` +
                    '🔧 BACKEND FIX REQUIRED:\n\n' +
                    'The backend needs to allow CORS from your frontend origin.\n' +
                    'In your .NET Core backend, add/update CORS configuration:\n\n' +
                    '📝 In Program.cs or Startup.cs:\n' +
                    '```csharp\n' +
                    '// Allow CORS for local development\n' +
                    'builder.Services.AddCors(options =>\n' +
                    '{\n' +
                    '    options.AddPolicy("AllowLocalDev", policy =>\n' +
                    '    {\n' +
                    '        policy.WithOrigins(\n' +
                    `            "http://localhost:4200",\n` +
                    `            "http://localhost:65479",\n` +
                    '            "http://localhost:4000",  // SSR port\n' +
                    '            "https://localhost:4200"   // If using HTTPS frontend\n' +
                    '        )\n' +
                    '        .AllowAnyMethod()\n' +
                    '        .AllowAnyHeader()\n' +
                    '        .AllowCredentials();\n' +
                    '    });\n' +
                    '});\n\n' +
                    '// Apply CORS middleware\n' +
                    'app.UseCors("AllowLocalDev");\n' +
                    '```\n\n' +
                    '✅ VERIFICATION:\n' +
                    '1. Restart your backend after adding CORS configuration\n' +
                    '2. Check browser Network tab - you should see:\n' +
                    '   - OPTIONS request (preflight) returns 200 OK\n' +
                    '   - Response headers include: Access-Control-Allow-Origin\n' +
                    '3. If still failing, check backend logs for CORS errors';
                
                this.logger.error(corsMessage);
            } else {
                // ✅ IMPROVEMENT: More specific error message with troubleshooting steps for ERR_EMPTY_RESPONSE
                const message = 'ERR_EMPTY_RESPONSE: Connection refused - Backend server is not responding.\n\n' +
                    '🔍 DIAGNOSTIC STEPS:\n' +
                    '1. ✅ Check if backend is running:\n' +
                    '   - Open http://localhost:52046/ in your browser (HTTP port)\n' +
                    '   - Or https://localhost:52045/ (HTTPS port)\n' +
                    '   - If "Connection refused" → Backend is NOT running\n' +
                    '   - If page loads → Backend is running (likely CORS issue)\n\n' +
                    '2. ✅ Verify backend port and protocol:\n' +
                    '   - Check backend logs for port binding (HTTP: 52046, HTTPS: 52045)\n' +
                    '   - Current config uses HTTP on port 52046\n' +
                    '   - To use HTTPS: change environment.ts to https://localhost:52045/\n\n' +
                    '3. ✅ Check backend logs:\n' +
                    '   - Look for startup errors or crashes\n' +
                    '   - Verify backend started successfully\n\n' +
                    '4. ✅ Test backend directly:\n' +
                    '   - Try: http://localhost:52046/page/category (HTTP)\n' +
                    '   - Or: https://localhost:52045/page/category (HTTPS)\n' +
                    '   - Check browser Network tab for detailed error\n\n' +
                    '5. ✅ Firewall/Antivirus:\n' +
                    '   - Temporarily disable to test if blocking connection';
                this.logger.error(message);
            }
        }
    }

    /**
     * Detect if the error is a CORS error
     */
    private isCorsError(error?: HttpErrorResponse): boolean {
        if (!error || !this.isBrowser) {
            return false;
        }

        // Check error message for CORS keywords
        const errorMessage = error.message?.toLowerCase() || '';
        const errorText = error.error?.toString().toLowerCase() || '';
        
        const corsKeywords = [
            'cors',
            'cross-origin',
            'access-control-allow-origin',
            'blocked by cors policy',
            'preflight'
        ];

        const hasCorsKeyword = corsKeywords.some(keyword => 
            errorMessage.includes(keyword) || errorText.includes(keyword)
        );

        // If we found CORS keywords, it's definitely a CORS error
        if (hasCorsKeyword) {
            return true;
        }

        // Check if this is a cross-origin request failure
        // CORS errors typically have:
        // - Status 0 (request blocked by browser)
        // - URL pointing to a different origin than the current page
        if (error.status === 0 && error.url) {
            try {
                const frontendOrigin = window.location.origin;
                const requestUrl = new URL(error.url, window.location.href);
                const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`;
                
                // If origins are different, this could be a CORS error
                const isCrossOrigin = frontendOrigin !== requestOrigin;
                
                // Additional check: status 0 with cross-origin is very likely CORS
                if (isCrossOrigin) {
                    return true;
                }
            } catch (e) {
                // If URL parsing fails, fall back to basic checks
            }
        }

        return false;
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        // ✅ SUGGESTION 1: Enhanced error messages based on status
        if (error.status === 403) {
            return error.error?.message || 'You do not have permission to access this resource';
        }
        
        if (error.status === 404) {
            return error.error?.message || 'The requested resource was not found';
        }
        
        if (error.status === 429) {
            return error.error?.message || 'Too many requests. Please wait a moment and try again.';
        }
        
        if (error.status >= 500 && error.status < 600) {
            return error.error?.message || 'Server error. Please try again later.';
        }
        
        if (error.status === 0 || !error.status) {
            // Check if this is a CORS error
            if (this.isCorsError(error)) {
                return 'CORS Error: Backend is blocking cross-origin requests. Backend needs CORS configuration.';
            }
            return 'Network error. Please check your internet connection and try again.';
        }

        // Prefer error.message from backend if available
        if (error.error?.message) {
            return error.error.message;
        }

        // Fallbacks
        return error.message || error.statusText || 'An unexpected error occurred';
    }
}
