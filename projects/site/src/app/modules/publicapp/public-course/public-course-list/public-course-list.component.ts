import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { combineLatest } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';

interface CourseListFeature {
  id?: string;
  description?: string;
  iconUrl?: string;
}

interface CourseListItem {
  id?: string;
  title?: string;
  titleImageUrl?: string;
  shortDescription?: string;
  courseDuration?: string;
  categoryName?: string;
  amount?: number;
  canonicalUrl: string;
  courseFeatures: CourseListFeature[];
  badge?: string;
}

/** Slug aliases for API (same as Elearn / public-category), e.g. bgas -> oil-and-gas */
const SLUG_ALIASES: Record<string, string[]> = { bgas: ['oil-gas', 'oil-and-gas'] };

@Component({
  selector: 'app-public-course-list',
  templateUrl: './public-course-list.component.html',
  styleUrls: ['./public-course-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  readonly itemsPerPage = 15;

  // ✅ Same as Elearn: api/public/courses (optional categorySlug) + api/public/categories for filter
  coursesData$: Observable<{
    courses: CourseListItem[];
    totalItems: number;
    currentPage: number;
    categorySlug: string;
    categoryName: string;
    categories: { id: string; name: string; slug: string }[];
    config: { currentPage: number; itemsPerPage: number; totalItems: number };
  }>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {
    const categories$ = this.publicAppService.getCategories().pipe(
      catchError(() => of([]))
    );
    this.coursesData$ = combineLatest([this.route.queryParams, categories$]).pipe(
      switchMap(([params, categories]) => {
        const currentPage = +params['page'] || 1;
        const rawCategory = (params['category'] ?? '').toString().trim();
        const categorySlug = this.slugForApi(rawCategory, categories);
        const categoryName = rawCategory
          ? (this.resolveCategoryDisplayName(rawCategory, categories) || this.formatCategoryTitle(rawCategory))
          : '';

        return this.publicAppService.getPublicCoursesByCategory(categorySlug, currentPage, this.itemsPerPage).pipe(
          map(response => {
            const courses: CourseListItem[] = (response?.results ?? []).map((c: any) => this.mapCourse(c));
            const totalItems = response?.totalNumberOfRecords ?? 0;
            const catList = (categories || []).map((c: any) => ({
              id: c?.id ?? c?.Id,
              name: c?.name ?? c?.Name ?? '',
              slug: c?.slug ?? c?.Slug ?? this.normalizeCategorySlug(c?.name ?? c?.Name ?? '')
            })).filter((c: { slug: string }) => c.slug);
            return {
              courses,
              totalItems,
              currentPage,
              categorySlug: rawCategory ? categorySlug : '',
              categoryName,
              categories: catList,
              config: { currentPage, itemsPerPage: this.itemsPerPage, totalItems }
            };
          }),
          catchError(error => {
            console.error('[PublicCourseListComponent] Error loading courses:', error);
            this.cdr.markForCheck();
            return of({
              courses: [],
              totalItems: 0,
              currentPage,
              categorySlug: '',
              categoryName: '',
              categories: (categories || []).map((c: any) => ({
                id: c?.id ?? c?.Id,
                name: c?.name ?? c?.Name ?? '',
                slug: c?.slug ?? c?.Slug ?? this.normalizeCategorySlug(c?.name ?? c?.Name ?? '')
              })).filter((c: { slug: string }) => c.slug),
              config: { currentPage: 1, itemsPerPage: this.itemsPerPage, totalItems: 0 }
            });
          })
        );
      }),
      shareReplay(1)
    );
  }

  /** Slug to send to API (with alias resolution, same as public-category). */
  private slugForApi(paramSlug: string, categories: any[]): string {
    const normalized = this.normalizeCategorySlug(paramSlug);
    if (!normalized) return '';
    const match = (categories || []).find((c: any) => {
      const s = this.normalizeCategorySlug(c?.name ?? c?.slug ?? c?.Slug ?? '');
      return s === normalized;
    });
    if (match) return this.normalizeCategorySlug(match?.name ?? match?.slug ?? match?.Slug ?? '');
    if (SLUG_ALIASES[normalized]) {
      const alt = (categories || []).find((c: any) => {
        const s = this.normalizeCategorySlug(c?.name ?? c?.slug ?? c?.Slug ?? '');
        return SLUG_ALIASES[normalized].some(a => a === s);
      });
      if (alt) return this.normalizeCategorySlug(alt?.name ?? alt?.slug ?? alt?.Slug ?? '');
    }
    return normalized;
  }

  private resolveCategoryDisplayName(raw: string, categories: any[]): string {
    const normalized = this.normalizeCategorySlug(raw);
    if (!normalized) return '';
    let match = (categories || []).find((c: any) =>
      this.normalizeCategorySlug(c?.name ?? c?.slug ?? c?.Slug ?? '') === normalized
    );
    if (!match && SLUG_ALIASES[normalized]) {
      match = (categories || []).find((c: any) => {
        const s = this.normalizeCategorySlug(c?.name ?? c?.slug ?? c?.Slug ?? '');
        return SLUG_ALIASES[normalized].some(a => a === s);
      });
    }
    return match ? (match?.name ?? match?.Name ?? '') : '';
  }

  private normalizeCategorySlug(v: string): string {
    if (!v) return '';
    return String(v).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  private formatCategoryTitle(v: string): string {
    if (!v) return '';
    return this.normalizeCategorySlug(v).split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  ngOnInit(): void {
    // ✅ SSR OPTIMIZATION: No blocking operations
    // Observable is already set up in constructor - template uses async pipe
  }

  private normalizeCourseUrl(url: string | null | undefined): string {
    if (!url) return '';
    let normalized = String(url).replace(/^\/+/, '').replace(/^courses\//, '');
    if (normalized.startsWith('course/course/')) normalized = normalized.replace(/^course\/course\//, '');
    else if (normalized.startsWith('course/')) normalized = normalized.replace(/^course\//, '');
    return normalized ? '/' + normalized : '';
  }

  // PERFORMANCE: Add trackBy for ngFor optimization
  trackByCourseId(index: number, course: CourseListItem): string {
    return course?.id != null ? String(course.id) : String(index);
  }

  trackByFeatureId(index: number, feature: CourseListFeature): string {
    return feature?.id != null ? String(feature.id) : String(index);
  }

  pageChange(newPage: number, totalItems?: number): void {
    const clampedPage = this.clampPage(newPage, totalItems);
    const currentPage = +this.route.snapshot.queryParamMap.get('page') || 1;
    const category = this.route.snapshot.queryParamMap.get('category') ?? '';

    if (clampedPage === currentPage) {
      return;
    }

    const queryParams: any = { page: clampedPage };
    if (category) queryParams.category = category;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: ''
    });

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /** Navigate to list with optional category (same as Elearn filter). */
  setCategory(slug: string): void {
    const queryParams: any = { page: 1 };
    if (slug) queryParams.category = slug;
    this.router.navigate(['/list'], { queryParams });
  }

  totalPages(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.itemsPerPage));
  }

  private clampPage(page: number, totalItems?: number): number {
    const maxPage = totalItems != null ? this.totalPages(totalItems) : undefined;
    if (page < 1) {
      return 1;
    }
    if (maxPage && page > maxPage) {
      return maxPage;
    }
    return page;
  }

  private mapCourse(course: any): CourseListItem {
    const courseFeatures: CourseListFeature[] = Array.isArray(course?.courseFeatures)
      ? course.courseFeatures.map((feature: any) => ({
          id: feature?.id,
          description: feature?.description,
          iconUrl: feature?.iconUrl,
        }))
      : [];
    const canonicalUrl = course?.canonicalUrl ?? course?.CanonicalUrl ?? course?.slug ?? course?.Slug ?? '';
    return {
      ...course,
      canonicalUrl: this.normalizeCourseUrl(canonicalUrl),
      titleImageUrl: course?.titleImageUrl ?? course?.TitleImageUrl ?? course?.imageLink ?? course?.ImageLink,
      badge: course?.isBestSeller ? 'Best Seller' : course?.badge,
      courseFeatures,
    };
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/oilandgasclub.jpg';
    }
  }

  onUserImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/user-profile.PNG';
    }
  }

  ngOnDestroy(): void {
    // ✅ SSR OPTIMIZATION: No subscriptions to clean up - async pipe handles it automatically
  }
}
