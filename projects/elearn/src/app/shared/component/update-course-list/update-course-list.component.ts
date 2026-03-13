import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';

@Component({
    selector: 'app-update-course-list',
    templateUrl: './update-course-list.component.html',
    styleUrls: ['./update-course-list.component.scss'],
    standalone: false
})
export class UpdateCourseListComponent implements OnInit {

  constructor(public activeModal: NgbActiveModal, private appService: AdminAppService) { }
  @Input() CategoryID: any;
  @Input() CourseList: any;
  @Input() Category: any;
  ngOnInit(): void {
  }
  closeModal(sendData) {
    this.activeModal.close(sendData);
  }
  updateStudent() {
  }
}
