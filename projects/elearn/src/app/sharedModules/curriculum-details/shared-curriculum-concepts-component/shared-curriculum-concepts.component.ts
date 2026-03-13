import { Component, Input, OnInit, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-shared-curriculum-concepts',
    templateUrl: './shared-curriculum-concepts.component.html',
    styleUrls: ['./shared-curriculum-concepts.component.scss'],
    standalone: false
})
export class SharedCurriculumConceptsComponent implements OnInit, OnDestroy, OnChanges {

  @Input() curriculumId: string;
  subscription: Subscription = new Subscription();
  concepts = [];
curriculum:any;
  constructor(
    private appService: AdminAppService,
  ) { }

  ngOnInit(): void {
    this.curriculum=JSON.parse(localStorage.getItem("curriculum"))
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
        console.log(this.concepts);
      }
    }));
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
