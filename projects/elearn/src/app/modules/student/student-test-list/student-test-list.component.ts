import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Difficulty } from 'src/app/shared/models/role';
import { AdminAppService } from '../../adminapp/adminapp.service';

@Component({
    selector: 'app-student-test-list',
    templateUrl: './student-test-list.component.html',
    styleUrls: ['./student-test-list.component.scss'],
    standalone: false
})
export class StudentTestListComponent implements OnInit, OnDestroy {

  courseId: string;
  curriculumList = [];
  questionsSetList = [];
  Difficulty: Object = Difficulty;
  subscription: Subscription = new Subscription();
  config: any;
  tableSizes = [5, 10, 20, 25, 50];
  term = '';
  sortDir = 1;
  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
  ) { }

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
  }

  getquestionSetByCourseId(courseId){
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

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
