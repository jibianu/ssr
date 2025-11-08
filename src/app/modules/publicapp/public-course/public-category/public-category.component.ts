
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, shareReplay, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-public-category',
  templateUrl: './public-category.component.html',
  styleUrls: ['./public-category.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCategoryComponent {

  readonly itemsPerPage = 12; // Used in template

  // ✅ SSR OPTIMIZATION: Parallel fetching with combineLatest - no blocking
  coursesData$: Observable<{
    courses: any[];
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
        const rawCategoryParam = params['name'] || '';
        const currentPage = +queryParams['page'] || 1;

        const resolvedCategory = this.resolveCategoryName(rawCategoryParam, categories);

        if (!resolvedCategory.filterName) {
          console.warn(`Category parameter "${rawCategoryParam}" did not match any known category.`);
          return of({
            courses: [],
            totalItems: 0,
            currentPage,
            categoryName: resolvedCategory.displayName
          });
        }

        const requestObj = {
          pageSize: this.itemsPerPage,
          pageNumber: currentPage,
          'Filters.Category': resolvedCategory.filterName
        };

        return this.publicAppService.getCourses(requestObj).pipe(
          map(response => ({
            courses: response?.results || [],
            totalItems: response?.totalNumberOfRecords || 0,
            currentPage,
            categoryName: resolvedCategory.displayName
          })),
          catchError(error => {
            console.error('Error fetching courses:', error);
            return of({
              courses: [],
              totalItems: 0,
              currentPage,
              categoryName: resolvedCategory.displayName
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
  pageChange(newPage: number): void {
    const categoryName = this.route.snapshot.params['name'] || '';
    this.router.navigate(
      ['category', categoryName],
      { queryParams: { page: newPage } }
    );
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
  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
  }

  trackByFeatureId(index: number, feature: any): string {
    return feature?.id || index.toString();
  }

  private resolveCategoryName(rawParam: string, categories: any[]): { filterName: string; displayName: string } {
    const normalizedParamSlug = this.normalizeCategorySlug(rawParam);

    if (!normalizedParamSlug) {
      return { filterName: '', displayName: '' };
    }

    const matchingCategory = (categories || []).find((category: any) => {
      const candidateValues = [
        category?.name,
        category?.categoryName,
        category?.canonicalUrl,
        category?.canonicalCategoryUrl
      ];

      return candidateValues.some(value => this.normalizeCategorySlug(value) === normalizedParamSlug);
    });

    if (matchingCategory) {
      const displayName = matchingCategory?.name || matchingCategory?.categoryName || this.formatCategoryTitle(rawParam);
      return {
        filterName: displayName,
        displayName
      };
    }

    const fallbackDisplay = this.formatCategoryTitle(rawParam);
    return {
      filterName: fallbackDisplay,
      displayName: fallbackDisplay
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

}
