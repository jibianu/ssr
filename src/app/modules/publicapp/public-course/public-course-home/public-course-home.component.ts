
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID, Optional } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { Observable, of } from 'rxjs';
import { map, shareReplay, catchError } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';

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
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
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
            const courses = (ele.courses || []).map((course: any) => ({
              ...course,
              // ✅ FIX: Normalize canonicalUrl to ensure it's just the course slug for routerLink
              // Remove leading '/' and any 'course/course/' or 'course/' prefixes
              canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
            }));
            return {
              categoryName: ele.name,
              categoryCourse: courses,
              sortOrder: ele.sortOrder || 0,
              // ✅ Pre-compute carousel options to avoid calling method in template (prevents infinite loops)
              carouselOptions: this.getCarouselOptions(courses.length)
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
  }
  
  // ✅ ERROR HANDLING: Reload on retry
  reload(): void {
    this.error = null;
    // Re-initialize the Observable (clear cache first)
    this.items$ = this.publicAppService.getDashboardCategories().pipe(
      map(categories => {
        if (!categories || categories.length === 0) {
          return [];
        }
        return categories
          .map((ele: any) => {
            const courses = (ele.courses || []).map((course: any) => ({
              ...course,
              // ✅ FIX: Normalize canonicalUrl to ensure it's just the course slug for routerLink
              canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
            }));
            return {
              categoryName: ele.name,
              categoryCourse: courses,
              sortOrder: ele.sortOrder || 0,
              // ✅ Pre-compute carousel options to avoid calling method in template (prevents infinite loops)
              carouselOptions: this.getCarouselOptions(courses.length)
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
    // ✅ Return just the slug - routerLink will resolve relative to current route (/course)
    return normalized;
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