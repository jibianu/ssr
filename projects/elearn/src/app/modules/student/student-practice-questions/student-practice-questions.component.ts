import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy } from '@angular/core';

@Component({
    selector: 'app-student-practice-questions',
    templateUrl: './student-practice-questions.component.html',
    styleUrls: ['./student-practice-questions.component.scss'],
    standalone: false
})
export class StudentPracticeQuestionsComponent implements OnInit, OnDestroy {

  courseId: string;
  difficultyId: string;
  questions = [];
  selectedQuestion: any = {};
  HighlightRow: number = 0;
  yourAnswer = null;
  rightAnswer = null;
  selectedAnswer = null;
  isSubmit = false;
  subscription: Subscription = new Subscription();
  constructor(
    private activatedRoute: ActivatedRoute,
    private appService: AdminAppService,
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.courseId) {
          this.courseId = params.courseId;
        }
        if (params.difficultyId) {
          this.difficultyId = params.difficultyId;
        }
        if (this.difficultyId === '0') {
          this.getAllQuestionsByCourseId(this.courseId);
        } else if (this.difficultyId === '1') {

        }
      });
  }

  getAllQuestionsByCourseId(id) {
    this.subscription.add(this.appService.getAllQuestionsByCourseId(id).subscribe((res: any) => {
      if (res) {
        this.questions = res;
        this.ClickedRow(0);
      }
    }));
  }

  ClickedRow(index) {
    this.HighlightRow = index;
    this.selectedQuestion = this.questions[index];
    this.rightAnswer = null;
    this.yourAnswer = null;
    this.selectedAnswer = null;
    this.isSubmit = false;
  }


  selectOption(j) {
    if (j == this.selectedAnswer) {
      this.selectedAnswer = null;
    } else {
      this.selectedAnswer = j;
    }
  }

  submit() {
    this.isSubmit = true;
  }

  next(index) {
    if (index + 1 >= this.questions.length) {
      return;
    }
    let i = index + 1;
    this.ClickedRow(i);
  }

  previous(index) {
    if (index - 1 < 0) {
      return;
    }
    let i = index - 1;
    this.ClickedRow(i);
  }

  goToCurriculumDetails(){
    
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
