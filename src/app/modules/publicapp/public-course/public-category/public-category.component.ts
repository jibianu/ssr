import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-public-category',
  templateUrl: './public-category.component.html',
  styleUrls: ['./public-category.component.scss']
})
export class PublicCategoryComponent implements OnInit,OnDestroy {

  config: any;
  collection = [];
  courses = [];
  categoryName = '';
  subscription: Subscription = new Subscription();
  constructor(private route: ActivatedRoute, private router: Router,
    private publicAppService: PublicAppService,) {
    this.config = {
      currentPage: 1,
      itemsPerPage: 6,
      totalItems: 0
    };
    route.queryParams.subscribe(
      params => {
        this.config.currentPage = params['page'] ? params['page'] : 1
        this.route.params.subscribe(paramsId => {
          this.categoryName = paramsId.name;
          this.fetchCourse();
      });
        
      });
  }

  ngOnInit() {
    // this.fetchBlogs();
  }

  fetchCourse(): void {
    let obj = {
      pageSize: this.config.itemsPerPage,
      pageNumber: this.config.currentPage,
      'Filter.Category': this.categoryName
    }
    this.subscription.add(this.publicAppService.getCourses(obj)
      .subscribe(
        response => {
          this.courses = response.results;
          this.config.totalItems = response.totalNumberOfRecords;
        },
        error => {
          console.log(error);
        }));
  }

  pageChange(newPage: number) {
    this.router.navigate(['category/', this.categoryName], { queryParams: { page: newPage } });
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
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
