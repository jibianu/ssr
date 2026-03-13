import { Component, OnInit, OnDestroy, Inject, ChangeDetectorRef, DOCUMENT, ViewChild, TemplateRef } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RoutesRecognized } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { CookieService } from 'src/app/core/services/cookie.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { PublishCourseModalComponent } from 'src/app/shared/modals/publish-course/publish-course-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { SearchCoursesComponent } from 'src/app/shared/modals/search-courses/search-courses.component';
import { Role } from 'src/app/shared/models/role';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { ChangeProgressComponent } from 'src/app/shared/modals/change-progress/change-progress.component';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { UserManagemntMappingComponent } from 'src/app/shared/component/user-managemnt-mapping/user-managemnt-mapping.component';
import { RemoveFromManagementComponent } from 'src/app/shared/component/remove-from-management/remove-from-management.component';

/**
 * Course list shared by Admin and Management.
 * Layout: same common layout (shared navbar + sidebar). Behavior is permission-based:
 * - Admin: full list, Add Course, Filter, User Mapping (when permitted).
 * - Management: assigned courses only (CourseList permission), no Add Course in toolbar; User Mapping hidden.
 */
@Component({
  selector: 'app-course-list',
  templateUrl: './course-list.component.html',
  styleUrls: ['./course-list.component.scss'],
  standalone: false,
})
export class CourseListComponent implements OnInit, OnDestroy {
  sortDir = 1;
  course = [];
  page = 1;
  count = 0;
  tableSize = 50;
  searchTitle = '';
  tableSizes = [50, 100, 200, 500];
  subscription: Subscription = new Subscription();
  sortBy = 'Title';
  isAsc = true;
  currentUser: any;
  txtRoute: string;
  isPublish: boolean | null = null;
  showOnPublicListingFilter: boolean | null = null;
  categories: any;
  categoryID: any;
  AuthorList: any;
  AuthorID: any;
  createdDate: any;
  updatedDate: any;
  searchTags: Array<any> = [];
  courseForm: UntypedFormGroup;
  modalReference: NgbModalRef;
  managerListEnbale = false;
  publishAllToPublicInProgress = false;
  @ViewChild('cContent') cContentRef: TemplateRef<any>;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private modalService: NgbModal,
    private fb: UntypedFormBuilder,
    private toasterService: ToasterService,
    private cd: ChangeDetectorRef,
    private cookieService: CookieService,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(DOCUMENT) private document: Document
  ) {
  }

  get isManagementContext(): boolean {
    return this.router?.url?.includes('/management/') ?? false;
  }

  ngOnInit(): void {
    if (!this.isManagementContext) {
      this.sharedService.showCourseListToolbar.next(true);
    }
    this.sharedService.certificateName.next('Course List');
    // let routeData = this.route.snapshot.data['roles'];
    this.courseFormInit();
    this.fetchCategories();
    this.fetchAuthors();
    let routeData = this.document.location.href.includes('management');
    this.subscription.add(
      this.appService.GetPermissionByAction('Users.GetManagement')
        .subscribe(res => {
          this.managerListEnbale = res;
          this.updateUserMappingVisibility();
        })
    );
    this.subscription.add(
      this.sharedService.userMappingClick$.subscribe(() => this.addToUserMagt())
    );
    if (!this.isManagementContext) {
      this.subscription.add(
        this.sharedService.courseListSearchTerm$.subscribe((value) => {
          this.searchTitle = value;
        })
      );
      this.subscription.add(
        this.sharedService.courseListSearchTrigger$.subscribe(() => this.onSearch())
      );
      this.subscription.add(
        this.sharedService.courseListFilterClick$.subscribe(() => this.searchFilter())
      );
      this.subscription.add(
        this.sharedService.courseListAddCourseClick$.subscribe(() => {
          if (this.cContentRef) this.addCourse(this.cContentRef);
        })
      );
    }
    this.fetchCourses();
    if (routeData) {
      this.txtRoute = 'management';
    } else {
      this.txtRoute = 'admin';
    }
  }

  private updateUserMappingVisibility(): void {
    this.sharedService.showUserMappingButton.next(
      !!this.managerListEnbale && this.course.length > 0 && !this.isManagementContext
    );
  }

  fetchCourses(): void {
    let obj: any = {
      'Filter.Title': this.searchTitle || '',
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page
    };
    // Send as strings so false is not stripped from query params (Angular can omit falsy values)
    if (this.isPublish !== null && this.isPublish !== undefined) {
      obj['Filter.IsPublished'] = this.isPublish === true ? 'true' : 'false';
    }
    if (this.showOnPublicListingFilter !== null && this.showOnPublicListingFilter !== undefined) {
      obj['Filter.ShowOnPublicListing'] = this.showOnPublicListingFilter === true ? 'true' : 'false';
    }
    if (this.categoryID) {
      obj['Filter.CategoryId'] = this.categoryID
    }
    if (this.AuthorID) {
      obj['Filter.AuthorId'] = this.AuthorID
    }
    if (this.createdDate) {
      obj['Filter.CreatedDate'] = this.createdDate.month + '/' +
        this.createdDate.day + '/' + this.createdDate.year
    }
    if (this.updatedDate) {
      obj['Filter.UpdatedDate'] = this.updatedDate.month + '/' +
        this.updatedDate.day + '/' + this.updatedDate.year
    }
    if (this.isManagementContext) {
      this.subscription.add(this.appService.getAssignedCoursesForManagement(obj).subscribe({
        next: response => {
          this.course = response?.results || [];
          this.course.forEach((x) => {
            this.getAllPricesByCourseId(x.id, (price) => { x.price = price; });
          });
          this.count = response?.totalNumberOfRecords ?? 0;
          this.updateUserMappingVisibility();
        },
        error: err => {
          this.course = [];
          this.count = 0;
          const msg = err?.error?.message || err?.message || err?.statusText || 'Failed to load courses';
          if (err?.status !== 401) console.error('[Course List] API error:', err?.status, msg, err?.error);
          this.updateUserMappingVisibility();
        }
      }));
      return;
    }
    this.subscription.add(this.appService.GetPermissionByAction('Course.GetCourses')
    .subscribe(res=>{
      this.subscription.add(this.appService.getCourses(obj,res)
        .subscribe({
          next: response => {
            this.course = response?.results || [];
            this.course.forEach((x) => {
              this.getAllPricesByCourseId(x.id, (price) => { x.price = price; });
            });
            this.count = response?.totalNumberOfRecords ?? 0;
            this.updateUserMappingVisibility();
          },
          error: err => {
            this.course = [];
            this.count = 0;
            const msg = err?.error?.message || err?.message || err?.statusText || 'Failed to load courses';
            console.error('[Course List] API error:', err?.status, msg, err?.error);
            this.toasterService.showError(typeof msg === 'string' ? msg : 'Failed to load courses');
            this.updateUserMappingVisibility();
          }
        }));
    }));
  }

  addToUserMagt() {
    const modalRef = this.modalService.open(UserManagemntMappingComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.users = [];
    modalRef.componentInstance.sourceRole = 'course';
    modalRef.result.then(() => this.fetchCourses()).catch(() => {});
  }

  openRemoveFromManagement(item) {
    const modalRef = this.modalService.open(RemoveFromManagementComponent);
    modalRef.componentInstance.trainerId = item.id;
    modalRef.componentInstance.trainerName = item.title;
    modalRef.componentInstance.entityType = 'course';
    modalRef.result.then(() => this.fetchCourses()).catch(() => {});
  }

  pageChanged(event: number) {
    this.page = event;
    this.fetchCourses();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchCourses();
  }

  deleteCourse(id: any) {
    this.open(id);
  }

  open(id: any) {
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
    this.searchTitle = word;
    if (word === '') {
      this.page = 1;
      this.fetchCourses();
    }
  }

  onSearch(): void {
    this.page = 1;
    this.fetchCourses();
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
    this.sharedService.certificateName.next('');
    this.sharedService.showUserMappingButton.next(false);
    this.sharedService.showCourseListToolbar.next(false);
    this.sharedService.courseListSearchTerm$.next('');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  openPublishUnpublishModal(item: { id: string; title?: string; slug?: string; isPublished?: boolean; showOnPublicListing?: boolean | null }) {
    const modalRef = this.modalService.open(PublishCourseModalComponent);
    modalRef.componentInstance.courseId = item.id;
    modalRef.componentInstance.courseTitle = item.title || '';
    modalRef.componentInstance.slug = item.slug || '';
    modalRef.componentInstance.isPublished = !!item.isPublished;
    // Support both camelCase (API) and PascalCase in case response varies
    const showOnPublic = item.showOnPublicListing ?? (item as { ShowOnPublicListing?: boolean | null }).ShowOnPublicListing;
    modalRef.componentInstance.showOnPublicListing = showOnPublic;
    modalRef.componentInstance.initCheckboxes(); // reflect already-published state so checkboxes are marked
    modalRef.result.then((result) => {
      if (result === 'updated') {
        this.toasterService.showSuccess('Course visibility updated.');
        this.fetchCourses();
      }
    }, () => {});
  }

  publishAllToPublic(): void {
    if (this.publishAllToPublicInProgress) return;
    this.publishAllToPublicInProgress = true;
    this.cd.markForCheck();
    this.appService.setShowOnPublicForAllPublished().subscribe({
      next: (res) => {
        this.publishAllToPublicInProgress = false;
        this.cd.markForCheck();
        const count = res?.updatedCount ?? 0;
        this.toasterService.showSuccess(count > 0 ? `${count} course(s) are now visible on the Public site.` : 'No courses needed updating.');
        if (count > 0) this.fetchCourses();
      },
      error: () => {
        this.publishAllToPublicInProgress = false;
        this.cd.markForCheck();
        this.toasterService.showError('Failed to update. Try again.');
      }
    });
  }

  getCourseData(isPublish: boolean) {
    this.isPublish = isPublish;
    this.showOnPublicListingFilter = null; // quick filter is LMS-only
    this.fetchCourses();
  }
  fetchCategories() {
    this.subscription.add(this.appService.getCategories()
      .subscribe(
        response => {
          this.categories = response;
          if(this.categories){
            this.sortArr('name');
          }
        },
        error => {
          console.log(error);
        }));
  }
  sortArr(colName: any) {
    if (!Array.isArray(this.categories)) return;
    this.categories.sort((a: any, b: any) => {
      const aVal = (a && a[colName] != null) ? String(a[colName]).toLowerCase() : '';
      const bVal = (b && b[colName] != null) ? String(b[colName]).toLowerCase() : '';
      if (aVal < bVal) return -1 * this.sortDir;
      if (aVal > bVal) return 1 * this.sortDir;
      return 0;
    });
  }

  /** Sort author/management list by name (used after fetch). */
  sortAuthorListByName() {
    if (!Array.isArray(this.AuthorList)) return;
    this.AuthorList.sort((a: any, b: any) => {
      const aVal = (a && a.name != null) ? String(a.name).toLowerCase() : '';
      const bVal = (b && b.name != null) ? String(b.name).toLowerCase() : '';
      return aVal.localeCompare(bVal);
    });
  }

  fetchAuthors() {
    this.AuthorList = [];
    this.subscription.add(this.appService.GetPermissionByAction('Users.GetTrainers')
    .subscribe(res => {
      this.subscription.add(this.appService.getAuthor(res, 'pageSize=100')
        .subscribe(
          response => {
            this.AuthorList.push(...(response?.results || []));
            this.sortAuthorListByName();
          },
          error => {
            console.log(error);
          }));
    }));
    this.subscription.add(this.appService.GetPermissionByAction('Users.GetManagement')
    .subscribe(res => {
      this.subscription.add(this.appService.getManagement(res)
        .subscribe(
          response => {
            this.AuthorList.push(...(response?.results || []));
            this.sortAuthorListByName();
          },
          error => {
            console.log(error);
          }));
    }));
  }
  /** Map current course list filter to modal publish filter type so search panel shows correct state. */
  private getCurrentPublishFilter(): 'all' | 'published-lms' | 'published-public' | 'unpublished-lms' | 'unpublished-public' {
    if (this.isPublish === false && this.showOnPublicListingFilter === null) return 'unpublished-lms';
    if (this.isPublish === true && this.showOnPublicListingFilter === false) return 'unpublished-public';
    if (this.isPublish === true && this.showOnPublicListingFilter === null) return 'published-lms';
    if (this.isPublish === null && this.showOnPublicListingFilter === true) return 'published-public';
    return 'all';
  }

  searchFilter() {
    const modalRef = this.modalService.open(SearchCoursesComponent, {
      windowClass: 'modal-right search-filter-sidebar',
      scrollable: true,
      backdrop: true,
      keyboard: true
    });
    modalRef.componentInstance.categories = this.categories;
    modalRef.componentInstance.AuthorList = this.AuthorList;
    modalRef.componentInstance.initialPublishFilter = this.getCurrentPublishFilter();
    modalRef.componentInstance.initialCategoryId = this.categoryID ?? null;
    modalRef.componentInstance.initialCategoryName = this.categories?.find((c: any) => c.id === this.categoryID)?.name ?? null;
    modalRef.componentInstance.initialAuthorId = this.AuthorID ?? null;
    modalRef.componentInstance.initialAuthorName = this.AuthorList?.find((a: any) => a.id === this.AuthorID)?.email ?? null;
    modalRef.componentInstance.initialCreatedDate = this.createdDate ?? null;
    modalRef.componentInstance.initialUpdatedDate = this.updatedDate ?? null;
    modalRef.result.then((result) => {
      this.bindTagAndSearchData(result);
    }, () => {});
  }
  bindTagAndSearchData(result: { isPublish?: boolean | null; showOnPublicListing?: boolean | null; categoryID: any; authorID: any; createdDate: any; updatedDate: any; publish: any; categoryName: any; authorName: any; }) {
    this.isPublish = result.isPublish ?? null;
    this.showOnPublicListingFilter = result.showOnPublicListing ?? null;
    this.categoryID = result.categoryID;
    this.AuthorID = result.authorID;
    this.createdDate = result.createdDate;
    this.updatedDate = result.updatedDate;
    this.searchTags = [];
    this.page = 1;
    if (result.publish) {
      this.searchTags.push({ value: result.publish, searchBy: 'publish' });
    }
    if (result.categoryName) {
      let item = {
        value: result.categoryName,
        searchBy: 'categoryName'
      }
      this.searchTags.push(item);
    }
    if (result.authorName) {
      let item = {
        value: result.authorName,
        searchBy: 'authorName'
      }
      this.searchTags.push(item);
    }
    if (result.createdDate) {
      let date = this.createdDate.month + '/' +
        this.createdDate.day + '/' + this.createdDate.year;
      let item = {
        value: date,
        searchBy: 'createdDate'
      }
      this.searchTags.push(item);
    }
    if (result.updatedDate) {
      let date = this.updatedDate.month + '/' +
        this.updatedDate.day + '/' + this.updatedDate.year;
      let item = {
        value: date,
        searchBy: 'updatedDate'
      }
      this.searchTags.push(item);
    }
    this.fetchCourses();
    this.cd.detectChanges();
  }
  onTagRemoved(item: { searchBy: string; }) {
    if (item.searchBy == 'publish') {
      this.isPublish = null;
      this.showOnPublicListingFilter = null;
    } else if (item.searchBy == 'categoryName') {
      this.categoryID = null;
    } else if (item.searchBy == 'authorName') {
      this.AuthorID = null;
    } else if (item.searchBy == 'createdDate') {
      this.createdDate = null;
    } else if (item.searchBy == 'updatedDate') {
      this.updatedDate = null;
    }
    this.fetchCourses();
  }
  changeProgress(id:string,progress:number){
    const modalRef =this.modalService.open(ChangeProgressComponent);
    modalRef.componentInstance.selectedProgress=progress??0;
    modalRef.result.then(x=>{
      if(x!=null){
        this.appService.updateProgress(id,x).subscribe(y=>{
          this.course.map(z=>{
            if(z.id==id){
              z["courseCreationProgress"]=x;
              if(x==100){
                z["isCompleted"]=true;
              }else{
                z["isCompleted"]=false;
              }
            }
          })
        });

      }
    })
  }
  priceVal = 0;
  getAllPricesByCourseId(id, callback) {
    this.appService.getCoursePrices(id).subscribe({
      next: (res: any) => {
        const price = res?.[0]?.discountedPrice ?? 0;
        callback(price);
      },
      error: () => callback(0)
    });
  }
  courseFormInit() {
    this.courseForm = this.fb.group({
      title: ['', Validators.required],
      imageLink: [''],
      description: ['', Validators.required],
      categoryId: ['', Validators.required],
    })
  }

  get courseF() { return this.courseForm.controls; }
  addCourse(content: any): void {
    this.modalReference = this.modalService.open(content, {
      size: 'lg',
      scrollable: true,
      windowClass: 'modal-right create-course-modal',
      backdrop: 'static',
      keyboard: false
    });
  }

  createCourse(): void {
    if (this.courseForm.invalid) {
      return;
    }else{
      this.subscription.add(this.appService.addCourse(this.courseForm.value).subscribe((res: any) => {
        this.toasterService.showSuccess('Course created successfully');
        this.modalReference.close();
        this.fetchCourses();
        const newCourseId = res?.id || res?.Id;
        if (newCourseId) {
          this.router.navigate(['/app', this.txtRoute, 'course', 'curriculum', 'list', newCourseId], {
            queryParams: { addCurriculum: 'true' }
          });
        }
      }));
    }
  }

  trackByCourseId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
  trackBySize(_index: number, size: number): number {
    return size;
  }
  trackByCategoryId(_index: number, item: { id?: string }): string {
    return item?.id ?? `${_index}`;
  }
}
