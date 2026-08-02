
import { Component, ChangeDetectionStrategy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, shareReplay, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { SsrResponseStatusService } from 'src/app/core/services/ssr-response-status.service';
import { normalizeCategorySlug, formatCategoryTitle } from 'src/app/core/helpers/category-slug.helper';
import { environment } from 'src/environments/environment';

interface CategoryCourseFeature {
  id?: string;
  description?: string;
  iconUrl?: string;
}

interface CategoryCourseItem {
  id?: string;
  title?: string;
  titleImageUrl?: string;
  shortDescription?: string;
  courseDuration?: string;
  categoryName?: string;
  amount?: number;
  canonicalUrl: string;
  courseFeatures: CategoryCourseFeature[];
  badge?: string;
}

@Component({
  selector: 'app-public-category',
  templateUrl: './public-category.component.html',
  styleUrls: ['./public-category.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCategoryComponent {
  /** URL slug -> possible category slugs when exact match fails (e.g. bgas -> oil-and-gas). */
  private static readonly SLUG_ALIASES: Record<string, string[]> = {
    bgas: ['oil-gas', 'oil-and-gas']
  };

  readonly itemsPerPage = 16; // Used in template

  // ✅ SSR OPTIMIZATION: Parallel fetching with combineLatest - no blocking
  coursesData$: Observable<{
    courses: CategoryCourseItem[];
    totalItems: number;
    currentPage: number;
    categoryName: string;
  }>;

  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly structuredDataService: StructuredDataService;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ssrStatus = inject(SsrResponseStatusService);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService,
    structuredDataService: StructuredDataService
  ) {
    // ✅ FIX: Initialize injected service in constructor to ensure injector is available
    this.structuredDataService = structuredDataService;
    // ✅ SSR OPTIMIZATION: Combine route params and query params in parallel
    // Executes asynchronously - doesn't block SSR rendering
    this.coursesData$ = combineLatest([
      this.route.params,
      this.route.queryParams,
      this.publicAppService.getCategories().pipe(
        catchError(error => {
          console.error('Error fetching categories for category page:', error);
          return of([]);
        })
      )
    ]).pipe(
      switchMap(([params, queryParams, categories]) => {
        const rawCategoryParam = (params['name'] || '').toString().trim();
        const currentPage = +queryParams['page'] || 1;
        const normalizedSlug = this.normalizeCategorySlug(rawCategoryParam);
        const resolvedCategory = this.resolveCategoryName(rawCategoryParam, categories);
        /** Same key the backend uses for ?categorySlug= (short paths like "piping" are resolved server-side via segment match). */
        const categorySlugForApi = (resolvedCategory.apiSlug && resolvedCategory.apiSlug.trim().length > 0)
          ? resolvedCategory.apiSlug.trim()
          : normalizedSlug;

        // Canonical URL enforcement: any variant (uppercase /category/Structural,
        // alias /category/instrumentation, encoded spaces) answers ONE direct 301
        // to /category/{canonical-slug} — never a duplicate 200.
        const canonicalSlug = resolvedCategory.apiSlug || normalizedSlug;
        if (canonicalSlug && rawCategoryParam && rawCategoryParam !== canonicalSlug) {
          this.redirectToCanonicalCategory(canonicalSlug, currentPage);
          return of({
            courses: [],
            totalItems: 0,
            currentPage,
            categoryName: resolvedCategory.displayName || 'Category'
          });
        }

        if (!normalizedSlug) {
          return of({
            courses: [],
            totalItems: 0,
            currentPage,
            categoryName: resolvedCategory.displayName || 'Category'
          });
        }

        const categoryKnown = Boolean(resolvedCategory.categoryId) || (categories || []).length === 0;

        // Use api/public/courses?categorySlug=... (same as Elearn) so backend filters by CategoryId
        return this.publicAppService.getPublicCoursesByCategory(categorySlugForApi, currentPage, this.itemsPerPage).pipe(
          map(response => {
            const courses: CategoryCourseItem[] = (response?.results || []).map((course: any) => this.mapCourse(course));
            const totalItems = response?.totalNumberOfRecords ?? 0;
            // Unknown category with no content: real 404 during SSR, never a thin 200
            // (categoryKnown is true when the categories list itself failed to load —
            // a transient API outage must not mark valid pages as 404).
            if (!categoryKnown && totalItems === 0 && !isPlatformBrowser(this.platformId)) {
              this.ssrStatus.setNotFound();
            }
            const displayName = resolvedCategory.displayName || this.formatCategoryTitle(rawCategoryParam);
            return {
              courses,
              totalItems,
              currentPage,
              categoryName: displayName
            };
          }),
          catchError(error => {
            console.error('Error fetching courses by category:', error);
            return of({
              courses: [],
              totalItems: 0,
              currentPage,
              categoryName: resolvedCategory.displayName || this.formatCategoryTitle(rawCategoryParam)
            });
          })
        );
      }),
      tap(data => {
        const categoryForBreadcrumb = data.categoryName || 'Category';
        const breadcrumbs = [
          { name: 'Home', url: environment.seoUrl },
          { name: 'Courses', url: `${environment.seoUrl}list` },
          { name: categoryForBreadcrumb, url: `${environment.seoUrl}category/${this.normalizeCategorySlug(categoryForBreadcrumb)}` }
        ];
        this.structuredDataService.setBreadcrumbs(breadcrumbs);
      }),
      shareReplay(1) // ✅ Cache for multiple subscriptions
    );
  }

  // Pagination handler - uses route snapshot for navigation
  pageChange(newPage: number, totalItems?: number): void {
    const clampedPage = this.clampPage(newPage, totalItems);
    const currentPage = +this.route.snapshot.queryParamMap.get('page') || 1;

    if (clampedPage === currentPage) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: clampedPage },
      queryParamsHandling: 'merge'
    });

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  totalPages(totalItems: number): number {
    return Math.max(1, Math.ceil((totalItems || 0) / this.itemsPerPage));
  }

  // Fallback image for course image
  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/oilandgasclub.jpg';
    }
  }

  // Fallback image for user image
  onUserImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/user-profile.png';
    }
  }

  // ✅ PERFORMANCE: Add trackBy functions for ngFor optimization
  trackByCourseId(index: number, course: CategoryCourseItem): string {
    return course?.id != null ? String(course.id) : String(index);
  }

  trackByFeatureId(index: number, feature: CategoryCourseFeature): string {
    return feature?.id != null ? String(feature.id) : String(index);
  }

  /**
   * Duplicate URL variant → one direct permanent redirect to the canonical
   * category URL. SSR answers a real HTTP 301; the browser swaps the URL
   * without a history entry. Content-changing ?page is preserved.
   */
  private redirectToCanonicalCategory(canonicalSlug: string, currentPage: number): void {
    const pageQuery = currentPage > 1 ? `?page=${currentPage}` : '';
    if (isPlatformBrowser(this.platformId)) {
      void this.router.navigate(['/category', canonicalSlug], {
        replaceUrl: true,
        queryParams: currentPage > 1 ? { page: currentPage } : {}
      });
    } else {
      this.ssrStatus.setRedirect(`/category/${encodeURIComponent(canonicalSlug)}${pageQuery}`, 301);
    }
  }

  private resolveCategoryName(
    rawParam: string,
    categories: any[]
  ): { filterName: string; displayName: string; categoryId?: string; apiSlug?: string } {
    const normalizedParamSlug = this.normalizeCategorySlug(rawParam);

    if (!normalizedParamSlug) {
      return { filterName: '', displayName: '' };
    }

    const candidateValuesOf = (category: any): unknown[] => [
      category?.name,
      category?.categoryName,
      category?.slug,
      category?.Slug,
      category?.canonicalUrl,
      category?.canonicalCategoryUrl
    ];

    const exactMatch = (value: unknown): boolean =>
      value != null &&
      String(value).trim() !== '' &&
      this.normalizeCategorySlug(String(value)) === normalizedParamSlug;

    const segmentMatch = (value: unknown): boolean => {
      if (value == null || String(value).trim() === '') {
        return false;
      }
      // Short URL segment (e.g. "piping") vs long category slug — mirror backend segment match
      if (normalizedParamSlug.length >= 3) {
        return this.normalizeCategorySlug(String(value))
          .split('-')
          .some(seg => seg === normalizedParamSlug);
      }
      return false;
    };

    // Exact slug match wins; the fuzzy segment fallback only runs when no
    // category matches exactly (deterministic canonical target for aliases).
    let matchingCategory =
      (categories || []).find((category: any) => candidateValuesOf(category).some(exactMatch)) ??
      (categories || []).find((category: any) => candidateValuesOf(category).some(segmentMatch));

    // Resolve by slug alias (e.g. bgas -> oil-and-gas) so display name matches backend filter
    if (!matchingCategory && PublicCategoryComponent.SLUG_ALIASES[normalizedParamSlug]) {
      const aliasSlugs = PublicCategoryComponent.SLUG_ALIASES[normalizedParamSlug];
      matchingCategory = (categories || []).find((category: any) => {
        const catSlug = this.normalizeCategorySlug(category?.name ?? category?.categoryName ?? category?.slug ?? category?.Slug ?? '');
        return aliasSlugs.some(alias => alias === catSlug);
      });
    }

    if (matchingCategory) {
      const displayName = matchingCategory?.name || matchingCategory?.categoryName || this.formatCategoryTitle(rawParam);
      const id = matchingCategory?.id ?? matchingCategory?.Id;
      const categoryId = id != null ? String(id).trim() : undefined;
      const apiSlug =
        this.normalizeCategorySlug(matchingCategory?.slug ?? matchingCategory?.Slug ?? '') ||
        this.normalizeCategorySlug(displayName ?? '');
      return {
        filterName: displayName,
        displayName,
        categoryId,
        apiSlug: apiSlug || undefined
      };
    }

    const fallbackDisplay = this.formatCategoryTitle(rawParam);
    return {
      filterName: fallbackDisplay,
      displayName: fallbackDisplay,
      apiSlug: undefined
    };
  }

  /** Delegates to the shared helper — single source of truth for category slugs. */
  private normalizeCategorySlug(value: string): string {
    return normalizeCategorySlug(value);
  }

  private formatCategoryTitle(value: string): string {
    return formatCategoryTitle(value);
  }

  private normalizeCourseUrl(url: string | null | undefined): string {
    const n =
      this.publicAppService.normalizePublicCourseSlug(url || '') ||
      this.publicAppService.normalizeSlugRouteParam(String(url || ''));
    return n ? `/${n}` : '';
  }

  private mapCourse(course: any): CategoryCourseItem {
    const courseFeatures: CategoryCourseFeature[] = Array.isArray(course?.courseFeatures)
      ? course.courseFeatures.map((feature: any) => ({
          id: feature?.id,
          description: feature?.description,
          iconUrl: feature?.iconUrl,
        }))
      : [];

    const badge = course?.isBestSeller ? 'Best Seller' : course?.badge;
    const canonicalUrl = course?.canonicalUrl ?? course?.CanonicalUrl ?? course?.slug ?? course?.Slug ?? '';

    // Price: backend may return amount, Amount, finalPrice, price, or coursePrices[0]
    const directPrice = course?.amount ?? course?.Amount ?? course?.finalPrice ?? course?.FinalPrice ?? course?.price ?? course?.Price;
    const fromPriceList = Array.isArray(course?.coursePrices) && course.coursePrices.length > 0
      ? (course.coursePrices[0]?.finalPrice ?? course.coursePrices[0]?.FinalPrice ?? course.coursePrices[0]?.discountedPrice ?? course.coursePrices[0]?.originalPrice)
      : undefined;
    const amount = directPrice != null ? Number(directPrice) : (fromPriceList != null ? Number(fromPriceList) : 0);

    return {
      ...course,
      canonicalUrl: this.normalizeCourseUrl(canonicalUrl),
      titleImageUrl: this.publicAppService.resolveCourseImageUrl(
        course?.titleImageUrl ?? course?.TitleImageUrl ?? course?.imageLink ?? course?.ImageLink
      ),
      courseFeatures,
      badge,
      amount: Number.isFinite(amount) ? amount : 0,
    };
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
}
