import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../publicapp.service';
import { CourseHeaderContextService } from '../../../core/services/course-header-context.service';
import { environment } from '../../../../environments/environment';

const UUID_LIKE_REGEX = /^[0-9a-fA-F]{8,9}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function looksLikeCourseId(param: string | null): boolean {
  if (!param || typeof param !== 'string') return false;
  const t = param.trim();
  if (/^\d+$/.test(t)) return true;
  if (UUID_LIKE_REGEX.test(t)) return true;
  return false;
}

/**
 * Resolves course for route :courseSlug.
 * When param looks like a course ID (number or GUID), fetches by ID; otherwise by slug.
 */
@Injectable({ providedIn: 'root' })
export class CourseBySlugOrIdResolver implements Resolve<any> {
  constructor(
    private publicAppService: PublicAppService,
    private router: Router,
    private headerContext: CourseHeaderContextService
  ) {}

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<any> {
    const param = (route.paramMap.get('courseSlug') ?? route.params['courseSlug'] ?? '').toString().trim();
    if (!param) {
      this.router.navigate(['/page-not-found'], { replaceUrl: true });
      return of(null);
    }
    const byId = looksLikeCourseId(param);
    if (!byId) this.headerContext.clear();
    const request$ = byId
      ? this.publicAppService.getCourseById(param)
      : this.publicAppService.getCourseByCanonicalURL(param, { refresh: false });
    const elearnBase = (environment as { elearnAppUrl?: string }).elearnAppUrl?.replace(/\/$/, '') || '';
    return request$.pipe(
      map((course) => course ?? null),
      tap((course) => {
        if (byId && course) {
          const categoryName = course.categoryName ?? course.CategoryName
            ?? (course.category && (course.category.name ?? course.category.Name)) ?? '';
          const courseTitle = (course.title ?? course.Title ?? '').toString().trim();
          this.headerContext.set({
            breadcrumb: [
              { label: 'Explore', link: elearnBase ? `${elearnBase}/app/student/categories` : undefined },
              ...(categoryName ? [{ label: categoryName, link: elearnBase ? `${elearnBase}/app/student/categories` : undefined }] : [])
            ],
            courseTitle
          });
        }
      }),
      catchError(() => {
        this.router.navigate(['/page-not-found'], { replaceUrl: true });
        return of(null);
      })
    );
  }
}
