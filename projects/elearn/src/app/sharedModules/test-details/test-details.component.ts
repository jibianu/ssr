import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CurriculamStatus, Difficulty, QuestionType, Role } from 'src/app/shared/models/role';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { CommonServiceService } from 'src/app/shared/service/common-service.service';

@Component({
    selector: 'app-test-details',
    templateUrl: './test-details.component.html',
    styleUrls: ['./test-details.component.scss'],
    standalone: false
})
export class TestDetailsComponent implements OnInit, OnDestroy {
  questionSetId: string;
  questionSetDetails: any = {};
  questions = [];
  Difficulty: Object = Difficulty;
  subscription: Subscription = new Subscription();
  role: any;
  redirectTo: string;

  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private router: Router, private _service:CommonServiceService
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
    // this.activatedRoute.data.subscribe(data => {
    //   this.role = data.testDetailRole[0];
    // });
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    }
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
    localStorage.removeItem("sq")
    this._service.startTest(this.questionSetId, CurriculamStatus.QuestionSets, this.questionSetId);
    this.router.navigate(['/app/' + this.redirectTo + '/exam-test', this.questionSetDetails.id, QuestionType.ExamQA])
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}

