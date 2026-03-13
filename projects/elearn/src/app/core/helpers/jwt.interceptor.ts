import { environment } from './../../../environments/environment';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
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
        private spinner: NgxSpinnerService,
        private modalService: NgbModal) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        const token = this.authenticationService.currentToken();
        let uploadimage = false;
        const isDashboardRequest = /api\/(admin|company|management|student|trainer)\/dashboard/.test(request.url);
        if (!isDashboardRequest) {
            this.spinner.show();
        }
        if (token) {
            if (request.url.includes('api/CurriculumVideoLecture/UploadImage') || request.url.includes('api/CurriculumVideoLecture/UploadVideo')) {
                uploadimage = true;
            }
            // Apply to full API URL or relative /api paths (e.g. when using proxy)
            const isApiRequest = !environment.apiUrl || request.url.startsWith(environment.apiUrl) || request.url.startsWith('/api');
            if (isApiRequest) {
                const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
                const headers: Record<string, string> = {
                    Authorization: bearerToken
                };
                // Optional: send correlation ID for backend tracing (backend reads X-Correlation-Id)
                const correlationId = request.headers.get('X-Correlation-Id') ?? crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                headers['X-Correlation-Id'] = correlationId;
                request = request.clone({ setHeaders: headers });
            }
        }

        return next.handle(request).pipe(
            finalize(() => {
                if (!isDashboardRequest) {
                    this.spinner.hide();
                }
                if(this.modalService.hasOpenModals() && !uploadimage){
                    // this.modalService.dismissAll();
                }
            })
        );
    }
}
