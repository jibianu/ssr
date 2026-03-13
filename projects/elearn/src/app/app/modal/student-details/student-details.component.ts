import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-student-details',
    templateUrl: './student-details.component.html',
    styleUrls: ['./student-details.component.scss'],
    standalone: false
})
export class StudentDetailsComponent implements OnInit {
  @Input() roleResponse: any;
  @Input() permissionResponse: any;
  @Input() userRole: any;
  @Input() userId: any;
  @Input() userPermissions: any;
  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
    console.log(this.roleResponse);
  }
  closeModal(sendData) {
    this.activeModal.close(sendData);
  }
  updateStudent(){
    
  }
}
