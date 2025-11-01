
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, switchMap, catchError, shareReplay } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { NgxPaginationModule } from "ngx-pagination";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-course-list',
  templateUrl: './public-course-list.component.html',
  styleUrls: ['./public-course-list.component.scss'],
  imports: [NgxPaginationModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  readonly itemsPerPage = 18;

  // ✅ SSR OPTIMIZATION: Use Observable with async pipe - no blocking
  coursesData$: Observable<{
    courses: any[];
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
            // ✅ FIX: Normalize canonicalUrl for all courses to ensure routerLink works correctly
            const courses = (response.results || []).map((course: any) => ({
              ...course,
              canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
            }));

            const totalItems = response.totalNumberOfRecords || 0;
            return {
              courses,
              totalItems,
              currentPage,
              config: {
                currentPage,
                itemsPerPage: this.itemsPerPage,
                totalItems
              }
            };
          }),
          catchError(error => {
            console.error('Error loading courses:', error);
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
  trackByCourseId(index: number, course: any): string {
    return course?.id || index;
  }

  trackByFeatureId(index: number, feature: any): string {
    return feature?.id || index;
  }

  pageChange(newPage: number): void {
    this.router.navigate(['/list'], { queryParams: { page: newPage } });
    // ✅ OPTIMIZATION: Observable will automatically update via route.queryParams
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
