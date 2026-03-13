import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-student-curriculum-study-material',
    templateUrl: './student-curriculum-study-material.component.html',
    styleUrls: ['./student-curriculum-study-material.component.scss'],
    standalone: false
})
export class StudentCurriculumStudyMaterialComponent implements OnInit, OnChanges, OnDestroy {

  @Input() curriculumId: string;
  studyMaterials = [];
  subscription: Subscription = new Subscription();
  constructor(
    private appService: AdminAppService,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    if (this.curriculumId) {
      this.getStudyMaterialByCurriculumId(this.curriculumId);
    }
  }


  getStudyMaterialByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumStudyMaterialByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        this.studyMaterials = res;
      }
    }));
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
