import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, switchMap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { SlugResolverService, SlugResolverResponse } from './slug-resolver.service';
import { SlugPageData } from './slug-page.resolver';
import { PublicAppService } from '../publicapp.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { BlogService } from '../blog/blog.service';
import { PublicCourseModule } from '../public-course/public-course.module';
import { BlogDetailComponent } from '../blog/blog-detail/blog-detail.component';
import { PublicEventModule } from '../public-event/public-event.module';
import { appShellRedirectForSlug, isAppShellSlug } from 'src/app/core/helpers/app-shell-paths';

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
    const pre = this.route.snapshot.data['slugPage'] as SlugPageData | undefined;
    if (pre?.notFound) {
      this.notFound.set(true);
      this.loading.set(false);
      this.navigateToNotFound();
      return;
    }
    if (pre && pre.type && !pre.notFound) {
      this.applySlugPageData(pre);
      return;
    }

    const rawParam0 =
      this.route.parent?.snapshot.paramMap.get('slug') ?? this.route.snapshot.paramMap.get('slug') ?? '';
    const canon0 = this.publicAppService.normalizeSlugRouteParam(rawParam0);
    if (
      canon0 &&
      rawParam0 &&
      canon0 !== rawParam0.replace(/^\/+/, '') &&
      isPlatformBrowser(this.platformId)
    ) {
      void this.router.navigate(['/', canon0], { replaceUrl: true, queryParamsHandling: 'preserve' });
      return;
    }

    const slugParam$ = this.route.parent
      ? this.route.parent.paramMap.pipe(map((p) => ({ slug: p.get('slug') || '' })))
      : this.route.paramMap.pipe(map((p) => ({ slug: p.get('slug') || '' })));

    slugParam$.pipe(
      takeUntil(this.destroy$),
      switchMap((params) => {
        const raw = params.slug || '';
        const slug = this.publicAppService.normalizeSlugRouteParam(raw) || raw.trim();
        if (!slug) {
          this.notFound.set(true);
          this.loading.set(false);
          return of(null);
        }
        if (isAppShellSlug(slug) && isPlatformBrowser(this.platformId)) {
          const target = appShellRedirectForSlug(slug);
          if (target) {
            window.location.replace(target);
            return of(null);
          }
        }
        this.slug.set(slug);
        this.loading.set(true);
        this.notFound.set(false);
        this.resolved.set(null);
        this.course.set(null);
        this.eventData.set(null);
        this.blogPrefetch.set(null);
        this.type.set(null);
        return this.slugResolver.resolve(slug);
      }),
      switchMap(res => {
        if (res === undefined) return of(null);
        if (res === null) {
          // Fallback: slug resolver table may miss some older blog/event/course slugs.
          const fallbackSlug = this.slug();
          if (!fallbackSlug) {
            this.notFound.set(true);
            this.loading.set(false);
            return of(null);
          }
          return this.blogService.getBlogBySlug(fallbackSlug).pipe(
            switchMap((blog) => {
              if (blog) {
                this.type.set('blog');
                this.resolved.set({ type: 'blog', slug: fallbackSlug });
                this.blogPrefetch.set(blog);
                return of(true);
              }
              return this.adminService.getEventByCanonicalURL(fallbackSlug).pipe(
                switchMap((event: any) => {
                  if (event?.id) {
                    this.type.set('event');
                    this.resolved.set({ type: 'event', slug: fallbackSlug });
                    return this.publicAppService.getUpcomingEvents(event.id).pipe(
                      catchError(() => of([])),
                      switchMap((upcoming: any[]) => {
                        this.eventData.set({ ...event, upcomingEvents: upcoming || [] });
                        return of(true);
                      })
                    );
                  }
                  this.type.set('course');
                  this.resolved.set({ type: 'course', slug: fallbackSlug });
                  return this.publicAppService.getCourseBasicByCanonicalURL(fallbackSlug).pipe(
                    switchMap((basic) =>
                      basic ? of(basic) : this.publicAppService.getCourseByCanonicalURL(fallbackSlug, { refresh: false })
                    )
                  );
                }),
                catchError(() => {
                  this.type.set('course');
                  this.resolved.set({ type: 'course', slug: fallbackSlug });
                  return this.publicAppService.getCourseBasicByCanonicalURL(fallbackSlug).pipe(
                    switchMap((basic) =>
                      basic ? of(basic) : this.publicAppService.getCourseByCanonicalURL(fallbackSlug, { refresh: false })
                    )
                  );
                })
              );
            }),
            catchError(() => {
              this.type.set('course');
              this.resolved.set({ type: 'course', slug: fallbackSlug });
              return this.publicAppService.getCourseBasicByCanonicalURL(fallbackSlug).pipe(
                switchMap((basic) =>
                  basic ? of(basic) : this.publicAppService.getCourseByCanonicalURL(fallbackSlug, { refresh: false })
                ),
                catchError(() => {
                  this.notFound.set(true);
                  this.loading.set(false);
                  return of(null);
                })
              );
            })
          );
        }
        this.resolved.set(res);
        this.type.set(res.type);
        if (res.type === 'course') {
          return this.publicAppService.getCourseBasicByCanonicalURL(res.slug).pipe(
            switchMap((basic) => basic ? of(basic) : this.publicAppService.getCourseByCanonicalURL(res.slug, { refresh: false })),
            catchError(() => {
              this.notFound.set(true);
              return of(null);
            })
          );
        }
        if (res.type === 'event') {
          return this.adminService.getEventByCanonicalURL(res.slug).pipe(
            switchMap((event: any) => {
              if (!event?.id) {
                this.notFound.set(true);
                return of(null);
              }
              return this.publicAppService.getUpcomingEvents(event.id).pipe(
                catchError(() => of([])),
                switchMap((upcoming: any[]) => {
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
        this.loading.set(false);
        return of(true);
      })
    ).subscribe(result => {
      if (result === null) {
        this.loading.set(false);
        if (this.notFound()) this.navigateToNotFound();
        this.cdr.markForCheck();
        return;
      }
      if (this.type() === 'course' && result && typeof result === 'object') {
        this.course.set(result);
      }
      this.loading.set(false);
      this.cdr.markForCheck();
    });
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
