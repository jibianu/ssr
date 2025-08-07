import { PublicAppService } from '../../modules/publicapp/publicapp.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { 
    catchError, 
    map, 
    tap 
} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CourseLocationGuard  {
    private readonly notFoundRoute = ['error/page-not-found'];

    constructor(
        private publicAppService: PublicAppService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.validateCourseLocation(route.params.url, route.params.location);
    }

    private validateCourseLocation(url: string, location: string): Observable<boolean> {
        return this.publicAppService.getCourseByCanonicalLocationURL(url, location).pipe(
            map(course => !!course),
            tap(hasAccess => {
                if (!hasAccess) {
                    this.redirectToNotFound();
                }
            }),
            catchError(() => {
                this.redirectToNotFound();
                return of(false);
            })
        );
    }

    private redirectToNotFound(): void {
        this.router.navigate(this.notFoundRoute);
    }
}