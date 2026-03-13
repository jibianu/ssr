import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-student-curriculum-concepts',
    templateUrl: './student-curriculum-concepts.component.html',
    styleUrls: ['./student-curriculum-concepts.component.scss'],
    standalone: false
})
export class StudentCurriculumConceptsComponent implements OnInit, OnChanges, OnDestroy {

  @Input() curriculumId: string;
  subscription: Subscription = new Subscription();
  concepts = [];

  constructor(
    private appService: AdminAppService,
  ) { }

  ngOnInit(): void {
  }


  ngOnChanges() {
    if (this.curriculumId) {
      this.getConceptByCurriculumId(this.curriculumId);
    }
  }

  getConceptByCurriculumId(id) {
    this.subscription.add(this.appService.getCurriculumConceptByCurriculumId(id).subscribe((res: any) => {
      if (res) {
        // this.setvalue(res);
        this.concepts = res;
      }
    }));
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
