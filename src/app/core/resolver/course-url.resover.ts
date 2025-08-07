import { Injectable } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    Resolve,
    Router,
    RouterStateSnapshot
} from '@angular/router';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';

@Injectable({ providedIn: 'root' })
export class CourseUrlResoverService implements Resolve<any> {
    private readonly notFoundRoute = ['page-not-found'];

    constructor(
        private adminService: AdminAppService,
        private router: Router
    ) {}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        const courseUrl = route.params.url;
        
        if (!courseUrl) {
            this.redirectToNotFound();
            return of(null);
        }

        return this.adminService.getBlogByCanonicalURL(courseUrl).pipe(
            catchError(error => {
                console.error('Error resolving course:', error);
                this.redirectToNotFound();
                return of(null);
            })
        );
    }

    private redirectToNotFound(): void {
        this.router.navigate(this.notFoundRoute);
    }
}