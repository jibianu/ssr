import { filter, map } from 'rxjs/operators';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { Observable, range, Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CurriculamStatus, ProgressStatus, Role } from 'src/app/shared/models/role';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { CommonServiceService } from 'src/app/shared/service/common-service.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

@Component({
    selector: 'app-common-course',
    templateUrl: './common-course.component.html',
    styleUrls: ['./common-course.component.scss'],
    standalone: false
})
export class CommonCourseComponent implements OnInit, OnDestroy {
  searchTitle = '';
  sortBy = 'Title';
  isAsc = true; page = 1;
  count: number;
  tableSize = 20;
  course = [];
  subscription: Subscription = new Subscription();
  isTrainer = false;
  /** When true, trainer is viewing My Courses (enrolled) – hide Add Course / Edit / Delete, same UI as student */
  isTrainerEnrolledView = false;
  role: any;
  redirectUrl = "";
  courseList: any;
  progressStatusEnum: ProgressStatus;
  inProgressStatus = ProgressStatus.InProgress;
  completedStatus = ProgressStatus.Completed;
  isWishList: boolean;
  totalPageCount: number;
  pageList: any;
  pageType: number = 1;
  currentCourseFilter: number | null = null;
  /** Set when hero image fails to load; shows placeholder instead. */
  heroImageError = false;
  completedImageError = false;
  wishlistImageError = false;
  readonly emptyStateHeroImage = 'assets/img/empty-state-hero.png';
  readonly emptyStateCompletedImage = 'assets/img/empty-state-completed.png';
  readonly emptyStateWishlistImage = 'assets/img/empty-state-wishlist.png';
  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private modalService: NgbModal,
    private authService: AuthenticationService,
    private toasterService: ToasterService,
    private _commonService: CommonServiceService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {}

  ngOnInit(): void {
    console.log("status " + this.inProgressStatus);
    sessionStorage.removeItem('courseProgressID');
    const initialSearch = (this.activatedRoute.snapshot.queryParamMap.get('search') ?? '').trim();
    if (initialSearch) {
      this.searchTitle = initialSearch;
      this.page = 1;
    }
    this.activatedRoute.data.subscribe(data => {
      this.role = data.roles?.[0] ?? data.userRole?.[0];
      console.log(data);
      if (this.role == Role.Trainer) {
        this.isTrainer = true;
        this.isTrainerEnrolledView = true; /* My Courses = enrolled, same as student */
        this.redirectUrl = 'trainer';
        this.fetchEnrolledCourses();
      }
      else if (this.role == Role.Student) {
        this.redirectUrl = 'student';
        this.updateBreadcrumb(this.currentCourseFilter);
        this.fetchEnrolledCourses();
      }
      else if (this.role == Role.Company) {
        this.redirectUrl = 'company';
        this.fetchEnrolledCourses();
      }
    });

    this.authService.commonCourse.next({
      pageType: this.pageType,
      isTrainer: this.isTrainer,
      isWishList: this.isWishList
    })
    this.authService.commonCourse.subscribe(res => {
      if (res?.status) {
        this.currentCourseFilter = res.status;
        this.updateBreadcrumb(res.status);
        if (res.status === 3) {
          this.getWishListCourse();
        } else {
          this.getFilterCourse(res.status);
        }
      }
    });

    this.activatedRoute.queryParams.subscribe(qp => {
      const search = (qp?.search ?? '').trim();
      if (this.searchTitle !== search) {
        this.searchTitle = search;
        this.page = 1;
        if (this.role === Role.Student) {
          if (this.currentCourseFilter === 3) this.getWishListCourse();
          else this.getFilterCourse(this.currentCourseFilter ?? 1);
        }
      }
    });
  }

  private updateBreadcrumb(filterStatus: number | null): void {
    if (this.redirectUrl !== 'student') return;
    const base = { label: 'My Courses', url: '/app/student/courses' };
    if (filterStatus === 1) this.studentBreadcrumb.setBreadcrumb([base, { label: 'In Progress' }]);
    else if (filterStatus === 2) this.studentBreadcrumb.setBreadcrumb([base, { label: 'Completed' }]);
    else if (filterStatus === 3) this.studentBreadcrumb.setBreadcrumb([base, { label: 'Wishlisted' }]);
    else this.studentBreadcrumb.setBreadcrumb([base]);
  }

  fetchCourses(): void {
    // debugger
    let obj = {
      'Filter.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    }
    console.log(obj);
    this.subscription.add(this.appService.getCourses(obj)
      .subscribe(
        response => {
          this.courseList = response.results;
          this.course = this.courseList;//.filter(x => x.courseProgress?.progressStatusCodeId == this.inProgressStatus);
          // console.log(this.course);
          this.count = response.totalNumberOfRecords;
          this.totalPageCount = Math.ceil(this.count/this.tableSize);
          this.setPages();
        },
        error => {
          console.log(error);
        }));
  }

  gadata:any;
  wishlistedgadata:any;
  fetchEnrolledCourses(isCompleted:boolean=false): void {
    // debugger
    let obj = {
      'Filter.Title': this.searchTitle,
      'Filter.IsCompleted': isCompleted,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      // pageSize: this.tableSize,
      pageNumber: this.page,
    }
    console.log(obj);
    this.subscription.add(this.appService.getEnrolledCourses(obj)
      .subscribe(
        response => {
          this.courseList = response.results;
          this.course = this.courseList;
          this.count = response.totalNumberOfRecords;
          var pageSize = response.pageSize;
          this.totalPageCount = Math.ceil(this.count / pageSize);
          this.setPages();
          if (this.redirectUrl === 'student') {
            if (isCompleted) this.statsCompleted = response.totalNumberOfRecords ?? 0;
            else this.statsInProgress = response.totalNumberOfRecords ?? 0;
            this.statsEnrolled = this.statsInProgress + this.statsCompleted;
          }
          this.gadata = this.course.map(x => ({
            ...x,
            bgColor: this.getRandomColor()
          }));
        },
        error => {
          console.log(error);
        }));
  }
  getRandomColor() {
    const array = [
      "#CAF1DE",
      "#E1F8DC",
      "#FEF8DD",
      "#FFE7C7",
      "#F7D8BA",
      "#ACDDDE",
      "#FFFFFF",
      "#F2F2F2",
    ]

    // const randomIndex1 = Math.floor(Math.random() * array.length);
    // const randomIndex2 = Math.floor(Math.random() * array.length);
    // const randomIndex3 = Math.floor(Math.random() * array.length);

    // const color1 = array[randomIndex1];
    // const color2 = array[randomIndex2];
    // const color3 = array[randomIndex3];

    // return `background-image: linear-gradient(to bottom right, ${color1}, ${color2}, ${color3})`;

    let randomColor = array[Math.floor(Math.random() * array.length)];
    return randomColor;
    // var color = Math.floor(0x1000000 * Math.random()).toString(16);
    // var color1 = Math.floor(0x1000000 * Math.random()).toString(16);
    // var color2 = Math.floor(0x1000000 * Math.random()).toString(16);
    // return "background-image: linear-gradient(to bottom right," + "#" + ("CAF1DE" + color).slice(-6) + ",#" + ("E1F8DC" + color1).slice(-6) + ",#" + ("FEF8DD" + color2).slice(-6) + ")";
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
  getFilterCourse(item) {
    this.isWishList = false;
    this.pageType = item;
    this.page = 1;
    if (item === 1) {
      this.fetchEnrolledCourses(false);
    } else if (item === 2) {
      this.fetchEnrolledCourses(true);
    }
  }
  courseProgress(item) {
    console.log(item);
  }

  /** Resume / continue course: set course and navigate to curriculum (used by CTA button). */
  fnResume(item: any): void {
    this.setCourse(item);
    this.router.navigate(['/app', this.redirectUrl, 'details', 'curriculum-list', item.id]);
  }

  setCourse(item) {
    // debugger
    let courseProgressID = '';

    localStorage.setItem('course', JSON.stringify(item));
    if (!item.courseProgress) {
      let date = new Date();
      var req = {
        usersCourseEnrollmentsId: item.courseEnrollmentsResponse.id,
        courseId: item.id,
        progressStatusCodeId: ProgressStatus.InProgress,
        startDateTime: date//"2022-04-02"//date.getFullYear() + '-' + date.getMonth() + '-' + date.getDay()
      }
      this.subscription.add(this.appService.addCourseProgress(req)
        .subscribe(
          response => {
            console.log(response);
            courseProgressID = response.id;
            sessionStorage.setItem('courseProgressID', response.id);
          },
          error => {
            console.log(error);
          }));
    } else {
      sessionStorage.setItem('courseProgressID', item.courseProgress.id);
      courseProgressID = item.courseProgress.id;
    }
    this._commonService.setCourseProgressDetails(courseProgressID, CurriculamStatus.Course, item.id);
  }
  getWishListCourse() {
    this.isWishList = true;
    this.pageType = 3;
    this.subscription.add(this.appService.getWishList()
      .subscribe(
        res => {
          // debugger
          this.course = res;
          console.log(res);

          this.wishlistedgadata = this.course.map(x => ({
            ...x,
            bgColor: this.getRandomColor()
        
          }));
        }
      ))
  }
  /** Trigger search: reset to page 1 and refetch with current searchTitle. */
  onSearch(): void {
    this.page = 1;
    if (this.role === Role.Trainer) {
      this.fetchCourses();
    } else if (this.role === Role.Student || this.role === Role.Company) {
      if (this.isWishList) {
        this.getWishListCourse();
      } else {
        this.fetchEnrolledCourses(this.pageType === 2);
      }
    }
  }

  fnFetchDataByPagination(number) {
    this.page = number;
    if (this.role == Role.Trainer) {
      this.fetchCourses();
    } else if (this.role == Role.Student || this.role == Role.Company) {
      this.fetchEnrolledCourses(this.pageType === 2);
    }
  }

  /** Stats for welcome banner (student only): updated when fetching enrolled lists. */
  statsEnrolled = 0;
  statsInProgress = 0;
  statsCompleted = 0;

  /** Display name for welcome message: firstName, userName, or email prefix; fallback 'Student'. */
  get userDisplayName(): string {
    const u = this.authService.currentUser();
    if (!u) return 'Student';
    const name = (u.firstName || u.userName || '').trim();
    if (name) return name;
    const email = (u.email || '').trim();
    if (email) return email.split('@')[0] || 'Student';
    return 'Student';
  }

  /** Progress % for a course (0–100). Uses testProgressResponse completed/total. */
  getProgressPercent(item: any): number {
    const r = item?.testProgressResponse;
    if (!r || !r.totalTask || r.totalTask === 0) return 0;
    return Math.min(100, Math.round((r.completedTask * 100) / r.totalTask));
  }

  /** SVG progress ring stroke-dashoffset (circumference = 2*π*16 ≈ 100.53). */
  getProgressRingOffset(item: any): number {
    const c = 2 * Math.PI * 16;
    return c * (1 - this.getProgressPercent(item) / 100);
  }

  /** Whether course category is API (orange) vs NDT (blue) for banner gradient. */
  isApiCategory(item: any): boolean {
    const name = (item?.category?.name || item?.course?.category?.name || '').toString().toUpperCase();
    return name.includes('API');
  }

  /** True when student has no courses to show in current tab (enrolled or wishlist). */
  get showEmptyState(): boolean {
    if (this.redirectUrl !== 'student') return false;
    if (this.isWishList) return !this.wishlistedgadata || this.wishlistedgadata.length === 0;
    return !this.gadata || this.gadata.length === 0;
  }

  // Pagination Logic
  pages: Observable<number>;
  setPages() {
    // this.pages = range(1, this.totalPageCount);
    // this.pages.subscribe(res=>{
    //   console.log(res,this.totalPageCount)
    // })
  }

  ngOnDestroy(): void {
    this.authService.commonCourse.next({isTrainer: true})
  }
}
