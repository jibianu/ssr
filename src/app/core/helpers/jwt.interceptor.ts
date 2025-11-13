import { NgxSpinnerService } from 'ngx-spinner';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private readonly excludedEndpoints = [
        'Course',
        'Dashboard'
    ];
    
    private spinnerTimeout: any;
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    constructor(
        private authenticationService: AuthenticationService,
        private spinner: NgxSpinnerService
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Debounce spinner: only show after 300ms delay
        if (this.shouldShowSpinner(request.url)) {
            this.spinnerTimeout = setTimeout(() => {
                if (this.isBrowser) {
                    this.spinner.show();
                }
            }, 300);
        }

        let refreshAttempted = false;
        const modifiedRequest = this.addAuthHeader(request);

        return next.handle(modifiedRequest).pipe(
            catchError(error => {
                if (
                    !refreshAttempted &&
                    error?.status === 401 &&
                    this.authenticationService.canRefreshToken()
                ) {
                    refreshAttempted = true;
                    if (typeof ngDevMode === 'undefined' || ngDevMode) {
                        console.warn('[JwtInterceptor] 401 detected. Attempting token refresh before retry.', {
                            url: request.url
                        });
                    }

                    return this.authenticationService.refreshTokens().pipe(
                        switchMap(newToken => {
                            if (!newToken) {
                                return throwError(() => error);
                            }

                            const retryRequest = this.addAuthHeader(request, newToken);
                            return next.handle(retryRequest);
                        }),
                        catchError(refreshError => {
                            return throwError(() => refreshError || error);
                        })
                    );
                }

                return throwError(() => error);
            }),
            finalize(() => {
                // Clear timeout if request completes before showing spinner
                if (this.spinnerTimeout) {
                    clearTimeout(this.spinnerTimeout);
                    this.spinnerTimeout = null;
                } else if (this.isBrowser) {
                    // Only hide if spinner was shown
                    this.spinner.hide();
                }
            })
        );
    }

    private shouldShowSpinner(url: string): boolean {
        return !this.excludedEndpoints.some(endpoint => url.includes(endpoint));
    }

    private addAuthHeader(request: HttpRequest<any>, tokenOverride?: string): HttpRequest<any> {
        if (!this.isBrowser) {
            return request;
        }
        
        const token = tokenOverride ?? this.authenticationService.currentToken();
        
        if (!token) {
            return request;
        }

        const authRequest = request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            console.debug('[JwtInterceptor] Attached Authorization header', {
                url: request.url,
                hasToken: !!token,
                tokenPreview: token.substring(0, Math.min(token.length, 20)) + '...'
            });
        }
        return authRequest;
    }
}