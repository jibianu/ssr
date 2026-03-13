import { ToasterService } from './../../shared/component/toaster/toaster.service';
import { Router } from '@angular/router';
import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { EMPTY, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            // Certificate API handles 204/400/403/404 itself; do not convert error so caller gets HttpErrorResponse with status
            if (request.url.includes('Document/Entry/CourseCertificate')) {
                return throwError(() => err);
            }

            if (err.status === 401) {
                this.authenticationService.logout();
                // Do not redirect to login when on a public page (e.g. affiliate course URL) so anonymous users can view
                const url = this.router.url.split('?')[0];
                const isPublicPage = url === '/' || url === '' || (!url.startsWith('/app/') && !url.startsWith('/auth/'));
                const isGetInfo = request.url.toLowerCase().includes('getinfo');
                if (isGetInfo || isPublicPage) {
                    return throwError(() => err);
                }
                const isShowError = !request.url.toLowerCase().includes('payment/checkout');
                if (isShowError) {
                    this.toasterService.showError('Session expired or invalid. Please log in again.');
                }
                this.router.navigateByUrl('/auth/login');
                return EMPTY;
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
