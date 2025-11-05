import { Observable, of, combineLatest, BehaviorSubject } from 'rxjs';
import { switchMap, map, catchError, shareReplay, startWith } from 'rxjs/operators';
import { PublicAppService } from './../../publicapp.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit, OnDestroy, Input, OnChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-public-related-courses',
    templateUrl: './public-related-courses.component.html',
    styleUrls: ['./public-related-courses.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicRelatedCoursesComponent implements OnInit, OnChanges, OnDestroy {

  readonly itemsPerPage = 5;

  // ✅ SSR OPTIMIZATION: Use Observable with async pipe - no blocking
  courses$: Observable<any[]>;

  @Input() categoryName: string | null = null;
  @Input() courseId: string | null = null;

  // ✅ SSR OPTIMIZATION: Use BehaviorSubject to react to @Input changes
  private categoryName$ = new BehaviorSubject<string | null>(null);
  private courseId$ = new BehaviorSubject<string | null>(null);

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger
  ) {
    // ✅ SSR OPTIMIZATION: Non-blocking Observable pipeline
    // Reacts to @Input changes via BehaviorSubjects
    this.courses$ = combineLatest([
      this.categoryName$.pipe(startWith(null)),
      this.courseId$.pipe(startWith(null))
    ]).pipe(
      switchMap(([categoryName, courseId]) => {
        // Skip if no category name provided
        if (!categoryName) {
          return of([]);
        }

        const obj = {
          pageSize: this.itemsPerPage,
          pageNumber: 1,
          'Filter.Category': categoryName
        };

        return this.publicAppService.getCourses(obj).pipe(
          map(response => {
            let courses = response.results || [];
            // ✅ FIX: Normalize canonicalUrl for proper routing
            courses = courses.map((course: any) => {
              const originalUrl = course?.canonicalUrl;
              const normalizedUrl = this.normalizeCourseUrl(originalUrl);
              // Debug logging to help identify routing issues
              if (originalUrl !== normalizedUrl) {
                console.log(`🔗 Normalized course URL: "${originalUrl}" → "${normalizedUrl}"`);
              }
              return {
                ...course,
                canonicalUrl: normalizedUrl
              };
            });
            // ✅ FIX: Remove current course from related courses list
            if (courseId) {
              const index = courses.findIndex((course: any) => course.id === courseId);
              if (index >= 0) {
                courses = [...courses]; // Create new array for immutability
                courses.splice(index, 1);
              }
            }
            return courses;
          }),
          catchError(error => {
            console.error('Error fetching related courses:', error);
            return of([]); // ✅ ERROR HANDLING: Return empty array on error
          }),
          shareReplay(1) // ✅ Cache for multiple subscriptions/renders
        );
      }),
      shareReplay(1) // ✅ Cache the entire stream
    );
  }

  ngOnInit(): void {
    // ✅ SSR OPTIMIZATION: No blocking operations
    // Observable is already set up in constructor - template uses async pipe
    // Initialize with current @Input values
    if (this.categoryName) {
      this.categoryName$.next(this.categoryName);
    }
    if (this.courseId) {
      this.courseId$.next(this.courseId);
    }
  }

  ngOnChanges() {
    // ✅ SSR OPTIMIZATION: Update BehaviorSubjects to trigger Observable stream
    if (this.categoryName !== undefined) {
      this.categoryName$.next(this.categoryName);
    }
    if (this.courseId !== undefined) {
      this.courseId$.next(this.courseId);
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
    }
    // ✅ FIX: Removed dead code - courses are already loaded via courses$ Observable
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
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
    // ✅ Return absolute path starting with '/' for root-level routing
    return '/' + normalized;
  }

  ngOnDestroy(): void {
    // ✅ SSR OPTIMIZATION: Complete BehaviorSubjects on destroy
    this.categoryName$.complete();
    this.courseId$.complete();
  }

}
