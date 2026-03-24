import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SlugResolverService } from './slug-resolver.service';
import { PublicAppService } from '../publicapp.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { BlogService } from '../blog/blog.service';

/** Prefetched data for /:slug (course | blog | event) — runs before route activation so SSR includes content. */
export interface SlugPageData {
  slug: string;
  type: 'course' | 'blog' | 'event' | null;
  course?: unknown;
  eventData?: unknown;
  blog?: unknown;
  notFound?: boolean;
}

export const slugPageResolver: ResolveFn<SlugPageData> = (route): Observable<SlugPageData> => {
  const slug = route.parent?.paramMap.get('slug') ?? route.paramMap.get('slug') ?? '';
  const slugSvc = inject(SlugResolverService);
  const publicApp = inject(PublicAppService);
  const admin = inject(AdminAppService);
  const blogSvc = inject(BlogService);

  if (!slug.trim()) {
    return of({ slug: '', type: null, notFound: true });
  }

  // Resolve slug type first; only call GET page/course/course/{slug} for courses (or when metadata is unavailable).
  // Parallel course + meta caused a guaranteed 404 + noisy logs for every blog/event slug.
  return slugSvc.resolve(slug).pipe(
    catchError(() => of(null)),
    switchMap((meta) => {
      if (meta?.type === 'blog') {
        const blogSlug = (meta.slug || slug).trim();
        return blogSvc.getBlogBySlug(blogSlug).pipe(
          map((b) =>
            b ? { slug, type: 'blog' as const, blog: b } : { slug, type: null, notFound: true }
          ),
          catchError(() => of({ slug, type: null, notFound: true }))
        );
      }
      if (meta?.type === 'event') {
        const eventSlug = (meta.slug || slug).trim();
        return admin.getEventByCanonicalURL(eventSlug).pipe(
          switchMap((event: { id?: string } | null) => {
            if (!event?.id) {
              return of({ slug: eventSlug, type: null, notFound: true });
            }
            return publicApp.getUpcomingEvents(event.id).pipe(
              map((upcoming: unknown[]) => ({
                slug: eventSlug,
                type: 'event' as const,
                eventData: { ...event, upcomingEvents: upcoming || [] }
              })),
              catchError(() =>
                of({
                  slug: eventSlug,
                  type: 'event' as const,
                  eventData: { ...event, upcomingEvents: [] }
                })
              )
            );
          }),
          catchError(() => of({ slug: eventSlug, type: null, notFound: true }))
        );
      }

      const courseSlugToFetch =
        meta?.type === 'course' && meta.slug?.trim() && meta.slug.trim() !== slug.trim()
          ? meta.slug.trim()
          : slug.trim();

      return publicApp.getCourseByCanonicalURL(courseSlugToFetch, { refresh: false }).pipe(
        map((course) =>
          course
            ? { slug, type: 'course' as const, course }
            : { slug, type: null, notFound: true }
        ),
        catchError(() => of({ slug, type: null, notFound: true }))
      );
    })
  );
};
