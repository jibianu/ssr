// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { ActivatedRoute, Router } from '@angular/router';
// import { Subscription } from 'rxjs';
// import { PublicAppService } from '../../publicapp.service';
// import { NgxPaginationModule } from 'ngx-pagination';


// @Component({
//     selector: 'app-public-course-list',
//     templateUrl: './public-course-list.component.html',
//     styleUrls: ['./public-course-list.component.scss'],
//     standalone: false
// })
// export class PublicCourseListComponent implements OnInit, OnDestroy {

//   config: any;
//   collection = [];
//   courses = [];
//   subscription: Subscription = new Subscription();
//   constructor(private route: ActivatedRoute, private router: Router,
//     private publicAppService: PublicAppService,) {
//     this.config = {
//       currentPage: 1,
//       itemsPerPage: 6,
//       totalItems: 0
//     };
//     route.queryParams.subscribe(
//       params => {
//         this.config.currentPage = params['page'] ? params['page'] : 1
//         this.fetchCourse();
//       });
//   }

//   ngOnInit() {
//     // this.fetchBlogs();
//   }

//   fetchCourse(): void {
//     let obj = {
//       pageSize: this.config.itemsPerPage,
//       pageNumber: this.config.currentPage
//     }
//     this.subscription.add(this.publicAppService.getCourses(obj)
//       .subscribe(
//         response => {
//           this.courses = response.results;
//           this.config.totalItems = response.totalNumberOfRecords;
//         },
//         error => {
//           console.log(error);
//         }));
//   }

//   pageChange(newPage: number) {
//     console.log(newPage)
//     this.router.navigate(['/list'], { queryParams: { page: newPage } });
//   }

//   onImgError(event) {
//     event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
//   }

//   onUserImgError(event) {
//     event.target.src = 'assets/img/user-profile.PNG';
//   }

//   ngOnDestroy() {
//     if (this.subscription) {
//       this.subscription.unsubscribe();
//     }
//   }

// }

import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';
import { NgxPaginationModule } from "ngx-pagination";

@Component({
  selector: 'app-public-course-list',
  templateUrl: './public-course-list.component.html',
  styleUrls: ['./public-course-list.component.scss'],
  imports: [NgxPaginationModule]
  
})
export class PublicCourseListComponent implements OnInit, OnDestroy {

  config = {
    currentPage: 1,
    itemsPerPage: 6,
    totalItems: 0
  };

  courses: any[] = [];
  subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService
  ) {
    this.route.queryParams.subscribe(params => {
      this.config.currentPage = +params['page'] || 1;
      this.fetchCourse();
    });
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
          this.courses = response.results || [];
          this.config.totalItems = response.totalNumberOfRecords || 0;
        },
        error => {
          console.error('Error loading courses:', error);
        }
      )
    );
  }

  pageChange(newPage: number): void {
    this.router.navigate(['/list'], { queryParams: { page: newPage } });
  }

  onImgError(event: any): void {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
  }

  onUserImgError(event: any): void {
    event.target.src = 'assets/img/user-profile.PNG';
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
