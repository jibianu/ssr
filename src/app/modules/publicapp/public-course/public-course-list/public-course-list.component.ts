
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
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

@Component({
  selector: 'app-public-course-list',
  templateUrl: './public-course-list.component.html',
  styleUrls: ['./public-course-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  readonly itemsPerPage = 15;

  // ✅ SSR OPTIMIZATION: Use Observable with async pipe - no blocking
  coursesData$: Observable<{
    courses: CourseListItem[];
    totalItems: number;
    currentPage: number;
    config: {
      currentPage: number;
      itemsPerPage: number;
      totalItems: number;
    };
  }>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {
    // ✅ SSR OPTIMIZATION: Non-blocking Observable pipeline
    // Combine route query params and fetch courses in parallel (non-blocking)
    this.coursesData$ = this.route.queryParams.pipe(
      switchMap(params => {
        const currentPage = +params['page'] || 1;
        const obj = {
          pageSize: this.itemsPerPage,
          pageNumber: currentPage
        };

        return this.publicAppService.getCourses(obj).pipe(
          map(response => {
            console.log('[PublicCourseListComponent] Courses response:', response);
            // ✅ FIX: Normalize canonicalUrl for all courses to ensure routerLink works correctly
            const courses: CourseListItem[] = (response.results || []).map((course: any) => this.mapCourse(course));

            const totalItems = response.totalNumberOfRecords || 0;
            console.log('[PublicCourseListComponent] Mapped courses:', courses.length, 'Total items:', totalItems);
            
            const result = {
              courses,
              totalItems,
              currentPage,
              config: {
                currentPage,
                itemsPerPage: this.itemsPerPage,
                totalItems
              }
            };
            
            // Trigger change detection after data is loaded
            setTimeout(() => this.cdr.markForCheck(), 0);
            
            return result;
          }),
          catchError(error => {
            console.error('[PublicCourseListComponent] Error loading courses:', error);
            this.cdr.markForCheck();
            return of({
              courses: [],
              totalItems: 0,
              currentPage,
              config: {
                currentPage: 1,
                itemsPerPage: this.itemsPerPage,
                totalItems: 0
              }
            });
          })
        );
      }),
      shareReplay(1) // ✅ Cache for multiple subscriptions/renders
    );
  }

  ngOnInit(): void {
    // ✅ SSR OPTIMIZATION: No blocking operations
    // Observable is already set up in constructor - template uses async pipe
  }

  // ✅ FIX: Normalize course URL to ensure routerLink works correctly
  // Removes leading '/' and any 'course/course/' or 'course/' prefixes
  // Returns absolute path starting with '/' for root-level course routes
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
    // ✅ Return absolute path starting with '/' for root-level routing
    return '/' + normalized;
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

    return {
      ...course,
      canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl),
      badge: course?.badge,
      courseFeatures,
    };
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
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
