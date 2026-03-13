import { ActivatedRoute } from '@angular/router';
import { Component, Input, OnChanges, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-student-curriculum-questions',
    templateUrl: './student-curriculum-questions.component.html',
    styleUrls: ['./student-curriculum-questions.component.scss'],
    standalone: false
})
export class StudentCurriculumQuestionsComponent implements OnInit, OnDestroy {

  curriculumId: string;
  questions = [];
  selectedQuestion: any = {};
  HighlightRow: number = 0;
  yourAnswer = null;
  rightAnswer = null;
  selectedAnswer = null;
  isSubmit = false;
  subscription: Subscription = new Subscription();
  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.curriculumId) {
          this.curriculumId = params.curriculumId;
          this.getQuestionsByCurriculumId(this.curriculumId);
        }
      });
  }

  getQuestionsByCurriculumId(id) {
    this.subscription.add(this.appService.getQuestionsByCurriculumId(id).subscribe((res: any) => {
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