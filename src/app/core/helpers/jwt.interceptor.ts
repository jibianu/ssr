import { NgxSpinnerService } from 'ngx-spinner';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { 
    HttpRequest, 
    HttpHandler, 
    HttpEvent, 
    HttpInterceptor 
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private readonly excludedEndpoints = [
        'Course',
        'Dashboard'
    ];

    constructor(
        private authenticationService: AuthenticationService,
        private spinner: NgxSpinnerService
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if (this.shouldShowSpinner(request.url)) {
            this.spinner.show();
        }

        const modifiedRequest = this.addAuthHeader(request);

        return next.handle(modifiedRequest).pipe(
            finalize(() => this.spinner.hide())
        );
    }

    private shouldShowSpinner(url: string): boolean {
        return !this.excludedEndpoints.some(endpoint => url.includes(endpoint));
    }

    private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
        const token = this.authenticationService.currentToken();
        
        if (!token) {
            return request;
        }

        return request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }
}