import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { InviteUserComponent } from 'src/app/shared/component/invite-user/invite-user.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { UserManagemntMappingComponent } from 'src/app/shared/component/user-managemnt-mapping/user-managemnt-mapping.component';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { Location } from '@angular/common';

@Component({
    selector: 'app-company-dashboard',
    templateUrl: './company-dashboard.component.html',
    styleUrls: ['./company-dashboard.component.scss'],
    standalone: false
})
export class ComapanyDashboardComponent implements OnInit, OnDestroy {

  course = [];
  students = [];
  config: any;
  page = 1;
  page_std = 1;
  count: number;
  count_std: number;
  tableSize = 20;
  searchTitle = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'Title';
  isAsc = true;
  currentUser: any;
  tab='c';
  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private cookieService: CookieService,
    private location:Location
  ) { }

  ngOnInit(): void {
     this.fetchCourses();
  this.fetchStudents();
  }

  goBack(){
    this.location.back();
  }
  fetchCourses(): void {
    // debugger
    let obj = {
      'Filters.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    }
    this.subscription.add(this.appService.getCourses(obj)
      .subscribe(
        response => {
          this.course = response.results;
          this.count = response.totalNumberOfRecords;
        },
        error => {
          console.log(error);
        }));
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
    this.page = event;
    this.fetchCourses();
  }

  onTableSizeChange(event): void {
    this.tableSize = event.target.value;
    this.page = 1;
    this.fetchCourses();
  }

  deleteCourse(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Course Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCourseById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Course deleted successfully');
              this.page = 1;
              this.fetchCourses();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  gotToCurriculumList(item){
    localStorage.setItem('course', JSON.stringify(item));
  }

  dataChanged(word: string): void {
    if (word == '') {
      this.fetchCourses()
    }
  }

  sortByHeading(value: string) {
    this.sortBy = value;
    if (this.isAsc) {
      this.isAsc = false;
    } else {
      this.isAsc = true;
    }
    this.fetchCourses();
  }

 

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  InviteUser(){
    var studentDetailsmodel = this.modalService.open(InviteUserComponent, { windowClass: 'modal-right' });
    // studentDetailsmodel.componentInstance.userId = item.id;
  }
}
