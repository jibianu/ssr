import { Location } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Difficulty, Role } from 'src/app/shared/models/role';

@Component({
    selector: 'app-test-list',
    templateUrl: './test-list.component.html',
    styleUrls: ['./test-list.component.scss'],
    standalone: false
})
export class TestListComponent implements OnInit {

  courseId: string;
  curriculumList = [];
  questionsSetList = [];
  Difficulty: Object = Difficulty;
  subscription: Subscription = new Subscription();
  config: any;
  tableSizes = [5, 10, 20, 25, 50];
  term = '';
  sortDir = 1;
  role: any;
  redirectTo: string;
  courseName: string;
  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private _location:Location
  ) {
    const d = JSON.parse(localStorage.getItem("course"));
    if (d && d.title) {
      this.courseName = d.title;
    }
  }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 20,
      currentPage: 1,
    };
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.courseId) {
          this.courseId = params.courseId;
          this.getquestionSetByCourseId(this.courseId);
        }
      });
    // this.activatedRoute.data.subscribe(data => {
    //   this.role =  data.testRole[0];
    // });
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    }
  }

  getquestionSetByCourseId(courseId) {
    this.subscription.add(this.appService.getQuetionSetCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.questionsSetList = res;
      }
    }));
  }

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
  }

  setCourseProgressDetails(item) {
    var req = {
      "courseProgressId": sessionStorage.getItem('courseProgressID'),
      "entityType": item.title,
      "entityId": item.id,
      "startDateTime": new Date(),
    }
    this.subscription.add(this.appService.addCourseProgressDetail(req)
      .subscribe(
        response => {
          console.log(response);
        },
        error => {
          console.log(error);
        }));
  }
  backPage(){
    this._location.back();
  }
  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  

}

