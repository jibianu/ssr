import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
@Component({
    selector: 'app-student-course-details',
    templateUrl: './student-course-details.component.html',
    styleUrls: ['./student-course-details.component.scss'],
    standalone: false
})
export class StudentCourseDetailsComponent implements OnInit {

  courseId: string;
  courseDetails: any = {};
  constructor(
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    // this.activatedRoute.firstChild
    //   .params
    //   .subscribe(params => {
    //     if (params.courseId) {
    //       this.courseId = params.courseId;

    //     }
    //   });

    this.courseDetails = JSON.parse(localStorage.getItem('course'));
    if (this.courseDetails) {
      this.courseId = this.courseDetails.id;
    }
  }
}
