import { ConfirmationModalComponent } from './../../../shared/component/confirmation-modal/confirmation-modal.component';
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { ChangeProgressComponent } from 'src/app/shared/modals/change-progress/change-progress.component';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CategoryCacheService } from 'src/app/shared/service/category-cache.service';

@Component({
  selector: 'app-trainer-dashboard',
  templateUrl: './trainer-dashboard.component.html',
  styleUrls: ['./trainer-dashboard.component.scss'],
  standalone: false,
})
export class TrainerDashboardComponent implements OnInit, OnDestroy {
  course: unknown[] = [];
  page = 1;
  count: number | undefined;
  tableSize = 20;
  searchTitle = '';
  tableSizes = [5, 10, 20, 25, 50];
  private readonly subscription = new Subscription();
  private courseFetchSub: Subscription | null = null;
  sortBy = 'Title';
  isAsc = true;
  currentUser: unknown;
  modalRef: unknown;
  courseForm: UntypedFormGroup;
  modalReference: NgbModalRef;
  submitted = false;
  /** True while courses are loading; ensures we never show empty state during load. */
  loading = true;
  readonly txtRoute = 'trainer';
  /** True when on Assigned course page (course/list) – show enrolled courses and read-only UI. */
  isAssignedView = false;

  /** Trainer: has Course content permission (show Add New Course in empty state). */
  hasCoursePermission = false;
  /** Trainer: has pending Course permission request (show waiting for approval in empty state). */
  hasPendingCourseRequest = false;

  /** Total pages for simple pagination (same design as My Courses). */
  get totalPageCount(): number {
    if (this.count == null || this.tableSize <= 0) return 0;
    return Math.ceil(this.count / this.tableSize);
  }

  /** Category name for card badge (API vs NDT style). */
  isApiCategory(item: { category?: { name?: string } }): boolean {
    const name = (item?.category?.name || '').toString().toUpperCase();
    return name.includes('API');
  }

  @ViewChild('cContent') cContentRef: TemplateRef<unknown>;

  constructor(
    private readonly appService: AdminAppService,
    private readonly modalService: NgbModal,
    private readonly toasterService: ToasterService,
    private readonly cookieService: CookieService,
    private readonly router: Router,
    private readonly sharedService: SharedService,
    private readonly fb: UntypedFormBuilder,
    private readonly categoryCache: CategoryCacheService
  ) {}

  /** Categories from cache; loaded only when Add Course is opened. */
  get categories$() { return this.categoryCache.categories$; }

  get courseF() { return this.courseForm?.controls; }

  ngOnInit(): void {
    this.courseFormInit();
    this.sharedService.certificateName.next('Instructor Dashboard');
    this.updateAssignedViewFromUrl();
    this.sharedService.showTrainerDashboardToolbar.next(!this.isAssignedView);
    this.subscription.add(
      this.sharedService.trainerAddCourseClick$.subscribe(() => {
        if (this.cContentRef) this.addCourse(this.cContentRef);
      })
    );
    this.subscription.add(
      this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
        this.updateAssignedViewFromUrl();
        this.sharedService.showTrainerDashboardToolbar.next(!this.isAssignedView);
        this.fetchCourses();
      })
    );
    this.fetchCourses();
    this.appService.getMyContentPermissions().subscribe({
      next: (list) => {
        const perms = Array.isArray(list) ? list : [];
        this.hasCoursePermission = perms.some((p: string) => (p || '').toLowerCase() === 'course');
      },
      error: () => { this.hasCoursePermission = false; }
    });
    this.appService.getMyPendingPermissionRequests().subscribe({
      next: (list) => {
        const arr = Array.isArray(list) ? list : [];
        this.hasPendingCourseRequest = arr.some((r: { contentType?: string }) => (r?.contentType || '').toLowerCase() === 'course');
      },
      error: () => { this.hasPendingCourseRequest = false; }
    });
  }

  private updateAssignedViewFromUrl(): void {
    this.isAssignedView = this.router.url.includes('course/list');
  }

  courseFormInit(): void {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      imageLink: [''],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
    });
  }

  /** Load categories only when Add Course modal opens; uses cache so we don't call API again. */
  private loadCategoriesForModal(): void {
    this.subscription.add(
      this.categoryCache.loadCategories().subscribe({
        error: () => this.toasterService.showError('Failed to load categories'),
      })
    );
  }

  addCourse(content: unknown): void {
    this.submitted = false;
    this.loadCategoriesForModal();
    this.modalReference = this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      windowClass: 'modal-right create-course-modal',
      backdrop: 'static',
      keyboard: false,
    });
  }

  createCourse(): void {
    this.submitted = true;
    if (this.courseForm.invalid) return;
    this.subscription.add(
      this.appService.addCourse(this.courseForm.value).subscribe({
        next: (res: any) => {
          this.toasterService.showSuccess('Course created successfully');
          this.modalReference.close();
          this.fetchCourses();
          const newCourseId = res?.id || res?.Id;
          if (newCourseId) {
            this.router.navigate(['/app', this.txtRoute, 'course', 'curriculum', 'list', newCourseId], {
              queryParams: { addCurriculum: 'true' },
            });
          }
        },
        error: (err: { error?: { message?: string; Message?: string } }) => {
          const msg =
            err?.error?.message ?? err?.error?.Message ?? 'Something went wrong';
          this.toasterService.showError(msg);
        },
      })
    );
  }

  trackByCategoryId(index: number, item: { id?: string }): string {
    return item?.id ?? `cat-${index}`;
  }

  fetchCourses(): void {
    if (this.courseFetchSub) {
      this.courseFetchSub.unsubscribe();
      this.courseFetchSub = null;
    }
    this.loading = true;
    const params = {
      'Filters.Title': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    };
    const req$ = this.isAssignedView
      ? this.appService.getEnrolledCourses(params)
      : this.appService.getCourses(params);
    this.courseFetchSub = req$.subscribe({
      next: (response) => {
        this.course = response?.results ?? [];
        this.count = response?.totalNumberOfRecords;
        this.loading = false;
        this.courseFetchSub = null;
      },
      error: () => {
        this.loading = false;
        this.courseFetchSub = null;
        this.toasterService.showError('Failed to load courses');
      },
    });
    this.subscription.add(this.courseFetchSub);
  }

  pageChanged(event: number) {
    this.page = event;
    this.fetchCourses();
  }

  /** Navigate to course details (Manage course). */
  goToPage(num: number): void {
    if (num < 1 || num > this.totalPageCount) return;
    this.page = num;
    this.fetchCourses();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
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
  changeProgress(id: string, progress: number): void {
    const modalRef = this.modalService.open(ChangeProgressComponent);
    modalRef.componentInstance.selectedProgress = progress ?? 0;
    modalRef.result.then((x: number | null) => {
      if (x != null) {
        this.appService.updateProgress(id, x).subscribe({
          next: () => {
            this.toasterService.showSuccess('Progress updated');
            this.course.forEach((z: Record<string, unknown>) => {
              if (z['id'] === id) {
                z['courseCreationProgress'] = x;
                z['isCompleted'] = x === 100;
              }
            });
          },
          error: () => this.toasterService.showError('Failed to update progress'),
        });
      }
    }).catch(() => {});
  }
  /** Open course in course-details (same as openCourseDetails; curriculum-list page not used for trainer). */
  coursePreview(id: string) {
    this.router.navigate(['/app/trainer/course-details', id]);
  }

  /** Open course details. For assigned (enrolled) courses, view-only; for my courses, editable. */
  openCourseDetails(item: { id?: string; courseEnrollmentsResponse?: { canEdit?: boolean } }): void {
    const canEdit = this.isAssignedView ? false : (item?.courseEnrollmentsResponse?.canEdit ?? true);
    this.router.navigate(['/app/trainer/course-details', item?.id], { state: { canEdit } });
  }

  trackByCourseId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }

  /** Show "Published" only when admin has published the course (IsPublished). Otherwise status 2 = "Approved". */
  getCourseStatusLabel(item: { status?: number; Status?: number; isPublished?: boolean; IsPublished?: boolean } | null): string {
    if (!item) return 'Draft';
    const status = Number(item.status ?? item.Status ?? 0);
    const isPublished = item.isPublished === true || item.IsPublished === true;
    if (isPublished) return 'Published';
    switch (status) {
      case 0: return 'Draft';
      case 1: return 'Pending Review';
      case 2: return 'Approved';
      case 3: return 'Rejected';
      default: return 'Draft';
    }
  }

  getCourseStatusClass(item: { status?: number; Status?: number; isPublished?: boolean; IsPublished?: boolean } | null): string {
    if (!item) return 'draft';
    const status = Number(item.status ?? item.Status ?? 0);
    const isPublished = item.isPublished === true || item.IsPublished === true;
    if (isPublished) return 'published';
    switch (status) {
      case 0: return 'draft';
      case 1: return 'pending';
      case 2: return 'approved';
      case 3: return 'rejected';
      default: return 'draft';
    }
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sharedService.showTrainerDashboardToolbar.next(false);
    if (this.courseFetchSub) {
      this.courseFetchSub.unsubscribe();
    }
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
