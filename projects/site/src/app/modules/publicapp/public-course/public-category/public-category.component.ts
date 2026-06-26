
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, shareReplay, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
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

        if (!normalizedSlug) {
          return of({
            courses: [],
            totalItems: 0,
            currentPage,
            categoryName: resolvedCategory.displayName || 'Category'
          });
        }

        // Use api/public/courses?categorySlug=... (same as Elearn) so backend filters by CategoryId
        return this.publicAppService.getPublicCoursesByCategory(categorySlugForApi, currentPage, this.itemsPerPage).pipe(
          map(response => {
            const courses: CategoryCourseItem[] = (response?.results || []).map((course: any) => this.mapCourse(course));
            const displayName = resolvedCategory.displayName || this.formatCategoryTitle(rawCategoryParam);
            return {
              courses,
              totalItems: response?.totalNumberOfRecords ?? 0,
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

  private resolveCategoryName(
    rawParam: string,
    categories: any[]
  ): { filterName: string; displayName: string; categoryId?: string; apiSlug?: string } {
    const normalizedParamSlug = this.normalizeCategorySlug(rawParam);

    if (!normalizedParamSlug) {
      return { filterName: '', displayName: '' };
    }

    const slugMatchesParam = (value: string | null | undefined): boolean => {
      if (value == null || String(value).trim() === '') {
        return false;
      }
      const n = this.normalizeCategorySlug(String(value));
      if (n === normalizedParamSlug) {
        return true;
      }
      // Short URL segment (e.g. "piping") vs long category slug — mirror backend segment match
      if (normalizedParamSlug.length >= 3) {
        return n.split('-').some(seg => seg === normalizedParamSlug);
      }
      return false;
    };

    let matchingCategory = (categories || []).find((category: any) => {
      const candidateValues = [
        category?.name,
        category?.categoryName,
        category?.slug,
        category?.Slug,
        category?.canonicalUrl,
        category?.canonicalCategoryUrl
      ];

      return candidateValues.some(value => slugMatchesParam(value));
    });

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

  private normalizeCategorySlug(value: string): string {
    if (!value) {
      return '';
    }

    const trimmed = decodeURIComponent(value)
      .replace(/^\/+/, '')
      .replace(/category\//i, '')
      .trim()
      .toLowerCase();

    return trimmed
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private formatCategoryTitle(value: string): string {
    if (!value) {
      return '';
    }

    const words = this.normalizeCategorySlug(value)
      .split('-')
      .filter(Boolean);

    return words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
