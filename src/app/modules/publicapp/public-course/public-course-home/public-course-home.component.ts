
import { Component, OnInit, OnDestroy } from '@angular/core';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';

@Component({
    selector: 'app-public-course-home',
    templateUrl: './public-course-home.component.html',
    styleUrls: ['./public-course-home.component.scss'],
    standalone: false
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {
  items = [];
  categories = [];
  subscription: Subscription = new Subscription();
  categoryList = [];

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
      0: { items: 1 },
      400: { items: 2 },
      740: { items: 3 },
      940: { items: 4 }
    }
  };

  constructor(private publicAppService: PublicAppService) {}

  ngOnInit(): void {
    this.fetchDashboardCategories();
  }

  fetchDashboardCategories(): void {
    this.subscription.add(
      this.publicAppService.getDashboardCategories().subscribe(
        response => {
          this.categories = response;
          if (this.categories?.length > 0) {
            this.categoryList = this.categories;
            this.items = this.categoryList.map((ele: any) => ({
              categoryName: ele.name,
              categoryCourse: ele.courses,
              sortOrder: ele.sortOrder
            }));
            this.items.sort((a, b) => a.sortOrder - b.sortOrder);
          }
        },
        error => console.error(error)
      )
    );
  }

  onImgError(event): void {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}