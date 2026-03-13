import { Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';

@Component({
    selector: 'app-student-dashboard',
    templateUrl: './student-dashboard.component.html',
    styleUrls: ['./student-dashboard.component.scss'],
    standalone: false
})
export class StudentDashboardComponent implements OnInit {

  
  students = [];
  page_std = 1;
  
  count_std: number;
  tableSize = 20;
  searchTitle = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  constructor(    
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private cookieService: CookieService,
  ) { }

  ngOnInit(): void {
    this.fetchStudents();
  }
  fetchStudents():void{
    let obj = {
      'Filters.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page_std,
    }
    this.subscription.add(this.appService.getStudents(obj,false)
        .subscribe(
          response => {
            this.students = response.results;
            this.count_std = response.totalNumberOfRecords;
          },
          error => {
            console.log(error);
          }));
  }
  pageChanged(event) {
    this.page_std = event;
    this.fetchStudents();
  }

  onTableSizeChange(event): void {
    this.tableSize = event.target.value;
    this.page_std = 1;
    this.fetchStudents();
  }
  
  sortByHeading(value: string) {
    this.sortBy = value;
    if (this.isAsc) {
      this.isAsc = false;
    } else {
      this.isAsc = true;
    }
    this.fetchStudents();
  }
  deleteUser(id) {
    this.open_std(id);
  }

  open_std(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Student Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteUserById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Student deleted successfully');
              this.page_std = 1;
              this.fetchStudents();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }
  openPermisionModal(item) {
    // debugger
    var studentDetailsmodel = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    studentDetailsmodel.componentInstance.userId = item.id;
    studentDetailsmodel.componentInstance.role=2;
  }
  
  openCourseModal(item) {
    var studentDetailsmodel = this.modalService.open(StudentCourseListComponent,
      { windowClass: 'modal-right'});
    studentDetailsmodel.componentInstance.userID = item.id;
    studentDetailsmodel.componentInstance.name = item.firstName + ' ' + item.lastName;
    studentDetailsmodel.componentInstance.email = item.email;
    studentDetailsmodel.componentInstance.showNoOfUserField=false;
  }
  openStudentInfo(item){
    var studentDetailsmodel = this.modalService.open(UserInfoComponent,
      { windowClass: 'modal-right'});
    studentDetailsmodel.componentInstance.userID = item.id;
    // studentDetailsmodel.componentInstance.name = item.firstName + ' ' + item.lastName;
    studentDetailsmodel.componentInstance.email = item.email;
  }
}
