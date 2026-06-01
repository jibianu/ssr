import { getApiBaseUrl } from './api-base-url.helper';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxSpinnerService } from 'ngx-spinner';
import { AuthenticationService } from './../../modules/auth/auth.service';
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    /**
     * Periodic / fire-and-forget calls should not toggle the global fullscreen spinner.
     * Otherwise heartbeat + analytics events cause visible "blinking" every few seconds.
     */
    private static isSilentBackgroundUrl(url: string): boolean {
        const u = url.toLowerCase();
        return (
            u.includes('/api/analytics/') ||
            u.includes('/api/student/session/') ||
            u.includes('savecurriculumwatchprogress') ||
            // Large media/file streams have their own inline loaders – don't block the
            // whole page with the fullscreen overlay while they download.
            (u.includes('/api/studymaterialfile/') && (u.includes('/content') || u.includes('stream'))) ||
            u.includes('streamvideo')
        );
    }

    /** Overlay show/hide per request causes flicker when several calls overlap — use a refcount instead. */
    private static fullscreenSpinnerRefs = 0;

    constructor(
        private authenticationService: AuthenticationService,
        private spinner: NgxSpinnerService,
        private modalService: NgbModal) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add authorization header with jwt token if available
        const token = this.authenticationService.currentToken();
        let uploadimage = false;
        // Direct-to-S3 uploads/downloads (presigned URLs) must NOT receive our Authorization
        // header (S3 rejects requests with two auth mechanisms) and shouldn't block the UI.
        const isExternalStorage = /amazonaws\.com/i.test(request.url);
        const isDashboardRequest = /api\/(admin|company|management|student|trainer)\/(dashboard|billing)/.test(request.url);
        const showSpinner =
            !isExternalStorage && !isDashboardRequest && !JwtInterceptor.isSilentBackgroundUrl(request.url);
        if (showSpinner) {
            JwtInterceptor.fullscreenSpinnerRefs++;
            if (JwtInterceptor.fullscreenSpinnerRefs === 1) {
                this.spinner.show();
            }
        }
        if (token && !isExternalStorage) {
            if (request.url.includes('api/CurriculumVideoLecture/UploadImage') || request.url.includes('api/CurriculumVideoLecture/UploadVideo')) {
                uploadimage = true;
            }
            // Apply to full API URL or relative /api paths (e.g. when using proxy)
            const apiBase = getApiBaseUrl();
            const isApiRequest =
                request.url.includes('/api/') ||
                request.url.startsWith('/api') ||
                request.url.includes('/certificate/') ||
                !apiBase ||
                request.url.startsWith(apiBase);
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
                if (showSpinner) {
                    JwtInterceptor.fullscreenSpinnerRefs = Math.max(
                        0,
                        JwtInterceptor.fullscreenSpinnerRefs - 1
                    );
                    if (JwtInterceptor.fullscreenSpinnerRefs === 0) {
                        this.spinner.hide();
                    }
                }
                if(this.modalService.hasOpenModals() && !uploadimage){
                    // this.modalService.dismissAll();
                }
            })
        );
    }
}
