import { ToasterService } from './../../shared/component/toaster/toaster.service';
import { Router } from '@angular/router';
import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private authenticationService: AuthenticationService,
        private router: Router,
        private toasterService: ToasterService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(catchError(err => {
            if (err.status === 401) {
                
                
                // auto logout if 401 response returned from api
                this.authenticationService.logout();
                    this.toasterService.showError("You don't have permission to access this resource");
                this.router.navigateByUrl('/auth/login');
                // location.reload();
            }

            const error = err.statusText;
            return throwError(error);
        }));
    }
}
