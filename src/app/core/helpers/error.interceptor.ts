import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
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
                // Use LoggerService for consistent logging (handles SSR and production)
                this.logger.error('Error during http request', error);
                
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
                    this.handleNetworkError();
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
    private handleNetworkError(): void {
        // Use LoggerService for consistent logging (handles SSR and production)
        const isOffline = this.networkStatusService.isOffline;
        if (isOffline) {
            this.logger.error('Network Error: You are currently offline. Please check your internet connection.');
        } else {
            // ✅ IMPROVEMENT: More specific error message for localhost connections
            this.logger.error('Network Error: Unable to connect to the server. If using local backend, ensure it is running and CORS is configured correctly.');
        }
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
