import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp/adminapp.service';

@Component({
    selector: 'app-student-curriculum-details',
    templateUrl: './student-curriculum-details.component.html',
    styleUrls: ['./student-curriculum-details.component.scss'],
    standalone: false
})
export class StudentCurriculumDetailsComponent implements OnInit, OnDestroy {
  curriculumDetails: any = {};
  curriculumId: string;
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
        }
      });
      this.curriculumDetails = JSON.parse(localStorage.getItem('curriculum'));
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
