import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Component, Input, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  CurriculumStudyMaterialGroupDto,
  normalizeStudyMaterialGroups
} from 'src/app/shared/models/study-material.model';

@Component({
  selector: 'app-shared-curriculum-study-material',
  templateUrl: './shared-curriculum-study-material.component.html',
  styleUrls: ['./shared-curriculum-study-material.component.scss'],
  standalone: false
})
export class SharedCurriculumStudyMaterialComponent implements OnChanges, OnDestroy {
  @Input() curriculumId: string;

  studyMaterials: CurriculumStudyMaterialGroupDto[] = [];
  loading = true;
  loadError = '';

  private subscription = new Subscription();

  constructor(private appService: AdminAppService) {}

  ngOnChanges(): void {
    if (this.curriculumId) {
      this.loadStudyMaterials(this.curriculumId);
    }
  }

  loadStudyMaterials(id: string): void {
    this.loading = true;
    this.loadError = '';
    this.subscription.add(
      this.appService.getCurriculumStudyMaterialByCurriculumId(id).subscribe({
        next: (res: unknown) => {
          this.studyMaterials = normalizeStudyMaterialGroups(res);
          this.loading = false;
        },
        error: () => {
          this.studyMaterials = [];
          this.loadError = 'Could not load study materials.';
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
