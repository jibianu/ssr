
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { BackendHealthService } from 'src/app/core/services/backend-health.service';
import { environment } from 'src/environments/environment';
import { getApiUrl } from 'src/app/core/config/api-url.config';

interface HomeCourseFeature {
  id?: string;
  description?: string;
  iconUrl?: string;
}

interface HomeCourse {
  id?: string;
  title?: string;
  titleImageUrl?: string;
  shortDescription?: string;
  amount?: number;
  canonicalUrl: string;
  courseFeatures: HomeCourseFeature[];
  badge?: string;
}

interface HomeCategorySection {
  categoryName: string;
  categorySlug: string;
  courses: HomeCourse[];
  totalCourses: number;
}

@Component({
    selector: 'app-public-course-home',
    templateUrl: './public-course-home.component.html',
    styleUrls: ['./public-course-home.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {
  // ✅ SSR OPTIMIZATION: Use Observable with async pipe - no blocking
  items$: Observable<HomeCategorySection[]>;
  
  // ✅ ERROR HANDLING: Loading and error states
  loading = false;
  error: string | null = null;
  backendAvailable = true; // Track if backend API is available
  
  // ✅ FIX: Expose actual backend URL for template (not proxy path)
  get apiUrl(): string {
    // Use BackendHealthService to get the actual backend URL for display
    if (this.backendHealthService) {
      return this.backendHealthService.getActualBackendUrl();
    }
    // Fallback if service not initialized yet
    return 'http://localhost:52056/';
  }
  // ✅ FIX: Move inject() to constructor to prevent injector errors in SSR
  private backendHealthService: BackendHealthService;

  constructor(
    private publicAppService: PublicAppService,
    @Inject(PLATFORM_ID) private platformId: Object,
    backendHealthService: BackendHealthService
  ) {
    // ✅ FIX: Initialize injected service in constructor to ensure injector is available
    this.backendHealthService = backendHealthService;
    // ✅ SSR OPTIMIZATION: Non-blocking Observable pipeline
    // Data processing moved to RxJS pipeline - no blocking during SSR
    this.items$ = this.publicAppService.getDashboardCategories().pipe(
      map(categories => {
        if (!categories || categories.length === 0) {
          return [] as HomeCategorySection[];
        }
        // ✅ Process data in RxJS pipeline - executes asynchronously
        return categories
          .map((ele: any) => {
            const categoryName = ele.name || '';
            const categorySlug = this.normalizeCategorySlug(categoryName);
            const originalCourses = Array.isArray(ele.courses) ? ele.courses : [];

            let filteredCourses = originalCourses.filter((course: any) => {
              const courseCategory = course?.category?.name || course?.categoryName || course?.category || '';
              return this.normalizeCategoryName(courseCategory) === this.normalizeCategoryName(categoryName);
            });

            if (filteredCourses.length === 0 && originalCourses.length > 0) {
              filteredCourses = originalCourses;
            }

            const mappedCourses: HomeCourse[] = filteredCourses.slice(0, 6).map(course => this.mapCourse(course));

            return {
              categoryName,
              categorySlug,
              courses: mappedCourses,
              totalCourses: filteredCourses.length,
              sortOrder: ele.sortOrder || 0
            } as HomeCategorySection & { sortOrder: number };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ sortOrder, ...rest }) => rest);
      }),
      catchError(error => {
        // ✅ ERROR HANDLING: Graceful fallback on timeout/error
        console.error('Error loading dashboard categories:', error);
        
        // If backend health check also failed, show detailed backend unavailable message
        if (!this.backendAvailable) {
          const actualApiUrl = this.backendHealthService.getActualBackendUrl();
          this.error = `Unable to connect to API server. Please ensure the backend is running at ${actualApiUrl}`;
        } else {
          // Backend is available but API call failed - show generic error
          this.error = error?.error?.message || 'Failed to load categories. Please refresh the page.';
        }
        
        return of([] as HomeCategorySection[]); // Return empty array instead of breaking
      }),
      shareReplay(1) // ✅ Cache for multiple subscriptions/renders
    );
  }

  ngOnInit(): void {
    // ✅ SSR OPTIMIZATION: No blocking operations
    // HTTP transfer cache automatically handles SSR data transfer
    // Observable is already set up in constructor - template uses async pipe
    
    // ✅ BACKEND HEALTH: Check if backend is available (browser only)
    if (isPlatformBrowser(this.platformId)) {
      this.checkBackendHealth();
    }
  }
  
  /**
   * ✅ BACKEND HEALTH: Check if backend API is available
   * Only logs to console - doesn't show UI error unless actual API calls fail
   * This prevents false positives when backend is slow to respond to health checks
   */
  private checkBackendHealth(): void {
    this.backendHealthService.checkHealthWithTimeout(5000).subscribe(available => {
      this.backendAvailable = available;
      // Don't show error immediately - only show if actual API calls also fail
      // This prevents false positives when backend is slow to start or temporarily unavailable
      if (!available) {
        console.warn('⚠️ Backend health check failed, but waiting for actual API call to confirm');
      }
    });
  }
  
  // ✅ ERROR HANDLING: Reload on retry
  reload(): void {
    this.error = null;
    // ✅ BACKEND HEALTH: Clear health check cache and re-check
    this.backendHealthService.clearCache();
    this.checkBackendHealth();
    
    // Re-initialize the Observable (clear cache first)
    this.items$ = this.publicAppService.getDashboardCategories().pipe(
      map(categories => {
        if (!categories || categories.length === 0) {
          return [] as HomeCategorySection[];
        }
        return categories
          .map((ele: any) => {
            const categoryName = ele.name || '';
            const categorySlug = this.normalizeCategorySlug(categoryName);
            const originalCourses = Array.isArray(ele.courses) ? ele.courses : [];

            let filteredCourses = originalCourses.filter((course: any) => {
              const courseCategory = course?.category?.name || course?.categoryName || course?.category || '';
              return this.normalizeCategoryName(courseCategory) === this.normalizeCategoryName(categoryName);
            });

            if (filteredCourses.length === 0 && originalCourses.length > 0) {
              filteredCourses = originalCourses;
            }

            const mappedCourses: HomeCourse[] = filteredCourses.slice(0, 6).map(course => this.mapCourse(course));

            return {
              categoryName,
              categorySlug,
              courses: mappedCourses,
              totalCourses: filteredCourses.length,
              sortOrder: ele.sortOrder || 0
            } as HomeCategorySection & { sortOrder: number };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(({ sortOrder, ...rest }) => rest);
      }),
      catchError(error => {
        console.error('Error loading dashboard categories:', error);
        
        // If backend health check also failed, show detailed backend unavailable message
        if (!this.backendAvailable) {
          const actualApiUrl = this.backendHealthService.getActualBackendUrl();
          this.error = `Unable to connect to API server. Please ensure the backend is running at ${actualApiUrl}`;
        } else {
          // Backend is available but API call failed - show generic error
          this.error = error?.error?.message || 'Failed to load categories. Please refresh the page.';
        }
        
        return of([] as HomeCategorySection[]);
      }),
      shareReplay(1)
    );
  }

  // ✅ PERFORMANCE: Add trackBy functions for ngFor optimization
  trackByItemIndex(index: number, item: HomeCategorySection): string {
    return item?.categoryName || index.toString();
  }

  trackByCourseId(index: number, course: HomeCourse): string {
    return course?.id != null ? String(course.id) : String(index);
  }

  trackByFeatureId(index: number, feature: HomeCourseFeature): string {
    return feature?.id != null ? String(feature.id) : String(index);
  }

  // ✅ FIX: Normalize course URL to ensure routerLink works correctly
  // Removes leading '/' and any 'course/course/' or 'course/' prefixes
  // Returns just the course slug for routerLink (relative to /course route)
  private normalizeCourseUrl(url: string | null | undefined): string {
    if (!url) return '';
    // Remove leading slash
    let normalized = url.replace(/^\/+/, '');
    // Remove 'course/course/' prefix if present
    if (normalized.startsWith('course/course/')) {
      normalized = normalized.replace(/^course\/course\//, '');
    } else if (normalized.startsWith('course/')) {
      normalized = normalized.replace(/^course\//, '');
    }
    // ✅ Return absolute path starting with '/' for root-level routing (handle empty gracefully)
    return normalized ? `/${normalized}` : '';
  }

  // ✅ FILTER: Normalize category name for case-insensitive comparison
  private normalizeCategoryName(categoryName: string | null | undefined): string {
    if (!categoryName) return '';
    // Trim whitespace and convert to lowercase for case-insensitive comparison
    return categoryName.trim().toLowerCase();
  }

  private normalizeCategorySlug(categoryName: string | null | undefined): string {
    if (!categoryName) {
      return '';
    }

    return categoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
    }
  }

  private mapCourse(course: any): HomeCourse {
    const courseFeatures: HomeCourseFeature[] = Array.isArray(course?.courseFeatures)
      ? course.courseFeatures.map((feature: any) => ({
          id: feature?.id,
          description: feature?.description,
          iconUrl: feature?.iconUrl
        }))
      : [];

    const badge = course?.isBestSeller ? 'Best Seller' : course?.badge;

    return {
      ...course,
      canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl),
      courseFeatures,
      badge
    };
  }

  ngOnDestroy(): void {
    // ✅ No subscriptions to clean up - async pipe handles unsubscribe automatically
  }
}