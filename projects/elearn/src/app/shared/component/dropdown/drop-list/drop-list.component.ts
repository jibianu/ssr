import { ChangeDetectionStrategy, Component, Input, OnInit, OnChanges } from '@angular/core';
import { NgbDropdown } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-drop-list',
    templateUrl: './drop-list.component.html',
    styleUrls: ['./drop-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class DropListComponent implements OnInit, OnChanges {
  @Input() roleResponse: any;
  demo = 'test'
  constructor(private adminAppService: AdminAppService) { }

  ngOnInit(): void {
    debugger
    console.log("This id for dropdown " + this.roleResponse);
    // this.adminAppService.Get("api/User/permissions/byuser/"+ this.StudentID)
    // .subscribe(Response =>{
    //   debugger
    //   this.StudentList = Response
    // })
  }
  ngOnChanges(): void {
    // console.log("This id for dropdown " + this.StudentID);
    
  }


}
