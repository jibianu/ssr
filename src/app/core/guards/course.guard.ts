import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { Injectable } from '@angular/core';
import { 
    ActivatedRouteSnapshot, 
    CanActivate, 
    Router, 
    RouterStateSnapshot 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { 
    switchMap, 
    catchError, 
    map 
} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CourseGuard implements CanActivate {
    private readonly notFoundRoute = ['page-not-found'];

    constructor(
        private adminAppService: AdminAppService,
        private router: Router
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.checkCourseAccess(route);
    }

    private checkCourseAccess(route: ActivatedRouteSnapshot): Observable<boolean> {
        return this.adminAppService.getBlogByCanonicalURL(route.params.url).pipe(
            map(post => {
                if (!post) {
                    this.redirectToNotFound();
                }
                return !!post;
            }),
            catchError((err: unknown) => {
                this.redirectToNotFound();
                return of(false);
            })
        );
    }

    private redirectToNotFound(): void {
        this.router.navigate(this.notFoundRoute);
    }
}
