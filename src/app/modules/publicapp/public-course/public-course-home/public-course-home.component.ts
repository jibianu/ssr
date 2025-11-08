
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError, tap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { BackendHealthService } from 'src/app/core/services/backend-health.service';
import { environment } from 'src/environments/environment';
import { getApiUrl } from 'src/app/core/config/api-url.config';

@Component({
    selector: 'app-public-course-home',
    templateUrl: './public-course-home.component.html',
    styleUrls: ['./public-course-home.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {
  // ✅ SSR OPTIMIZATION: Use Observable with async pipe - no blocking
  items$: Observable<any[]>;
  
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
    return 'http://localhost:52046/';
  }
  // ✅ FIX: Move inject() to constructor to prevent injector errors in SSR
  private backendHealthService: BackendHealthService;
  
  // ✅ FIX: Add missing isDragging property for owl-carousel dragging state
  isDragging = false;

  // Base carousel options
  private readonly baseOptions: OwlOptions = {
    loop: false,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false,
    navSpeed: 700,
    margin: 5,
    navText: ['<i class="fa fa-chevron-left fa-3x"></i>', '<i class="fa fa-chevron-right fa-3x"></i>'],
    nav: true,
    responsive: {
      0: { items: 1 },
      400: { items: 2 },
      740: { items: 3 },
      940: { items: 4 }
    }
  };

  // ✅ FIX: Cache carousel options to prevent infinite change detection loops
  // Returns the same object reference for the same course count
  private carouselOptionsCache = new Map<number, OwlOptions>();

  // ✅ FIX: Dynamic carousel options with memoization to prevent infinite change detection
  getCarouselOptions(courseCount: number = 0): OwlOptions {
    // Normalize courseCount to prevent cache misses for same effective value
    const normalizedCount = Math.max(1, Math.min(courseCount, 4));
    
    // Return cached options if available
    if (this.carouselOptionsCache.has(normalizedCount)) {
      return this.carouselOptionsCache.get(normalizedCount)!;
    }

    // Create and cache new options
    const options: OwlOptions = {
      ...this.baseOptions,
      nav: courseCount > normalizedCount,
      responsive: {
        0: { items: Math.min(1, courseCount) || 1 },
        400: { items: Math.min(2, courseCount) || 1 },
        740: { items: Math.min(3, courseCount) || 1 },
        940: { items: Math.min(4, courseCount) || 1 }
      }
    };
    
    this.carouselOptionsCache.set(normalizedCount, options);
    return options;
  }

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
          return [];
        }
        // ✅ Process data in RxJS pipeline - executes asynchronously
        return categories
          .map((ele: any) => {
            const categoryName = ele.name || '';
            // ✅ FILTER: Only include courses that match this category
            const originalCourses = ele.courses || [];
            let filteredCourses = originalCourses
              .filter((course: any) => {
                const courseCategory = course?.category?.name || course?.categoryName || course?.category || '';
                return this.normalizeCategoryName(courseCategory) === this.normalizeCategoryName(categoryName);
              })
              .map((course: any) => ({
                ...course,
                canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
              }));

            // ✅ FALLBACK: If strict filtering removes everything, show original list to avoid empty sections
            if (filteredCourses.length === 0 && originalCourses.length > 0) {
              filteredCourses = originalCourses.map((course: any) => ({
                ...course,
                canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
              }));
            }
            return {
              categoryName: categoryName,
              categoryCourse: filteredCourses,
              sortOrder: ele.sortOrder || 0,
              carouselOptions: this.getCarouselOptions(filteredCourses.length)
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }),
      catchError(error => {
        // ✅ ERROR HANDLING: Graceful fallback on timeout/error
        console.error('Error loading dashboard categories:', error);
        this.error = error?.error?.message || 'Failed to load categories. Please refresh the page.';
        return of([]); // Return empty array instead of breaking
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
   * Shows user-friendly message when backend is offline
   */
  private checkBackendHealth(): void {
    this.backendHealthService.checkHealthWithTimeout(5000).subscribe(available => {
      this.backendAvailable = available;
      if (!available && !this.error) {
        // Only show backend unavailable message if there's no other error
        // Use the actual backend URL for error message (not the proxy path)
        const actualApiUrl = this.backendHealthService.getActualBackendUrl();
        this.error = `Unable to connect to API server. Please ensure the backend is running at ${actualApiUrl}`;
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
          return [];
        }
        return categories
          .map((ele: any) => {
            const categoryName = ele.name || '';
            const originalCourses = ele.courses || [];
            let filteredCourses = originalCourses
              .filter((course: any) => {
                const courseCategory = course?.category?.name || course?.categoryName || course?.category || '';
                return this.normalizeCategoryName(courseCategory) === this.normalizeCategoryName(categoryName);
              })
              .map((course: any) => ({
                ...course,
                canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
              }));

            if (filteredCourses.length === 0 && originalCourses.length > 0) {
              filteredCourses = originalCourses.map((course: any) => ({
                ...course,
                canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
              }));
            }
            return {
              categoryName: categoryName,
              categoryCourse: filteredCourses,
              sortOrder: ele.sortOrder || 0,
              carouselOptions: this.getCarouselOptions(filteredCourses.length)
            };
          })
          .sort((a, b) => a.sortOrder - b.sortOrder);
      }),
      catchError(error => {
        console.error('Error loading dashboard categories:', error);
        this.error = error?.error?.message || 'Failed to load categories. Please refresh the page.';
        return of([]);
      }),
      shareReplay(1)
    );
  }

  // ✅ PERFORMANCE: Add trackBy functions for ngFor optimization
  trackByItemIndex(index: number, item: any): string {
    return item?.categoryName || index.toString();
  }

  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
  }

  trackByFeatureId(index: number, feature: any): string {
    return feature?.id || index.toString();
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

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
    }
  }

  ngOnDestroy(): void {
    // ✅ No subscriptions to clean up - async pipe handles unsubscribe automatically
  }
}