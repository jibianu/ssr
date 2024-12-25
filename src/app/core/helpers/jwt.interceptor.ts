import { NgxSpinnerService } from 'ngx-spinner';
import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(
        private authenticationService: AuthenticationService,
        private spinner: NgxSpinnerService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        // console.log(request)
        if(request.url.includes("Course") && request.url.includes("Dashboard")  ){
        }else{
            this.spinner.show();
        }
        const token = this.authenticationService.currentToken();
        if (token) {
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });
        }

        return next.handle(request).pipe(
            finalize(() => this.spinner.hide())
        );
    }
}
