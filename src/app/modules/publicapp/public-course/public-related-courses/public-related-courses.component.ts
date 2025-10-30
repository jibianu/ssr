import { Subscription } from 'rxjs';
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

  config: any;
  courses = [];
  @Input() categoryName;
  @Input() courseId;
  subscription: Subscription = new Subscription();
  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger
  ) {
    this.config = {
      currentPage: 1,
      itemsPerPage: 5,
      totalItems: 0
    };
  }

  ngOnInit(): void {

  }

  ngOnChanges() {
    if (this.categoryName) {
      this.fetchCourse();
    }
  }

  fetchCourse(): void {
    const obj = {
      pageSize: this.config.itemsPerPage,
      pageNumber: this.config.currentPage,
      'Filter.Category': this.categoryName
    };
    this.subscription.add(this.publicAppService.getCourses(obj)
      .subscribe({
        next: (response) => {
          this.courses = response.results || [];
          // FIXED: Check if index is valid before splicing
          if (this.courseId) {
            const index = this.courses.findIndex((course: any) => course.id === this.courseId);
            if (index >= 0) {
              this.courses.splice(index, 1);
            }
          }
          this.config.totalItems = response.totalNumberOfRecords || 0;
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
        },
        error: (error) => {
          console.error('Error fetching courses:', error);
        }
      }));
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
    }
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
