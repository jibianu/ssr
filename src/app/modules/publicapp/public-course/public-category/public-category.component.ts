
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, Params } from '@angular/router';
import { Observable } from 'rxjs';
import { combineLatest } from 'rxjs';
import { map, switchMap, shareReplay, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-public-category',
  templateUrl: './public-category.component.html',
  styleUrls: ['./public-category.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCategoryComponent implements OnInit, OnDestroy {

  readonly itemsPerPage = 12; // Used in template

  // ✅ SSR OPTIMIZATION: Parallel fetching with combineLatest - no blocking
  coursesData$: Observable<{
    courses: any[];
    totalItems: number;
    currentPage: number;
    categoryName: string;
  }>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService
  ) {
    // ✅ SSR OPTIMIZATION: Combine route params and query params in parallel
    // Executes asynchronously - doesn't block SSR rendering
    this.coursesData$ = combineLatest([
      this.route.params,
      this.route.queryParams
    ]).pipe(
      switchMap(([params, queryParams]) => {
        const categoryName = params['name'] || '';
        const currentPage = +queryParams['page'] || 1;
        
        const requestObj = {
          pageSize: this.itemsPerPage,
          pageNumber: currentPage,
          'Filter.Category': categoryName
        };

        return this.publicAppService.getCourses(requestObj).pipe(
          map(response => ({
            courses: response?.results || [],
            totalItems: response?.totalNumberOfRecords || 0,
            currentPage,
            categoryName
          })),
          catchError(error => {
            console.error('Error fetching courses:', error);
            return of({
              courses: [],
              totalItems: 0,
              currentPage,
              categoryName
            });
          })
        );
      }),
      shareReplay(1) // ✅ Cache for multiple subscriptions
    );
  }

  ngOnInit(): void {
    // ✅ SSR OPTIMIZATION: No blocking operations
    // Observable is already set up in constructor - template uses async pipe
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

  ngOnDestroy(): void {
    // ✅ No subscriptions to clean up - async pipe handles unsubscribe automatically
  }
}
