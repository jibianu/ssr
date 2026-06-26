import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { BlogService } from '../blog/blog.service';
import { PublicAppService } from '../publicapp.service';

export type SlugFallbackMatch =
  | { type: 'blog'; blog: unknown }
  | { type: 'event'; event: unknown; upcomingEvents: unknown[] }
  | { type: 'course'; course: unknown }
  | null;

/**
 * When slug-resolver metadata is missing, probe blog / event / course in parallel
 * instead of blog → event → course (avoids slow event 404s blocking course pages).
 */
export function resolveSlugByParallelLookup(
  slug: string,
  blogSvc: BlogService,
  admin: AdminAppService,
  publicApp: PublicAppService
): Observable<SlugFallbackMatch> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return of(null);
  }

  return forkJoin({
    blog: blogSvc.getBlogBySlug(trimmed).pipe(catchError(() => of(null))),
    event: admin.getEventByCanonicalURL(trimmed).pipe(catchError(() => of(null))),
    courseBasic: publicApp.getCourseBasicByCanonicalURL(trimmed).pipe(catchError(() => of(null)))
  }).pipe(
    switchMap(({ blog, event, courseBasic }) => {
      if (blog) {
        return of({ type: 'blog' as const, blog });
      }
      if (event?.id) {
        return publicApp.getUpcomingEvents(event.id).pipe(
          map((upcoming) => ({
            type: 'event' as const,
            event,
            upcomingEvents: upcoming || []
          })),
          catchError(() =>
            of({
              type: 'event' as const,
              event,
              upcomingEvents: [] as unknown[]
            })
          )
        );
      }
      if (courseBasic) {
        return of({ type: 'course' as const, course: courseBasic });
      }
      return publicApp.getCourseByCanonicalURL(trimmed, { refresh: false }).pipe(
        map((course) => (course ? { type: 'course' as const, course } : null)),
        catchError(() => of(null))
      );
    })
  );
}
