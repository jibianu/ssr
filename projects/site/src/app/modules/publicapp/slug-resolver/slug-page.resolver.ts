import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { SlugResolverService } from './slug-resolver.service';
import { PublicAppService } from '../publicapp.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { BlogService } from '../blog/blog.service';
import { isAppShellSlug } from 'src/app/core/helpers/app-shell-paths';
import { resolveSlugByParallelLookup } from './slug-fallback.util';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';

/** Prefetched data for /:slug (course | blog | event) — runs before route activation so SSR includes content. */
export interface SlugPageData {
  slug: string;
  type: 'course' | 'blog' | 'event' | null;
  course?: unknown;
  eventData?: unknown;
  blog?: unknown;
  notFound?: boolean;
  /** Retired slug alias: issue one direct 301 to this canonical slug instead of rendering. */
  redirectTo?: string;
}

export const slugPageResolver: ResolveFn<SlugPageData> = (route): Observable<SlugPageData> => {
  const rawParam = route.parent?.paramMap.get('slug') ?? route.paramMap.get('slug') ?? '';
  const publicApp = inject(PublicAppService);
  const slug = publicApp.normalizeSlugRouteParam(rawParam) || rawParam.trim();
  const slugSvc = inject(SlugResolverService);
  const admin = inject(AdminAppService);
  const blogSvc = inject(BlogService);

  if (!slug.trim()) {
    return of({ slug: '', type: null, notFound: true });
  }

  if (isAppShellSlug(slug)) {
    return of({ slug, type: null, notFound: true });
  }

  // Resolve slug type first; only call GET page/course/course/{slug} for courses (or when metadata is unavailable).
  // Parallel course + meta caused a guaranteed 404 + noisy logs for every blog/event slug.
  return slugSvc.resolve(slug).pipe(
    catchError(() => of(null)),
    switchMap((meta) => {
      // Slug alias (renamed course): don't render content at the old URL —
      // signal the component to answer one direct 301 to the canonical slug.
      if (
        meta?.redirectedFrom &&
        meta.slug?.trim() &&
        meta.slug.trim().toLowerCase() !== slug.trim().toLowerCase()
      ) {
        return of({ slug, type: 'course' as const, redirectTo: meta.slug.trim() });
      }
      // Fallback: slug-resolver table may miss older slugs — probe blog/event/course in parallel.
      if (!meta) {
        return resolveSlugByParallelLookup(slug, blogSvc, admin, publicApp).pipe(
          map((match) => {
            if (!match) {
              return { slug, type: null, notFound: true };
            }
            if (match.type === 'blog') {
              return { slug, type: 'blog' as const, blog: match.blog };
            }
            if (match.type === 'event') {
              return {
                slug,
                type: 'event' as const,
                eventData: { ...(match.event as object), upcomingEvents: match.upcomingEvents }
              };
            }
            return { slug, type: 'course' as const, course: match.course };
          }),
          catchError(() => of({ slug, type: null, notFound: true }))
        );
      }
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
        const eventSlug = normalizeEventCanonicalSlug(meta.slug || slug);
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

      const rawCourseSlug =
        meta?.type === 'course' && meta.slug?.trim() && meta.slug.trim() !== slug.trim()
          ? meta.slug.trim()
          : slug.trim();
      const courseSlugToFetch =
        publicApp.normalizePublicCourseSlug(rawCourseSlug) ||
        publicApp.normalizeSlugRouteParam(rawCourseSlug) ||
        rawCourseSlug;

      // SSR: GET /basic then one full GET if needed (no duplicate /basic→full inside PublicAppService).
      return publicApp.getCourseBasicByCanonicalURL(courseSlugToFetch).pipe(
        switchMap((basic) => {
          if (basic) {
            return of(basic);
          }
          return publicApp.getCourseByCanonicalURL(courseSlugToFetch, { refresh: false });
        }),
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
