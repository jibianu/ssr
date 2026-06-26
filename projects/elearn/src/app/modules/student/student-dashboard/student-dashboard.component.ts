import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp/adminapp.service';

@Component({
    selector: 'app-student-dashboard',
    templateUrl: './student-dashboard.component.html',
    styleUrls: ['./student-dashboard.component.scss'],
    standalone: false
})
export class StudentDashboardComponent implements OnInit, OnDestroy {

  course = [];
  config: any;
  page = 1;
  count: number;
  tableSize = 20;
  searchTitle = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'Title';
  isAsc = true;
  currentUser: any;
  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private cookieService: CookieService,
  ) { }

  ngOnInit(): void {
    this.fetchCourses();
  }

  fetchCourses(): void {
    let obj = {
      'Filters.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
      isPublished:true
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

}
