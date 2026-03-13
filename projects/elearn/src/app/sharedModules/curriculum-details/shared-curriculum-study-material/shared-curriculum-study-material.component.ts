import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { isLessonContentJson } from 'src/app/shared/models/lesson-content.model';

@Component({
    selector: 'app-shared-curriculum-study-material',
    templateUrl: './shared-curriculum-study-material.component.html',
    styleUrls: ['./shared-curriculum-study-material.component.scss'],
    standalone: false
})
export class SharedCurriculumStudyMaterialComponent implements OnInit, OnDestroy {

  @Input() curriculumId: string;
  studyMaterials = [];
  subscription: Subscription = new Subscription();
  isLessonContent = isLessonContentJson;

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
