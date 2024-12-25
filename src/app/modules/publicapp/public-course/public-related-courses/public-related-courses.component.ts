import { Subscription } from 'rxjs';
import { PublicAppService } from './../../publicapp.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit, OnDestroy, Input, OnChanges } from '@angular/core';

@Component({
  selector: 'app-public-related-courses',
  templateUrl: './public-related-courses.component.html',
  styleUrls: ['./public-related-courses.component.scss']
})
export class PublicRelatedCoursesComponent implements OnInit, OnChanges, OnDestroy {

  config: any;
  courses = [];
  @Input() categoryName;
  @Input() courseId;
  subscription: Subscription = new Subscription();
  constructor(private route: ActivatedRoute, private router: Router,
    private publicAppService: PublicAppService,) {
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
    let obj = {
      pageSize: this.config.itemsPerPage,
      pageNumber: this.config.currentPage,
      'Filter.Category': this.categoryName
    }
    this.subscription.add(this.publicAppService.getCourses(obj)
      .subscribe(
        response => {
          this.courses = response.results;
          const index = this.courses.findIndex(course => course.id === this.courseId); 
          this.courses.splice(index, 1);
          this.config.totalItems = response.totalNumberOfRecords;
        },
        error => {
          console.log(error);
        }));
  }

  onImgError(event) {
    event.target.src = 'https://via.placeholder.com/468x300?text=oilandgasclub.com';
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
