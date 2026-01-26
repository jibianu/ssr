import { NgxSpinnerService } from 'ngx-spinner';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
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
    private readonly isBrowser: boolean;

    constructor(
        private authenticationService: AuthenticationService,
        private spinner: NgxSpinnerService,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        // ✅ FIX: Initialize in constructor to prevent injector errors during SSR
        // Field initializers with inject() can fail if injector is destroyed during SSR
        this.isBrowser = isPlatformBrowser(this.platformId);
    }

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
                            url: request.url,
                            hasRefreshToken: this.authenticationService.canRefreshToken()
                        });
                    }

                    return this.authenticationService.refreshTokens().pipe(
                        switchMap(newToken => {
                            if (!newToken) {
                                if (typeof ngDevMode === 'undefined' || ngDevMode) {
                                    console.error('[JwtInterceptor] ❌ Token refresh failed - no new token received. User will be logged out.');
                                }
                                return throwError(() => error);
                            }

                            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                                console.log('[JwtInterceptor] ✅ Token refreshed successfully. Retrying original request.');
                            }

                            const retryRequest = this.addAuthHeader(request, newToken);
                            return next.handle(retryRequest);
                        }),
                        catchError(refreshError => {
                            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                                console.error('[JwtInterceptor] ❌ Token refresh error:', refreshError);
                                console.error('[JwtInterceptor]   Refresh endpoint may be failing or refresh token is invalid.');
                            }
                            return throwError(() => refreshError || error);
                        })
                    );
                } else if (error?.status === 401) {
                    // 401 but can't refresh (no refresh token or already attempted)
                    if (typeof ngDevMode === 'undefined' || ngDevMode) {
                        if (!this.authenticationService.canRefreshToken()) {
                            console.warn('[JwtInterceptor] ⚠️ 401 Unauthorized - No refresh token available. User must login again.');
                        } else {
                            console.warn('[JwtInterceptor] ⚠️ 401 Unauthorized - Refresh already attempted or refresh token missing.');
                        }
                    }
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

    /**
     * ✅ PRODUCTION-READY: Enhanced token attachment with comprehensive checks
     * - Skips SSR (server-side rendering)
     * - Gets token from auth service (with fallback to direct storage access)
     * - Only attaches to API requests (excludes public assets)
     * - Adds Bearer token format
     * - Includes debug logging in development mode
     */
    private addAuthHeader(request: HttpRequest<any>, tokenOverride?: string): HttpRequest<any> {
        // ✅ CRITICAL: Log PUT request body to verify RowVersion is included
        if (request.method === 'PUT' && request.url.includes('/page/event/') && request.body) {
            const body = request.body;
            const rowVersion = (body as any)?.rowVersion || (body as any)?.RowVersion;
            console.log('[JwtInterceptor] 🔍 PUT Event Request Body Check:', {
                url: request.url,
                hasBody: !!request.body,
                hasRowVersion: !!rowVersion,
                rowVersion: rowVersion ? (typeof rowVersion === 'string' ? rowVersion.substring(0, 20) + '...' : 'NOT_STRING') : 'MISSING',
                rowVersionType: rowVersion ? typeof rowVersion : 'null',
                bodyKeys: Object.keys(body || {}).slice(0, 15)
            });
        }
        // ✅ SSR: Skip token attachment on server-side
        if (!this.isBrowser) {
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                console.debug('[JwtInterceptor] Skipping token attachment - server-side rendering');
            }
            return request;
        }
        
        // ✅ Get ID Token - use override if provided, otherwise get from service
        const token = tokenOverride ?? this.authenticationService.getIdToken();
        
        // ✅ DIAGNOSTIC: Enhanced logging to debug token attachment issues
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            const isAuthRequest = request.url.includes('/account/login') || request.url.includes('/account/register');
            if (!isAuthRequest) {
                console.log(`[JwtInterceptor] 🔍 Processing request: ${request.method} ${request.url}`);
                console.log(`[JwtInterceptor]   Token override provided: ${!!tokenOverride}`);
                console.log(`[JwtInterceptor]   Token from service: ${token ? `YES (length: ${token.length})` : 'NO'}`);
                
                if (!token) {
                    console.warn(`[JwtInterceptor] ⚠️  NO TOKEN AVAILABLE for ${request.url}`);
                    console.warn(`[JwtInterceptor]   This will cause 401 Unauthorized!`);
                    console.warn(`[JwtInterceptor]   Check if user is logged in and token is stored correctly.`);
                }
            }
        }
        
        // ✅ Skip if no token available
        if (!token || typeof token !== 'string' || token.trim().length === 0) {
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                // Only log in dev mode to avoid console spam
                const isAuthRequest = request.url.includes('/account/login') || request.url.includes('/account/register');
                if (!isAuthRequest) {
                    console.warn('[JwtInterceptor] ❌ No token available for request', {
                        url: request.url,
                        method: request.method,
                        hasTokenOverride: !!tokenOverride,
                        tokenFromService: !!this.authenticationService.getIdToken()
                    });
                }
            }
            return request;
        }

        // ✅ CRITICAL: Inspect auth token metadata
        try {
            const tokenParts = token.split('.');
            if (tokenParts.length >= 2) {
                const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
                const exp = payload.exp;
                const tokenUse = payload.token_use;
                const issuer = payload.iss;
                
                // ✅ CHANGED: Custom JWTs don't have token_use claim - this is expected
                // Only warn if token_use is present (Cognito token) or has unexpected value
                if (!tokenUse) {
                    // Custom JWT - no warning needed, this is expected
                    if (typeof ngDevMode !== 'undefined' && ngDevMode) {
                        console.debug('[JwtInterceptor] ✅ Custom JWT detected (no token_use claim) - expected');
                    }
                } else if (tokenUse === 'id') {
                    console.warn('[JwtInterceptor] ⚠️  Cognito ID token detected. Backend now issues custom JWT tokens.');
                    console.warn('[JwtInterceptor]   This request may fail if backend rejects Cognito tokens.');
                } else {
                    console.warn('[JwtInterceptor] ⚠️  Unexpected token_use value:', tokenUse);
                }
                
                if (exp) {
                    const expiryDate = new Date(exp * 1000);
                    const now = new Date();
                    const isExpired = expiryDate < now;
                    const timeUntilExpiry = expiryDate.getTime() - now.getTime();
                    
                    const userId = payload.sub || payload['cognito:username'] || payload.email;
                    
                    console.debug('[JwtInterceptor] Auth token expiry check', {
                        expiresAt: expiryDate.toISOString(),
                        currentTime: now.toISOString(),
                        isExpired,
                        timeUntilExpiryMs: timeUntilExpiry,
                        timeUntilExpiryMinutes: Math.round(timeUntilExpiry / 60000),
                        issuer: payload.iss,
                        subject: payload.sub,
                        tokenUse: payload.token_use
                    });
                    
                    console.log('[JwtInterceptor] 🔍 TOKEN ISSUER (iss claim):', payload.iss);
                    console.log('[JwtInterceptor] 🔍 TOKEN SUBJECT (sub claim):', payload.sub);

                    if (isExpired) {
                        console.warn('[JwtInterceptor] ⚠️ Auth token is EXPIRED! This will cause 401 Unauthorized.', {
                            expiredAt: expiryDate.toISOString(),
                            currentTime: now.toISOString()
                        });
                    }
                }
            }
        } catch (e) {
            // Token parsing failed - not a critical error, continue with request
            console.error('[JwtInterceptor] ❌ Could not parse ID Token for expiry check', e);
            console.error('[JwtInterceptor] Token preview:', token.substring(0, 50) + '...');
        }

        // ✅ Skip token attachment for public endpoints that don't require auth
        const publicEndpoints = ['/account/login', '/account/register', '/assets/', '/api/public'];
        const isPublicEndpoint = publicEndpoints.some(endpoint => request.url.toLowerCase().includes(endpoint.toLowerCase()));
        if (isPublicEndpoint) {
            if (typeof ngDevMode === 'undefined' || ngDevMode) {
                console.debug('[JwtInterceptor] Skipping token attachment for public endpoint:', request.url);
            }
            return request;
        }

        // ✅ Clone request and add Authorization header
        // ✅ CRITICAL: Ensure proper Bearer token format (capital B, single space, trimmed token)
        const cleanToken = token.trim();
        const authHeaderValue = `Bearer ${cleanToken}`;
        
        const authRequest = request.clone({
            setHeaders: {
                Authorization: authHeaderValue
            }
        });

        // ✅ CRITICAL: Enhanced debug logging to verify token attachment
        if (typeof ngDevMode === 'undefined' || ngDevMode) {
            console.log('[JwtInterceptor] ✅ Attached Authorization header', {
                url: request.url,
                method: request.method,
                hasToken: !!token,
                tokenLength: token.length,
                tokenPreview: token.substring(0, Math.min(token.length, 50)) + '...',
                headerValue: authHeaderValue.substring(0, Math.min(authHeaderValue.length, 60)) + '...'
            });
            
            // ✅ CRITICAL: Verify the header is actually set on the cloned request
            const clonedHeader = authRequest.headers.get('Authorization');
            if (clonedHeader) {
                console.log('[JwtInterceptor] ✅ VERIFIED: Authorization header is set on request:', {
                    headerLength: clonedHeader.length,
                    headerPreview: clonedHeader.substring(0, Math.min(clonedHeader.length, 60)) + '...',
                    startsWithBearer: clonedHeader.startsWith('Bearer ')
                });
            } else {
                console.error('[JwtInterceptor] ❌ CRITICAL ERROR: Authorization header is NOT set on cloned request!');
                console.error('[JwtInterceptor]   This means the token will NOT be sent to the backend!');
            }
        }

        return authRequest;
    }
}