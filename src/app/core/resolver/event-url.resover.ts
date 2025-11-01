import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, map } from 'rxjs/operators';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { PublicAppService } from '../../modules/publicapp/publicapp.service';

@Injectable({ providedIn: 'root' })
export class EventResolverService  {
    private readonly notFoundRoute = ['page-not-found'];

    constructor(
        private adminService: AdminAppService,
        private publicAppService: PublicAppService,
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

        // ✅ PARALLEL API CALLS: Fetch event first, then fetch upcoming events in parallel
        // Using switchMap to chain dependent calls, but fetch upcoming events immediately after event is resolved
        return this.adminService.getEventByCanonicalURL(eventUrl).pipe(
            switchMap((event: any) => {
                if (!event || !event.id) {
                    this.redirectToNotFound();
                    return of(null);
                }

                // ✅ OPTIMIZATION: Fetch upcoming events immediately after event is resolved
                // Both API calls happen during SSR, reducing client-side loading time
                const upcomingEvents$ = this.publicAppService.getUpcomingEvents(event.id).pipe(
                    catchError(() => of([])) // Fallback to empty array on error
                );

                // Combine event data with upcoming events
                return upcomingEvents$.pipe(
                    map((upcomingEvents: any[]) => ({
                        ...event,
                        upcomingEvents: upcomingEvents || []
                    }))
                );
            }),
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