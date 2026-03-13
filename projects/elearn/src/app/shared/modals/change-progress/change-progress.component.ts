import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-change-progress',
    templateUrl: './change-progress.component.html',
    styleUrls: ['./change-progress.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class ChangeProgressComponent implements OnInit {

  constructor(public activeModal: NgbActiveModal) { }
  @Input() selectedProgress=10;
progressList:any[]=[];
// selectedProgress=10;
  ngOnInit(): void {
    this.progressList=[
      10,30,50,70,90,100
    ];
    // for(var a=10;a<100;a+10){
    //   this.progressList.push(a);
    // }
  }

  close(){
    this.activeModal.close(null)
  }
updateProgress(){
this.activeModal.close(this.selectedProgress);
}
}
