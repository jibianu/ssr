import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionType, Role } from 'src/app/shared/models/role';

@Component({
    selector: 'app-questions-bank',
    templateUrl: './questions-bank.component.html',
    styleUrls: ['./questions-bank.component.scss'],
    standalone: false
})
export class QuestionsBankComponent implements OnInit {

  courseId: string;
  role: any;
  redirectTo: string;
  questionType: any;
  constructor(
    private activatedRoute: ActivatedRoute,
    private _location:Location
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.courseId) {
          this.courseId = params.courseId;
        }
      });
    // this.activatedRoute.data.subscribe(data => {
    //   this.role = data.questionRole[0];
    // });
    this.role = +sessionStorage.getItem('Role');
    if (this.role === Role.Company) {
      this.redirectTo = 'company';
    } else if (this.role === Role.Student) {
      this.redirectTo = 'student';
    }
    this.questionType = QuestionType.PracticeQA;
  }

  backPage(){
    this._location.back();
  }
}

