import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-user-course',
  templateUrl: './user-course.component.html',
  styleUrls: ['./user-course.component.scss']
})
export class UserCourseComponent implements OnInit, OnDestroy {

  config: any;
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  userCourses = new Array();
  term = '';
  currentUser: any;
  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cookieService: CookieService,
  ) { }

  ngOnInit(): void {
    this.currentUser = JSON.parse(this.cookieService.getCookie('currentUser'));
    this.config = {
      itemsPerPage: 5,
      currentPage: 1,
    };
    this.fetchUserCourses();
  }

  deleteCourse(id) {
    this.open(id);
  }

  fetchUserCourses() {
    this.subscription.add(this.appService.getBlogByUser()
      .subscribe(
        response => {
          this.userCourses = response;
        },
        error => {
          console.log(error);
        }));
  }

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Blog Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteCourseById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Blog deleted successfully');
              this.fetchUserCourses();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
