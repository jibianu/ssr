
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';
import { NgxPaginationModule } from "ngx-pagination";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-course-list',
  templateUrl: './public-course-list.component.html',
  styleUrls: ['./public-course-list.component.scss'],
  imports: [NgxPaginationModule, CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  config = {
    currentPage: 1,
    itemsPerPage: 18,
    totalItems: 0
  };

  courses: any[] = [];
  subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {
    // FIXED: Add subscription to cleanup on destroy
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        this.config.currentPage = +params['page'] || 1;
        this.fetchCourse();
      })
    );
  }

  ngOnInit(): void {}

  fetchCourse(): void {
    const obj = {
      pageSize: this.config.itemsPerPage,
      pageNumber: this.config.currentPage
    };

    this.subscription.add(
      this.publicAppService.getCourses(obj).subscribe(
        response => {
          // ✅ FIX: Normalize canonicalUrl for all courses to ensure routerLink works correctly
          this.courses = (response.results || []).map((course: any) => ({
            ...course,
            canonicalUrl: this.normalizeCourseUrl(course?.canonicalUrl)
          }));
          this.config.totalItems = response.totalNumberOfRecords || 0;
          this.cdr.markForCheck(); // Manual change detection trigger for OnPush
        },
        error => {
          console.error('Error loading courses:', error);
        }
      )
    );
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

  // PERFORMANCE: Add trackBy for ngFor optimization
  trackByCourseId(index: number, course: any): string {
    return course?.id || index;
  }

  trackByFeatureId(index: number, feature: any): string {
    return feature?.id || index;
  }

  pageChange(newPage: number): void {
    this.router.navigate(['/list'], { queryParams: { page: newPage } });
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
    this.subscription.unsubscribe();
  }
}
