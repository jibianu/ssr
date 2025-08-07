import { ToasterService } from '../../shared/component/toaster/toaster.service';
import { Router } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401) {
                    this.handleUnauthorizedError();
                }

                // You might want to handle other status codes here
                // else if (error.status === 403) {...}
                // else if (error.status === 404) {...}

                const errorMessage = this.getErrorMessage(error);
                this.toasterService.showError(errorMessage);
                
                return throwError(() => errorMessage);
            })
        );
    }

    private handleUnauthorizedError(): void {
        this.authenticationService.logout();
        this.toasterService.showError("Your session has expired or you don't have permission to access this resource");
        this.router.navigate(['/auth/login']);
    }

    private getErrorMessage(error: HttpErrorResponse): string {
        // Prioritize server-provided error message if available
        if (error.error?.message) {
            return error.error.message;
        }

        // Fallback to status text or generic message
        return error.statusText || 'An unexpected error occurred';
    }
}