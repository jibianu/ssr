import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp/adminapp.service';

@Component({
    selector: 'app-student-exam-test',
    templateUrl: './student-exam-test.component.html',
    styleUrls: ['./student-exam-test.component.scss'],
    standalone: false
})
export class StudentExamTestComponent implements OnInit, OnDestroy {

  questionSetId: string;
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
        if (params.questionSetId) {
          this.questionSetId = params.questionSetId;
          this.getQuestionsByQuestionSetId(this.questionSetId);
        }
      });
  }

  getQuestionsByQuestionSetId(id) {
    this.subscription.add(this.appService.getQuestionByquestionSetId(id).subscribe((res: any) => {
      if (res) {
        this.questions = res;
        if(this.questions && this.questions.length > 0){
        this.ClickedRow(0);
        this.getRandomQuestions();
      }
    }
    }));
  }

  getRandomQuestions(){
    let questionSetDetails = JSON.parse(localStorage.getItem('TestInfo'));
    let questionCount = questionSetDetails.questionSetTestInformation.questionCount;
    if(questionCount)
    return this.questions[Math.floor((Math.random() * questionCount))];
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
