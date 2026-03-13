import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from './../../adminapp/adminapp.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Difficulty } from 'src/app/shared/models/role';

@Component({
    selector: 'app-student-test-details',
    templateUrl: './student-test-details.component.html',
    styleUrls: ['./student-test-details.component.scss'],
    standalone: false
})
export class StudentTestDetailsComponent implements OnInit, OnDestroy {
  questionSetId: string;
  questionSetDetails: any = {};
  questions = [];
  Difficulty: Object = Difficulty;
  subscription: Subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.questionSetId) {
          this.questionSetId = params.questionSetId;
          this.getQuestionSetDetails(this.questionSetId);
        }
      });
  }

  getQuestionSetDetails(id) {
    this.subscription.add(this.appService.getQuestionsetById(id).subscribe((res: any) => {
      if (res) {
        this.questionSetDetails = res;
      }
    }));
  }

  takeQuiz() {
    localStorage.setItem('TestInfo', JSON.stringify(this.questionSetDetails));
    this.router.navigate(['/app/student/exam-test', this.questionSetDetails.id])
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
