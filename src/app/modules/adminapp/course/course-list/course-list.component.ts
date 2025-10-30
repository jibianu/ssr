import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { StorageUtil } from 'src/app/core/utils/storage.util';

@Component({
    selector: 'app-course-list',
    templateUrl: './course-list.component.html',
    styleUrls: ['./course-list.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class CourseListComponent implements OnInit, OnDestroy {

  course = [];
  config: any;
  page = 1;
  count: number;
  tableSize = 5;
  searchTitle = '';
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'Title';
  isAsc = true;
  currentUser: any;
  private readonly isBrowser: boolean;

  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private cookieService: CookieService,
    private cdr: ChangeDetectorRef, // ✅ PERFORMANCE: For manual change detection trigger
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    console.log('course list component init')
    // ✅ SSR: Safe sessionStorage access with platform check
    if (this.isBrowser) {
      StorageUtil.clearSession();
    }
    // FIXED: Add error handling for cookie parsing
    try {
      const userCookie = this.cookieService.getCookie('currentUser');
      if (userCookie) {
        this.currentUser = JSON.parse(userCookie);
        if (this.currentUser?.isAdmin) {
          this.fetchCourses();
        }
      }
    } catch (error) {
      console.error('Error parsing currentUser cookie:', error);
      this.currentUser = null;
    }
  }

  fetchCourses(): void {
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
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
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

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByCourseId(index: number, course: any): string {
    return course?.id || index.toString();
  }

  trackByTableSize(index: number, size: number): number {
    return size;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
