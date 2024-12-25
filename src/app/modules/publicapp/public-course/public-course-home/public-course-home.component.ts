import { Component, OnInit, OnDestroy } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-public-course-home',
  templateUrl: './public-course-home.component.html',
  styleUrls: ['./public-course-home.component.scss']
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {

  items = [];
  categories = [];
  customOptions: OwlOptions = {
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
      0: {
        items: 1
      },
      400: {
        items: 2
      },
      740: {
        items: 3
      },
      940: {
        items: 4
      }
    },
  }
  subscription: Subscription = new Subscription();
  constructor(
    private publicAppService: PublicAppService,
  ) { }
  ngOnInit(): void {
    this.fetchDashboardCategories();
  }

  fetchDashboardCategories() {
    this.subscription.add(this.publicAppService.getDashboardCategories()
      .subscribe(
        response => {
          // debugger
          this.categories = response;
          if (this.categories && this.categories.length > 0) {
            this.categoryList=this.categories;
            // for(let element of this.categories){
            //   this.fetchCourseByCategoryId(element.id, element.name, element.sortOrder)
            //   // break
            // }
            // this.categories.forEach(element => {
            // });
            // this.getCategoryInfo();

            this.items = this.categoryList.map((ele: any) => ({
              categoryName: ele.name,
              categoryCourse: ele.courses,
              sortOrder: ele.sortOrder
            }))

            this.items.sort((a, b) => (a['sortOrder'] - b['sortOrder']));
          }
        },
        error => {
          console.log(error);
        }));
  }
 
  fetchCourseByCategoryId(id, name, sortOrder) {
    this.subscription.add(this.publicAppService.getCourseByCategoryId(id)
      .subscribe(
        response => {
          let obj = {
            categoryName: name,
            categoryCourse: response,
            sortOrder: sortOrder
          }
          this.items.push(obj);
          this.items.sort((a, b) => (a['sortOrder'] - b['sortOrder']));
        },
        error => {
          console.log(error);
        }));
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
  }

  onUserImgError(event) {
    event.target.src = 'assets/img/user-profile.png';
  }

  trackBySortOrder(index: number, companyProduct: any): string {
    return companyProduct.sortOrder;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  loopCount: number = 0;
  loopMax: number = 0;
  categoryList=[];
  sleeps(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }
  getCategoryInfo(){
    this.loopCount = -1;
    this.loopMax = this.categoryList.length;
    this.getCategoryCourse();
  }
  getCategoryCourse(){
    setTimeout(() => {
      this.loopCount++;
      if (this.loopCount < this.loopMax) {
        var element = this.categoryList[this.loopCount];
        this.getourseByCategoryId(element.id, element.name, element.sortOrder)
      }
    }, 100);
  }
  getourseByCategoryId(id, name, sortOrder) {
    this.subscription.add(this.publicAppService.getCourseByCategoryId(id)
      .subscribe(
        response => {
          let obj = {
            categoryName: name,
            categoryCourse: response,
            sortOrder: sortOrder
          }
          this.items.push(obj);
          this.items.sort((a, b) => (a['sortOrder'] - b['sortOrder']));
        },
        error => {
          console.log(error);
        },()=>{
          this.getCategoryCourse();
        }));
  }
}
