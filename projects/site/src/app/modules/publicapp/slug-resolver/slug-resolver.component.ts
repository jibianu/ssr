import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { takeUntil, switchMap, catchError, map, distinctUntilChanged, tap } from 'rxjs/operators';
import { SlugResolverService, SlugResolverResponse } from './slug-resolver.service';
import { SlugPageData } from './slug-page.resolver';
import { PublicAppService } from '../publicapp.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { BlogService } from '../blog/blog.service';
import { PublicCourseModule } from '../public-course/public-course.module';
import { BlogDetailComponent } from '../blog/blog-detail/blog-detail.component';
import { PublicEventModule } from '../public-event/public-event.module';
import { appShellRedirectForSlug, isAppShellSlug } from 'src/app/core/helpers/app-shell-paths';
import { resolveSlugByParallelLookup } from './slug-fallback.util';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';

@Component({
  selector: 'app-slug-resolver',
  templateUrl: './slug-resolver.component.html',
  styleUrls: ['./slug-resolver.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, PublicCourseModule, BlogDetailComponent, PublicEventModule]
})
export class SlugResolverComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private slugResolver = inject(SlugResolverService);
  private publicAppService = inject(PublicAppService);
  private adminService = inject(AdminAppService);
  private blogService = inject(BlogService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  /** Avoid SSR navigating to /page-not-found when API is unreachable from Node — client will retry. */
  private navigateToNotFound(): void {
    if (isPlatformBrowser(this.platformId)) {
      void this.router.navigate(['/page-not-found'], { replaceUrl: true });
    }
  }

  resolved = signal<SlugResolverResponse | null>(null);
  loading = signal(true);
  notFound = signal(false);
  type = signal<'course' | 'blog' | 'event' | null>(null);
  slug = signal('');
  course = signal<any>(null);
  eventData = signal<any>(null);
  /** SSR: blog HTML from slugPageResolver — passed to BlogDetail to avoid duplicate GET. */
  blogPrefetch = signal<unknown | null>(null);

  ngOnInit(): void {
    const slugRoute = this.route.parent ?? this.route;
    const slugParam$ = slugRoute.paramMap.pipe(
      map((p) => p.get('slug') || ''),
      distinctUntilChanged()
    );

    combineLatest([slugParam$, this.route.data]).pipe(
      takeUntil(this.destroy$),
      switchMap(([rawSlug, data]) => this.loadSlugContent(rawSlug, data['slugPage'] as SlugPageData | undefined))
    ).subscribe((result) => {
      if (result === null) {
        this.loading.set(false);
        if (this.notFound()) {
          this.navigateToNotFound();
        }
      } else if (this.type() === 'course' && result && typeof result === 'object') {
        this.course.set(result);
        this.loading.set(false);
      } else {
        this.loading.set(false);
      }
      this.cdr.markForCheck();
    });
  }

  /** Re-run when /:slug changes (e.g. related course card) — same component instance is reused by the router. */
  private loadSlugContent(rawSlug: string, slugPage?: SlugPageData): Observable<unknown> {
    const slug = this.publicAppService.normalizeSlugRouteParam(rawSlug) || rawSlug.trim();
    if (!slug) {
      this.notFound.set(true);
      return of(null);
    }

    const canon = this.publicAppService.normalizeSlugRouteParam(rawSlug);
    if (
      canon &&
      rawSlug &&
      canon !== rawSlug.replace(/^\/+/, '') &&
      isPlatformBrowser(this.platformId)
    ) {
      void this.router.navigate(['/', canon], { replaceUrl: true, queryParamsHandling: 'preserve' });
      return of(null);
    }

    if (isAppShellSlug(slug) && isPlatformBrowser(this.platformId)) {
      const target = appShellRedirectForSlug(slug);
      if (target) {
        window.location.replace(target);
        return of(null);
      }
    }

    this.resetForSlug(slug);

    if (slugPage?.notFound && this.slugPageMatches(slugPage, slug)) {
      // SSR may fail to reach the API on hosted servers — retry live lookup in the browser.
      if (!isPlatformBrowser(this.platformId)) {
        this.notFound.set(true);
        return of(null);
      }
    } else if (slugPage?.type && !slugPage.notFound && this.slugPageMatches(slugPage, slug)) {
      this.applySlugPageData(slugPage);
      if (slugPage.type === 'course') {
        return of(slugPage.course ?? true);
      }
      return of(true);
    }

    return this.slugResolver.resolve(slug).pipe(
      switchMap((res) => this.resolveSlugMeta(res)),
      tap((result) => {
        if (result === null && this.notFound()) {
          return;
        }
        if (this.isBrowser && this.type() === 'course') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      })
    );
  }

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private resetForSlug(slug: string): void {
    this.slug.set(slug);
    this.loading.set(true);
    this.notFound.set(false);
    this.resolved.set(null);
    this.course.set(null);
    this.eventData.set(null);
    this.blogPrefetch.set(null);
    this.type.set(null);
  }

  private slugPageMatches(slugPage: SlugPageData, slug: string): boolean {
    const expected = this.normalizeSlugKey(slugPage.slug || slug);
    const actual = this.normalizeSlugKey(slug);
    return expected.length > 0 && expected === actual;
  }

  private normalizeSlugKey(value: string): string {
    return (
      this.publicAppService.normalizePublicCourseSlug(value) ||
      this.publicAppService.normalizeSlugRouteParam(value) ||
      value.trim()
    ).toLowerCase();
  }

  private resolveSlugMeta(res: SlugResolverResponse | null): Observable<unknown> {
    if (res === undefined) {
      return of(null);
    }
    if (res === null) {
      const fallbackSlug = this.slug();
      if (!fallbackSlug) {
        this.notFound.set(true);
        return of(null);
      }
      return resolveSlugByParallelLookup(
        fallbackSlug,
        this.blogService,
        this.adminService,
        this.publicAppService
      ).pipe(
        switchMap((match) => {
          if (!match) {
            this.notFound.set(true);
            return of(null);
          }
          if (match.type === 'blog') {
            this.type.set('blog');
            this.resolved.set({ type: 'blog', slug: fallbackSlug });
            this.blogPrefetch.set(match.blog);
            return of(true);
          }
          if (match.type === 'event') {
            this.type.set('event');
            this.resolved.set({ type: 'event', slug: fallbackSlug });
            this.eventData.set({
              ...(match.event as object),
              upcomingEvents: match.upcomingEvents
            });
            return of(true);
          }
          this.type.set('course');
          this.resolved.set({ type: 'course', slug: fallbackSlug });
          this.course.set(match.course);
          return of(match.course);
        }),
        catchError(() => {
          this.notFound.set(true);
          return of(null);
        })
      );
    }

    this.resolved.set(res);
    this.type.set(res.type);

    if (res.type === 'course') {
      return this.publicAppService.getCourseBasicByCanonicalURL(res.slug).pipe(
        switchMap((basic) =>
          basic ? of(basic) : this.publicAppService.getCourseByCanonicalURL(res.slug, { refresh: false })
        ),
        catchError(() => {
          this.notFound.set(true);
          return of(null);
        })
      );
    }

    if (res.type === 'event') {
      const eventSlug = normalizeEventCanonicalSlug(res.slug || this.slug());
      return this.adminService.getEventByCanonicalURL(eventSlug).pipe(
        switchMap((event: { id?: string } | null) => {
          if (!event?.id) {
            this.notFound.set(true);
            return of(null);
          }
          return this.publicAppService.getUpcomingEvents(event.id).pipe(
            catchError(() => of([])),
            switchMap((upcoming: unknown[]) => {
              this.eventData.set({ ...event, upcomingEvents: upcoming || [] });
              return of(true);
            })
          );
        }),
        catchError(() => {
          this.notFound.set(true);
          return of(null);
        })
      );
    }

    if (res.type === 'blog') {
      return this.blogService.getBlogBySlug(res.slug).pipe(
        switchMap((blog) => {
          if (!blog) {
            this.notFound.set(true);
            return of(null);
          }
          this.blogPrefetch.set(blog);
          return of(true);
        }),
        catchError(() => {
          this.notFound.set(true);
          return of(null);
        })
      );
    }

    return of(true);
  }

  private applySlugPageData(pre: SlugPageData): void {
    this.slug.set(pre.slug);
    this.type.set(pre.type);
    this.loading.set(false);
    this.notFound.set(false);
    if (pre.type) {
      this.resolved.set({ type: pre.type, slug: pre.slug });
    }
    this.course.set(null);
    this.eventData.set(null);
    this.blogPrefetch.set(null);
    if (pre.type === 'course' && pre.course) {
      this.course.set(pre.course);
    }
    if (pre.type === 'event' && pre.eventData) {
      this.eventData.set(pre.eventData);
    }
    if (pre.type === 'blog' && pre.blog) {
      this.blogPrefetch.set(pre.blog);
    }
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
