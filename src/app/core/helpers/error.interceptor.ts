import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { ToasterService } from '../../shared/component/toaster/toaster.service';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { isPlatformBrowser } from '@angular/common';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService
    ) {}

    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID)); 

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    this.handleUnauthorizedError();
                }

                const errorMessage = this.getErrorMessage(error);
                if (this.isBrowser)
                    this.toasterService.showError(errorMessage);

                // ✅ SSR-friendly: throw an Error object, not a string
                return throwError(() => new Error(errorMessage));
            })
        );
    }

    private handleUnauthorizedError(): void {
        this.authenticationService.logout();
        this.toasterService.showError("Your session has expired or you don't have permission to access this resource");
        this.router.navigate(['/auth/login']);
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        // Prefer error.message from backend if available
        if (error.error?.message) {
            return error.error.message;
        }

        // Fallbacks
        return error.message || error.statusText || 'An unexpected error occurred';
    }
}
