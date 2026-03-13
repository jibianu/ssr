import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-curriculum-detail',
    templateUrl: './curriculum-detail.component.html',
    styleUrls: ['./curriculum-detail.component.scss'],
    standalone: false
})
export class CurriculumDetailComponent implements OnInit {

  curriculumId: string;
  constructor(
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
  }

}
