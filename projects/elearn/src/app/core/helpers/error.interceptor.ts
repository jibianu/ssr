import { ToasterService } from './../../shared/component/toaster/toaster.service';
import { Router } from '@angular/router';
import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    /** Prevent redirect-to-login loops when backend is flaky. */
    private lastLoginRedirectAt = 0;
    private readonly loginRedirectCooldownMs = 5000;

    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService,
        private modalService: NgbModal
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            // Certificate API handles 204/400/403/404 itself; do not convert error so caller gets HttpErrorResponse with status
            if (request.url.includes('Document/Entry/CourseCertificate')) {
                return throwError(() => err);
            }

            if (err.status === 401) {
                const reqUrl = (request.url || '').toLowerCase();
                const isCompanyOrCorporateBlogApi =
                    reqUrl.includes('api/company/blog') || reqUrl.includes('api/admin/blog/corporate');
                if (isCompanyOrCorporateBlogApi) {
                    return throwError(() => err);
                }
                const url = this.router.url.split('?')[0];
                const isAuthShellRoute =
                    /^\/(login|register|callback|google-callback|forget-password|verification|fg-code|change-password|user-unavailable)(?:\/|$|\?)/.test(url) ||
                    /^\/register\//.test(url) ||
                    /^\/register-/.test(url);
                const isProtectedAppRoute =
                    url.startsWith('/app/') ||
                    url.startsWith('/course/app/') ||
                    /^\/elearn\/app\//i.test(url);
                const isPublicPage =
                    url === '/' ||
                    url === '' ||
                    (!isProtectedAppRoute && !isAuthShellRoute);
                const isGetInfo = request.url.toLowerCase().includes('getinfo');
                /** Background/optional calls must not wipe cookies (was signing users out on sidebar nav). */
                if (isGetInfo || isPublicPage || isAuthShellRoute) {
                    return throwError(() => err);
                }
                const now = Date.now();
                if (now - this.lastLoginRedirectAt >= this.loginRedirectCooldownMs) {
                    this.lastLoginRedirectAt = now;
                    const isShowError = !request.url.toLowerCase().includes('payment/checkout');
                    if (isShowError) {
                        this.toasterService.showError('Session expired or invalid. Please log in again.');
                    }
                    try {
                        if (this.modalService.hasOpenModals()) {
                            this.modalService.dismissAll();
                        }
                    } catch (_) { /* ignore */ }
                    this.authenticationService.logout();
                    this.router.navigateByUrl('/login');
                }
                return throwError(() => err);
            } else if (err.status === 500) {
                if (err?.error?.Messages?.length) {
                    this.toasterService.showError(err.error.Messages[0]);
                } else {
                    this.toasterService.showError('An unexpected error occurred. Please try again.');
                }
            }

            // Rethrow full HttpErrorResponse so callers can use err.status, err.error, etc.
            return throwError(() => err);
        }));
    }
}
