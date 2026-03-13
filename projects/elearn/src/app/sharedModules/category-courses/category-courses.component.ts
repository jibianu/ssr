import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Role } from 'src/app/shared/models/role';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { getElearnAppBaseUrl } from 'src/app/core/helpers/app-url.helper';

@Component({
    selector: 'app-category-courses',
    templateUrl: './category-courses.component.html',
    styleUrls: ['./category-courses.component.scss'],
    standalone: false
})
export class CategoryCoursesComponent implements OnInit, OnDestroy {
  courses: any;
  subscription: Subscription = new Subscription();
  role: any;
  page: number = 1;
  count: number = 0;
  gadata: any;
  cotegoryID: string;
  /** Category name from route, shown at top of page */
  categoryName: string = '';
  /** Currency code for price display (e.g. INR, USD) */
  currencyCode = 'INR';

  gradientVariable: any='background-image: linear-gradient(to bottom right,#809fff, #eb99ff);'
  // trialcolor: any = 'background-image: linear-gradient(to bottom right, #8080ff , #d580ff);';

  constructor(
    private appService: AdminAppService,
    private activateRoute: ActivatedRoute,
    private route: Router,
    private _location: Location,
    private sharedService: SharedService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.cotegoryID = this.activateRoute.snapshot.params['categoryID'];
    this.categoryName = this.activateRoute.snapshot.params['name'] || '';
    this.sharedService.categoryName.next(this.categoryName);
    this.studentBreadcrumb.setBreadcrumb([
      { label: 'Explore', url: '/app/student/categories' },
      { label: this.categoryName || 'Category' }
    ]);
    this.activateRoute.data.subscribe(data => {
      this.role = data.roles[0];
    });
    this.fetchDetails(this.cotegoryID);

    // let randomGradientColors = ['red', 'green', 'blue', 'orange'];
    // let anothercolor = ['tomato', 'sky-blue', 'brown', 'pink'];

    // for (let i = 0; i < randomGradientColors.length; i++) {
    //   for (let j = 0; j < randomGradientColors.length; j++) {
    //     let indexColor = randomGradientColors[Math.floor(Math.random() * randomGradientColors.length)];
    //     let nextindexColor = anothercolor[Math.floor(Math.random() * anothercolor.length)]
    //     this.gradientVariable = 'background-image: linear-gradient(to bottom right, ' + indexColor + ', ' + nextindexColor + ' )'
    //     console.log(this.gradientVariable);
    //   }
    // }

  }
  loadData() {
    // let cotegoryID = this.activateRoute.snapshot.params['categoryID'];
    this.fetchDetails(this.cotegoryID);
  }

  fetchDetails(item) {
    const obj: Record<string, string | number | boolean> = {
      'Filter.CategoryId': item,
      pageNumber: this.page,
      pageSize: 100
    };
    if (this.role == Role.Company || this.role == Role.Student) {
      obj['Filter.IsPublished'] = true;
      obj['Filter.IsProgressInfo'] = true;
    }
    this.subscription.add(
      this.appService.getCourses(obj).pipe(
        map((response) => {
          this.courses = response.results;
          this.count = response.totalNumberOfRecords;
          if (!this.categoryName && this.courses?.length > 0 && this.courses[0]?.category?.name) {
            this.categoryName = this.courses[0].category.name;
          }
          return this.courses;
        })
      ).subscribe(
        (courses) => {
          if (!courses?.length) {
            this.gadata = [];
            return;
          }
          const priceRequests = courses.map((c) => this.appService.getCoursePrices(c.id));
          forkJoin(priceRequests).subscribe(
            (pricesList) => {
              this.gadata = courses.map((x, i) => {
                const priceRow = this.getActivePriceRow(pricesList[i]);
                const isActiveDiscount = priceRow && this.isPriceRowActive(priceRow);
                return {
                  ...x,
                  bgColor: this.getRandomColor(),
                  originalPrice: priceRow?.originalPrice ?? x.originalPrice,
                  discountedPrice: isActiveDiscount ? priceRow?.discountedPrice : (priceRow?.originalPrice ?? x.discountedPrice),
                  coursePriceResponse: priceRow ?? x.coursePriceResponse
                };
              });
            },
            () => {
              this.gadata = courses.map((x) => ({ ...x, bgColor: this.getRandomColor() }));
            }
          );
        },
        (error) => console.log(error)
      )
    );
    // this.appService.getCourses(item)
    // .then(
    //   res => {
    //     console.log(res);
    //     this.courses = res;
    //   }
    // )
  }
  // GetCourcesDescription(item) {
  //   debugger
  //   this.sharedService.setCategoryCoursesDescription(item);
  //   // this.route.navigate(['/category-courses-description']);
  // }
  fnAddWishList(item) {
    let obj: any;
    obj = {
      courseId: item.id,
      comments: 'testing'
    }
    this.subscription.add(this.appService.addWishList(obj).subscribe((res: any) => {
      console.log(res);
      this.loadData()
      item["wishListsResponse"] = true;
    }));
  }
  fnUpdateWishList(item) {
    let obj = {
      wishListId: item.wishListsResponse.id
    }
    this.subscription.add(this.appService.updateWishList(obj).subscribe((res: any) => {
      console.log(res);
      item["wishListsResponse"] = false;
    }));
  }
  fnResume(item) {
    // app/student/details/curriculum-list/f016466b-d621-4ad3-90e3-b75e53ccbd66
    localStorage.setItem('course', JSON.stringify(item))
    this.route.navigate(['app/student/details/curriculum-list/', item?.courseProgress.courseId])
  }
  pageChanged(event) {
    this.page = event;
    this.loadData();
    // this.fetchTrainers();
  }
  backPage(){
    this._location.back();
  }
  redirectToDescription(item) {
    this.route.navigate(['/app/student/category-courses-description/', item.id]);
  }

  /** Navigate to checkout for course purchase */
  /** Buy: if not logged in, redirect to login with returnUrl=/app/student/course/:id; after login user lands on course or checkout. If logged in, go to course details page. */
  goToCheckout(item: any) {
    if (!item?.id) return;
    const returnUrl = '/app/student/course/' + item.id;
    const token = this.authService.currentToken();
    if (!token) {
      const baseUrl = getElearnAppBaseUrl();
      const url = baseUrl ? `${baseUrl}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}` : `/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      window.location.href = url;
      return;
    }
    this.route.navigate(['/app/student/category-courses-description', item.id]);
  }

  /** Pick the active price (StartDate <= now <= EndDate), or first if none active. Same logic as backend CourseProfile. */
  private getActivePriceRow(prices: any[]): any {
    if (!prices?.length) return null;
    const now = new Date();
    const active = prices.find((p) => this.isPriceRowActive(p));
    return active ?? prices[0];
  }

  private isPriceRowActive(p: any): boolean {
    const now = new Date();
    const start = p?.startDate ? new Date(p.startDate) : null;
    const end = p?.endDate ? new Date(p.endDate) : null;
    return !!(start && end && start <= now && end >= now);
  }

  /** Original (actual) price – show only when greater than offer price */
  getDisplayOriginalPrice(item: any): number | null {
    const orig = item?.originalPrice ?? item?.coursePriceResponse?.originalPrice ?? item?.coursePrices?.[0]?.originalPrice ?? null;
    const offer = this.getOfferPrice(item);
    if (orig == null || offer == null) return null;
    const o = Number(orig);
    const f = Number(offer);
    return o > f ? o : null;
  }

  /** Offer (discounted) price for display */
  getOfferPrice(item: any): number {
    const v = item?.discountedPrice ?? item?.coursePriceResponse?.discountedPrice ?? item?.coursePrices?.[0]?.discountedPrice ?? 0;
    return Number(v) || 0;
  }

  checkToRedirect(item) {
    if(item?.courseEnrollmentsResponse){
      if(item.testProgressResponse.totalTask!=item.testProgressResponse.completedTask){
        this.fnResume(item)
      }
      if(item.testProgressResponse.totalTask==item.testProgressResponse.completedTask){
        this.fnResume(item)
      }
    }  
    if(!item?.courseEnrollmentsResponse){
      if(item.wishListsResponse){
        this.fnUpdateWishList(item);
        this.redirectToDescription(item)
      }
      if(!item.wishListsResponse){       
        this.fnAddWishList(item)
        this.redirectToDescription(item)
      }
    }
  }
  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    var color1 = Math.floor(0x1000000 * Math.random()).toString(16);
    var color2 = Math.floor(0x1000000 * Math.random()).toString(16);
    return "background-image: linear-gradient(to bottom right," + "#" + ("000000" + color).slice(-6) + ",#" + ("000000" + color1).slice(-6) + ",#" + ("000000" + color2).slice(-6) + ")";
  }

  ngOnDestroy(): void {
    this.sharedService.categoryName.next('');
  }
}
