import { AdminAppService } from '../../modules/adminapp/adminapp.service';
import { PublicAppService } from '../../modules/publicapp/publicapp.service';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

/** Slug-like: letters, numbers, hyphens, optional parentheses e.g. asnt-level-iii-(rt) */
const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*(\([a-z0-9]+\))?$/i;

@Injectable({ providedIn: 'root' })
export class CourseGuard {
    constructor(
        private adminAppService: AdminAppService,
        private publicAppService: PublicAppService,
        private router: Router
    ) {}

    canActivate(next: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<boolean> {
        let url = next.params?.url;
        if (!url) {
            this.router.navigate(['/']);
            return of(false);
        }
        try {
            url = decodeURIComponent(url);
        } catch {
            // keep as-is
        }
        const isSlugLike = SLUG_REGEX.test(url);
        if (isSlugLike) {
            return this.publicAppService.getCourseBySlug(url).pipe(
                switchMap(course => {
                    if (course) return of(true);
                    this.router.navigate(['/']);
                    return of(false);
                }),
                catchError(() => {
                    this.router.navigate(['/']);
                    return of(false);
                })
            );
        }
        return this.adminAppService.getBlogByCanonicalURL(url).pipe(
            switchMap(post => {
                if (post) return of(true);
                this.router.navigate(['/']);
                return of(false);
            }),
            catchError(() => {
                this.router.navigate(['/']);
                return of(false);
            })
        );
    }
}
