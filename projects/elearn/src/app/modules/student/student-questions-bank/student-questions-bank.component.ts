import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-student-questions-bank',
    templateUrl: './student-questions-bank.component.html',
    styleUrls: ['./student-questions-bank.component.scss'],
    standalone: false
})
export class StudentQuestionsBankComponent implements OnInit {

  courseId: string;
  constructor(
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.activatedRoute
      .params
      .subscribe(params => {
        if (params.courseId) {
          this.courseId = params.courseId;
        }
      });
  }
}
