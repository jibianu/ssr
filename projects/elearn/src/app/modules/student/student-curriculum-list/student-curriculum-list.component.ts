import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp/adminapp.service';

@Component({
    selector: 'app-student-curriculum-list',
    templateUrl: './student-curriculum-list.component.html',
    styleUrls: ['./student-curriculum-list.component.scss'],
    standalone: false
})
export class StudentCurriculumListComponent implements OnInit, OnDestroy {

  courseId: string;
  courseDetails: any = {}
  curriculumList = [];
  questionsSetList = [];
  questions = [];
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
          this.getCurriculumList(this.courseId);
          // this.getquestionSetByCourseId(this.courseId);
        }
      });
    this.courseDetails = JSON.parse(localStorage.getItem('course'));
    if (this.courseDetails) {
      this.courseId = this.courseDetails.id;
    }
  }

  goToCurriculumDetails(item){
    localStorage.setItem('curriculum', JSON.stringify(item));
  }

  getCurriculumList(courseId) {
    this.subscription.add(this.appService.getCurriculumByCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.curriculumList =  res.curriculumResponseList;
      }
    }));
  }

  getquestionSetByCourseId(courseId) {
    this.subscription.add(this.appService.getQuetionSetCourseId(courseId).subscribe((res: any) => {
      if (res) {
        this.questionsSetList = res;
        this.getRandomQuestions(this.questionsSetList[0].id, this.questionsSetList[0].difficultyLevelId)
      }
    }));
  }

  getRandomQuestions(questionSetId, difficultyLevelId) {
    this.subscription.add(this.appService.getRandomQuestions(questionSetId, difficultyLevelId).subscribe((res: any) => {
      if (res) {
        this.questions = res;
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
