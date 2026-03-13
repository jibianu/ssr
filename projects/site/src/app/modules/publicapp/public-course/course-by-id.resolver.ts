import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PublicAppService } from '../publicapp.service';

/**
 * Resolves course by ID for route elearn/course/:id.
 * Returns course object or null (component redirects to 404).
 */
@Injectable({ providedIn: 'root' })
export class CourseByIdResolver implements Resolve<any> {
  constructor(
    private publicAppService: PublicAppService,
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<any> {
    const id = route.paramMap.get('id') ?? route.params['id'];
    if (!id || typeof id !== 'string' || !id.trim()) {
      this.router.navigate(['/page-not-found'], { replaceUrl: true });
      return of(null);
    }
    return this.publicAppService.getCourseById(id.trim()).pipe(
      map((course) => course ?? null),
      catchError(() => {
        this.router.navigate(['/page-not-found'], { replaceUrl: true });
        return of(null);
      })
    );
  }
}
