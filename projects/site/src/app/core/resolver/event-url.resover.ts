import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { PublicAppService } from '../../modules/publicapp/publicapp.service';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';

@Injectable({ providedIn: 'root' })
export class EventResolverService {
    constructor(
        private adminService: AdminAppService,
        private publicAppService: PublicAppService,
        private router: Router
    ) {}

    resolve(
        route: ActivatedRouteSnapshot,
        _state: RouterStateSnapshot
    ): Observable<any | UrlTree> {
        const eventUrl = normalizeEventCanonicalSlug(route.paramMap.get('url'));

        if (!eventUrl) {
            return of(this.notFoundTree());
        }

        return this.adminService.getEventByCanonicalURL(eventUrl).pipe(
            switchMap((event: { id?: string } | null) => {
                if (event?.id) {
                    return this.publicAppService.getUpcomingEvents(event.id).pipe(
                        map((upcomingEvents: unknown[]) => ({
                            ...event,
                            upcomingEvents: upcomingEvents || []
                        })),
                        catchError(() => of({ ...event, upcomingEvents: [] }))
                    );
                }

                // Wrong /events/ link (e.g. course slug) — send to universal /:slug route.
                return this.publicAppService.getCourseBasicByCanonicalURL(eventUrl).pipe(
                    map((course) => (course ? this.router.createUrlTree(['/', eventUrl]) : this.notFoundTree())),
                    catchError(() => of(this.notFoundTree()))
                );
            }),
            catchError(() => of(this.notFoundTree()))
        );
    }

    private notFoundTree(): UrlTree {
        return this.router.createUrlTree(['/page-not-found']);
    }
}
