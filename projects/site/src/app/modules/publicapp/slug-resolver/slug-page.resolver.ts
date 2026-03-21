import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SlugResolverService, SlugResolverResponse } from './slug-resolver.service';
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

  return slugSvc.resolve(slug).pipe(
    switchMap((meta: SlugResolverResponse | null) => {
      if (!meta) {
        return of({ slug, type: null, notFound: true });
      }
      if (meta.type === 'course') {
        return publicApp.getCourseByCanonicalURL(meta.slug, { refresh: false }).pipe(
          map((course) => {
            if (!course) {
              return { slug, type: null, notFound: true };
            }
            return { slug, type: 'course' as const, course };
          }),
          catchError(() => of({ slug, type: null, notFound: true }))
        );
      }
      if (meta.type === 'event') {
        return admin.getEventByCanonicalURL(meta.slug).pipe(
          switchMap((event: { id?: string } | null) => {
            if (!event?.id) {
              return of({ slug, type: null, notFound: true });
            }
            return publicApp.getUpcomingEvents(event.id).pipe(
              map((upcoming: unknown[]) => ({
                slug,
                type: 'event' as const,
                eventData: { ...event, upcomingEvents: upcoming || [] }
              })),
              catchError(() =>
                of({
                  slug,
                  type: 'event' as const,
                  eventData: { ...event, upcomingEvents: [] }
                })
              )
            );
          }),
          catchError(() => of({ slug, type: null, notFound: true }))
        );
      }
      if (meta.type === 'blog') {
        return blogSvc.getBlogBySlug(slug).pipe(
          map((b) =>
            b ? { slug, type: 'blog' as const, blog: b } : { slug, type: null, notFound: true }
          ),
          catchError(() => of({ slug, type: null, notFound: true }))
        );
      }
      return of({ slug, type: null, notFound: true });
    })
  );
};
