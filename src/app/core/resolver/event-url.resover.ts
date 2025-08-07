import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';

@Injectable({ providedIn: 'root' })
export class EventResolverService  {
    private readonly notFoundRoute = ['page-not-found'];

    constructor(
        private adminService: AdminAppService,
        private router: Router
    ) {}

    resolve(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): Observable<any> {
        const eventUrl = route.params.url;

        if (!eventUrl) {
            this.redirectToNotFound();
            return of(null);
        }

        return this.adminService.getEventByCanonicalURL(eventUrl).pipe(
            catchError(error => {
                console.error('Error resolving event:', error);
                this.redirectToNotFound();
                return of(null);
            })
        );
    }

    private redirectToNotFound(): void {
        this.router.navigate(this.notFoundRoute, {
            state: { attemptedUrl: this.router.url }
        });
    }
}