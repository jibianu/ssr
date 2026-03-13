import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PublicAppService } from '../publicapp.service';

/**
 * Resolves course by slug for route :courseSlug.
 * Returns course object or null (component redirects to 404).
 */
@Injectable({ providedIn: 'root' })
export class CourseBySlugResolver implements Resolve<any> {
  constructor(
    private publicAppService: PublicAppService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<any> {
    const slug = route.paramMap.get('courseSlug') || route.params['courseSlug'];
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      this.router.navigate(['/page-not-found'], { replaceUrl: true });
      return of(null);
    }
    return this.publicAppService.getCourseByCanonicalURL(slug.trim(), { refresh: false }).pipe(
      map((course) => course ?? null),
      catchError(() => {
        this.router.navigate(['/page-not-found'], { replaceUrl: true });
        return of(null);
      })
    );
  }
}
