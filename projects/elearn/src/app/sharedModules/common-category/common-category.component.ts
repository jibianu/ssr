import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { Category } from 'src/app/modules/adminapp/category/category.model';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { getElearnAppBaseUrl } from 'src/app/core/helpers/app-url.helper';

export interface CategoryWithCourses {
  category: any;
  courses: any[];
}

@Component({
  selector: 'app-common-category',
  templateUrl: './common-category.component.html',
  styleUrls: ['./common-category.component.scss'],
  standalone: false
})
export class CommonCategoryComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  categories = new Array<Category>();
  sortDir = 1;
  /** One section (row) per category; each section lists that category's courses in a 4-per-row grid */
  categoriesWithCourses: CategoryWithCourses[] = [];
  currencyCode = 'INR';

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private studentBreadcrumb: StudentBreadcrumbService,
    private authService: AuthenticationService
  ) {
    this.sharedService.category.next('Category');
  }

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Explore' }]);
    this.fetchCategories();
  }

  fetchCategories(): void {
    this.subscription.add(
      this.appService.getPublishedCategories().subscribe(
        (response) => {
          this.categories = response || [];
          this.sortArr('name');
          this.fetchCoursesByCategory();
        },
        (error) => console.log(error)
      )
    );
  }

  /** Load courses for all categories; one section per category, 4 courses per row */
  fetchCoursesByCategory(): void {
    const list = this.categories || [];
    if (list.length === 0) {
      this.categoriesWithCourses = [];
      return;
    }
    const requests = list.map((cat) =>
      this.appService.getCourses({
        'Filter.CategoryId': cat.id,
        'Filter.IsPublished': true,
        pageSize: 12
      })
    );
    this.subscription.add(
      forkJoin(requests).subscribe(
        (results) => {
          const blocks = list.map((cat, i) => {
            const courses = (results[i]?.results || []).map((c) => ({
              ...c,
              bgColor: this.getRandomColor()
            }));
            return { category: cat, courses };
          });
          // Only show categories that have at least one course; Process category first
          const withCourses = blocks.filter((b) => b.courses?.length > 0);
          this.categoriesWithCourses = withCourses.sort((a, b) => {
            const nameA = (a.category?.name || '').toString().toLowerCase();
            const nameB = (b.category?.name || '').toString().toLowerCase();
            if (nameA === 'process') return -1;
            if (nameB === 'process') return 1;
            return 0;
          });
          this.enrichCoursesWithPrices(this.categoriesWithCourses);
        },
        (error) => console.log(error)
      )
    );
  }

  /** Pick the active price (StartDate <= now <= EndDate), or first if none active. Same logic as backend CourseProfile. */
  private getActivePriceRow(prices: any[]): any {
    if (!prices?.length) return null;
    const now = new Date();
    const active = prices.find((p) => {
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      return start && end && start <= now && end >= now;
    });
    return active ?? prices[0];
  }

  /** Attach price (originalPrice, discountedPrice) to each course from getCoursePrices API */
  private enrichCoursesWithPrices(blocks: CategoryWithCourses[]): void {
    const flatCourses = blocks.flatMap((b) => b.courses);
    if (flatCourses.length === 0) return;
    const priceRequests = flatCourses.map((c) => this.appService.getCoursePrices(c.id));
    this.subscription.add(
      forkJoin(priceRequests).subscribe(
        (pricesList) => {
          flatCourses.forEach((course, j) => {
            const priceRow = this.getActivePriceRow(pricesList[j]);
            if (priceRow) {
              const now = new Date();
              const start = priceRow.startDate ? new Date(priceRow.startDate) : null;
              const end = priceRow.endDate ? new Date(priceRow.endDate) : null;
              const isActiveDiscount = start && end && start <= now && end >= now;
              course.originalPrice = priceRow.originalPrice;
              course.discountedPrice = isActiveDiscount ? priceRow.discountedPrice : priceRow.originalPrice;
              course.coursePriceResponse = priceRow;
            }
          });
        },
        () => {}
      )
    );
  }

  /** Buy: if not logged in, redirect to login with returnUrl=/app/student/course/:id; after login user lands on course or checkout. If logged in, go to course details page. */
  goToCheckout(item: any): void {
    if (!item?.id) return;
    const returnUrl = '/app/student/course/' + item.id;
    const token = this.authService.currentToken();
    if (!token) {
      const baseUrl = getElearnAppBaseUrl();
      const url = baseUrl ? `${baseUrl}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}` : `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      window.location.href = url;
      return;
    }
    this.router.navigate(['/app/student/category-courses-description', item.id]);
  }

  getDisplayOriginalPrice(item: any): number | null {
    const orig = item?.originalPrice ?? item?.coursePriceResponse?.originalPrice ?? item?.coursePrices?.[0]?.originalPrice ?? null;
    const offer = this.getOfferPrice(item);
    if (orig == null || offer == null) return null;
    const o = Number(orig);
    const f = Number(offer);
    return o > f ? o : null;
  }

  getOfferPrice(item: any): number {
    const v = item?.discountedPrice ?? item?.coursePriceResponse?.discountedPrice ?? item?.coursePrices?.[0]?.discountedPrice ?? 0;
    return Number(v) || 0;
  }

  goToCourse(item: any): void {
    if (item?.id) {
      this.router.navigate(['category-courses-description', item.id], {
        relativeTo: this.activatedRoute.parent
      });
    }
  }

  goToCategoryCourses(cat: any): void {
    if (cat?.id != null && cat?.name != null) {
      this.router.navigate(['category-courses', cat.id, cat.name], {
        relativeTo: this.activatedRoute.parent
      });
    }
  }

  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    var color1 = Math.floor(0x1000000 * Math.random()).toString(16);
    var color2 = Math.floor(0x1000000 * Math.random()).toString(16);
    return "background-image: linear-gradient(to bottom right," + "#" + ("000000" + color).slice(-6) + ",#" + ("000000" + color1).slice(-6) + ",#" + ("000000" + color2).slice(-6) + ")";
  }
  sortArr(colName: any): void {
    this.categories.sort((a, b) => {
      const aVal = (a[colName] != null ? String(a[colName]) : '').toLowerCase();
      const bVal = (b[colName] != null ? String(b[colName]) : '').toLowerCase();
      if (aVal < bVal) return -1 * this.sortDir;
      if (aVal > bVal) return 1 * this.sortDir;
      return 0;
    });
  }

  ngOnDestroy(): void {
    this.sharedService.category.next("")
  }
}
