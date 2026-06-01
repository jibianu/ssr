import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  CurriculumStudyMaterialGroupDto,
  normalizeStudyMaterialGroups
} from 'src/app/shared/models/study-material.model';

@Component({
  selector: 'app-student-curriculum-study-material',
  templateUrl: './student-curriculum-study-material.component.html',
  styleUrls: ['./student-curriculum-study-material.component.scss'],
  standalone: false
})
export class StudentCurriculumStudyMaterialComponent implements OnChanges, OnDestroy {
  @Input() curriculumId: string;
  studyMaterials: CurriculumStudyMaterialGroupDto[] = [];
  loading = true;

  private subscription = new Subscription();

  constructor(private appService: AdminAppService) {}

  ngOnChanges(): void {
    if (this.curriculumId) {
      this.subscription.add(
        this.appService.getCurriculumStudyMaterialByCurriculumId(this.curriculumId).subscribe({
          next: (res: unknown) => {
            this.studyMaterials = normalizeStudyMaterialGroups(res);
            this.loading = false;
          },
          error: () => {
            this.studyMaterials = [];
            this.loading = false;
          }
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
