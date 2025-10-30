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

        // Resolver runs on server - just fetch the data
        // TransferState will be handled by HTTP transfer cache
        return this.adminService.getEventByCanonicalURL(eventUrl).pipe(
            catchError((err: unknown) => {
                const message = err instanceof Error ? err.message : JSON.stringify(err);
                console.error('Error resolving event:', message);
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