import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';

@Component({
    selector: 'app-public-course-list',
    templateUrl: './public-course-list.component.html',
    styleUrls: ['./public-course-list.component.scss'],
    standalone: false
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  config: any;
  collection = [];
  courses = [];
  subscription: Subscription = new Subscription();
  constructor(private route: ActivatedRoute, private router: Router,
    private publicAppService: PublicAppService,) {
    this.config = {
      currentPage: 1,
      itemsPerPage: 20,
      totalItems: 0
    };
    route.queryParams.subscribe(
      params => {
        this.config.currentPage = params['page'] ? params['page'] : 1
        this.fetchCourse();
      });
  }

  ngOnInit() {
    // this.fetchBlogs();
  }

  fetchCourse(): void {
    const obj = {
      pageSize: this.config.itemsPerPage,
      pageNumber: this.config.currentPage
    };
    this.subscription.add(this.publicAppService.getPublicCourses(obj).subscribe({
      next: (response) => {
        const raw = response.results ?? response.Results ?? [];
        const total = response.totalNumberOfRecords ?? response.TotalNumberOfRecords ?? 0;
        this.courses = raw.map((c: any) => ({
          ...c,
          title: c.title ?? c.Title,
          canonicalUrl: c.canonicalUrl ?? (c.slug || c.Slug ? `/course/${c.slug || c.Slug}` : '#'),
          titleImageUrl: c.titleImageUrl ?? c.TitleImageUrl ?? c.imageLink ?? c.ImageLink,
          courseFeatures: c.courseFeatures ?? c.CourseFeatures ?? []
        }));
        this.config.totalItems = total;
      },
      error: (err) => {
        console.error('Public course list failed', err);
      }
    }));
  }

  pageChange(newPage: number) {
    this.router.navigate(['/list'], { queryParams: { page: newPage } });
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=ono.blog.com';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
