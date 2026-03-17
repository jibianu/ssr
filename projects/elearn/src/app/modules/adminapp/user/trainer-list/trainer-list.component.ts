import { UserManagemntMappingComponent } from 'src/app/shared/component/user-managemnt-mapping/user-managemnt-mapping.component';
import { RemoveFromManagementComponent } from 'src/app/shared/component/remove-from-management/remove-from-management.component';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { TrainerListFilterComponent } from 'src/app/shared/modals/trainer-list-filter/trainer-list-filter.component';
import { Role } from 'src/app/shared/models/role';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';

@Component({
    selector: 'app-trainer-list',
    templateUrl: './trainer-list.component.html',
    styleUrls: ['./trainer-list.component.scss'],
    standalone: false
})
export class TrainerListComponent implements OnInit, OnDestroy {

  users = [];
  page = 1;
  count: number;
  tableSize = 20;
  searchTitle = '';
  filterCreatedFrom = '';
  filterCreatedTo = '';
  filterLastLoginFrom = '';
  filterLastLoginTo = '';
  filterHasCoursePermission = false;
  filterHasEventPermission = false;
  filterHasBlogPermission = false;
  /** true = has pending request, false = no pending request, null = any */
  filterHasPendingPermissionRequest: boolean | null = null;
  filterPendingPermissionContentType = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  role:Role;
  checkedAll=false;
  managerListEnbale=false;
  /** Pending permission requests (shown on Trainer List when admin context). */
  permissionRequests: any[] = [];
  permissionRequestsLoading = false;
  permissionRequestsError = '';
  permissionRequestActionLoading: Record<string, boolean> = {};

  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private sharedService: SharedService
  ) { }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Trainer List');
    this.activatedRoute.data.subscribe(res=>{
      if(res && res.roles){
        var d=res.roles[0]
        this.role=d;
      }
    });

    if (!this.isManagementContext) {
      this.sharedService.showTrainerListToolbar.next(true);
      this.sharedService.trainerListSearchTerm$.next(this.searchTitle);
      this.subscription.add(
        this.sharedService.trainerListSearchTerm$.subscribe((value) => {
          this.searchTitle = value ?? '';
        })
      );
      this.subscription.add(
        this.sharedService.trainerListSearchTrigger$.subscribe(() => this.applyFilters())
      );
      this.subscription.add(
        this.sharedService.trainerListFilterClick$.subscribe(() => this.openFilterModal())
      );
    }

    this.fetchTrainers();
    if (!this.isManagementContext) this.loadPermissionRequests();
    this.subscription.add(
      this.appService.GetPermissionByAction('Users.GetManagement')
      .subscribe(res=>{
        this.managerListEnbale=res;
        this.updateUserMappingVisibility();
      })
    );
    this.subscription.add(
      this.sharedService.userMappingClick$.subscribe(() => this.addToUserMagt())
    );
  }

  openFilterModal(): void {
    const modalRef = this.modalService.open(TrainerListFilterComponent, {
      windowClass: 'modal-right search-filter-sidebar',
      scrollable: true,
      backdrop: true,
      keyboard: true,
    });
    modalRef.componentInstance.initialCreatedOnFrom = this.filterCreatedFrom;
    modalRef.componentInstance.initialCreatedOnTo = this.filterCreatedTo;
    modalRef.componentInstance.initialLastLoginFrom = this.filterLastLoginFrom;
    modalRef.componentInstance.initialLastLoginTo = this.filterLastLoginTo;
    modalRef.componentInstance.initialHasCoursePermission = this.filterHasCoursePermission;
    modalRef.componentInstance.initialHasEventPermission = this.filterHasEventPermission;
    modalRef.componentInstance.initialHasBlogPermission = this.filterHasBlogPermission;
    modalRef.componentInstance.initialHasPendingPermissionRequest = this.filterHasPendingPermissionRequest;
    modalRef.componentInstance.initialPendingPermissionContentType = this.filterPendingPermissionContentType;
    modalRef.result.then(
      (result: {
        createdOnFrom: string;
        createdOnTo: string;
        lastLoginFrom: string;
        lastLoginTo: string;
        hasCoursePermission?: boolean;
        hasEventPermission?: boolean;
        hasBlogPermission?: boolean;
        hasPendingPermissionRequest?: boolean | null;
        pendingPermissionContentType?: string;
      }) => {
        this.filterCreatedFrom = result?.createdOnFrom ?? '';
        this.filterCreatedTo = result?.createdOnTo ?? '';
        this.filterLastLoginFrom = result?.lastLoginFrom ?? '';
        this.filterLastLoginTo = result?.lastLoginTo ?? '';
        this.filterHasCoursePermission = result?.hasCoursePermission ?? false;
        this.filterHasEventPermission = result?.hasEventPermission ?? false;
        this.filterHasBlogPermission = result?.hasBlogPermission ?? false;
        this.filterHasPendingPermissionRequest = result?.hasPendingPermissionRequest ?? null;
        this.filterPendingPermissionContentType = result?.pendingPermissionContentType ?? '';
        this.page = 1;
        this.fetchTrainers();
      },
      () => {}
    );
  }

  private updateUserMappingVisibility(): void {
    this.sharedService.showUserMappingButton.next(
      !!this.managerListEnbale && this.users.length > 0 && !this.isManagementContext
    );
  }

  get isManagementContext(): boolean {
    return this.router?.url?.includes('/management/') ?? false;
  }

  fetchTrainers(): void {
    const obj: any = {
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    };
    if (this.searchTitle?.trim()) obj['Filter.Search'] = this.searchTitle.trim();
    if (this.filterCreatedFrom) obj['Filter.CreatedOnFrom'] = this.filterCreatedFrom;
    if (this.filterCreatedTo) obj['Filter.CreatedOnTo'] = this.filterCreatedTo;
    if (this.filterLastLoginFrom) obj['Filter.LastLoggedInFrom'] = this.filterLastLoginFrom;
    if (this.filterLastLoginTo) obj['Filter.LastLoggedInTo'] = this.filterLastLoginTo;
    if (this.filterHasCoursePermission) obj['Filter.HasCoursePermission'] = 'true';
    if (this.filterHasEventPermission) obj['Filter.HasEventPermission'] = 'true';
    if (this.filterHasBlogPermission) obj['Filter.HasBlogPermission'] = 'true';
    if (this.filterHasPendingPermissionRequest !== null && this.filterHasPendingPermissionRequest !== undefined) {
      obj['Filter.HasPendingPermissionRequest'] = this.filterHasPendingPermissionRequest ? 'true' : 'false';
      if (this.filterHasPendingPermissionRequest && this.filterPendingPermissionContentType?.trim()) {
        obj['Filter.PendingPermissionContentType'] = this.filterPendingPermissionContentType.trim();
      }
    }
    const apiCall = this.isManagementContext
      ? this.appService.getAssignedTrainersForManagement(obj)
      : this.appService.GetPermissionByAction('Users.GetTrainers').pipe(
          switchMap((res: boolean) => this.appService.getTrainers(obj, res))
        );
    this.subscription.add(apiCall.subscribe({
      next: (response: any) => {
        this.users = response?.results || [];
        this.count = response?.totalNumberOfRecords ?? 0;
        this.updateUserMappingVisibility();
      },
      error: (err) => {
        this.users = [];
        this.count = 0;
        if (err?.status !== 401) console.log(err);
        this.updateUserMappingVisibility();
      }
    }));
  }

  pageChanged(event) {
    this.page = event;
    this.fetchTrainers();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchTrainers();
  }

  deleteUser(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Trainer Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteUserById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Trainer deleted successfully');
              this.page = 1;
              this.fetchTrainers();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  applyFilters(): void {
    this.page = 1;
    this.fetchTrainers();
  }

  clearFilters(): void {
    this.searchTitle = '';
    this.filterCreatedFrom = '';
    this.filterCreatedTo = '';
    this.filterLastLoginFrom = '';
    this.filterLastLoginTo = '';
    this.page = 1;
    this.fetchTrainers();
  }

  sortByHeading(value: string) {
      this.sortBy = value;
      if (this.isAsc) {
        this.isAsc = false;
      } else {
        this.isAsc = true;
      }
      this.fetchTrainers();
  }

  openPermisionModal(item) {
    const modalRef = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.userId = item.id;
    modalRef.componentInstance.role = this.role;
  }

  openCourseModal(item) {
    const modalRef = this.modalService.open(StudentCourseListComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.userID = item.id;
    modalRef.componentInstance.name = (item.firstName || '') + ' ' + (item.lastName || '');
    modalRef.componentInstance.email = item.email;
    modalRef.componentInstance.showNoOfUserField = false;
    modalRef.componentInstance.showViewEditPermissions = true;
  }

  openStudentInfo(item) {
    const modalRef = this.modalService.open(UserInfoComponent, { windowClass: 'modal-right', size: 'lg' });
    modalRef.componentInstance.userID = item.id;
    modalRef.componentInstance.name = item?.userName ?? '';
    modalRef.componentInstance.email = item?.email ?? '';
    const pending = this.getPendingRequestsForTrainer(item?.id);
    modalRef.componentInstance.pendingRequests = pending?.length ? [...pending] : [];
    modalRef.result.then(() => this.loadPermissionRequests()).catch(() => {});
  }

  loadPermissionRequests(): void {
    if (this.isManagementContext) return;
    this.permissionRequestsLoading = true;
    this.permissionRequestsError = '';
    this.appService.getContentPermissionRequests(0).subscribe({
      next: (res) => {
        this.permissionRequests = this.normalizeListResponse(res);
        this.permissionRequestsLoading = false;
      },
      error: (err) => {
        this.permissionRequestsError = err?.error?.message ?? err?.message ?? '';
        this.permissionRequests = [];
        this.permissionRequestsLoading = false;
      },
    });
  }

  private normalizeListResponse(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.data)) return res.data;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  approvePermissionRequest(id: string): void {
    if (this.permissionRequestActionLoading[id]) return;
    this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: true };
    this.appService.approveContentPermissionRequest(id).subscribe({
      next: (res) => {
        this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: false };
        this.toasterService.showSuccess(res?.message ?? 'Approved.');
        this.loadPermissionRequests();
      },
      error: (err) => {
        this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: false };
        this.toasterService.showError(err?.error?.message ?? err?.message ?? 'Approve failed.');
      },
    });
  }

  rejectPermissionRequest(id: string): void {
    if (this.permissionRequestActionLoading[id]) return;
    this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: true };
    this.appService.rejectContentPermissionRequest(id).subscribe({
      next: (res) => {
        this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: false };
        this.toasterService.showSuccess(res?.message ?? 'Rejected.');
        this.loadPermissionRequests();
      },
      error: (err) => {
        this.permissionRequestActionLoading = { ...this.permissionRequestActionLoading, [id]: false };
        this.toasterService.showError(err?.error?.message ?? err?.message ?? 'Reject failed.');
      },
    });
  }

  openPermissionsPageForRequest(r: any): void {
    const userId = r?.userId ?? r?.UserId;
    if (!userId) return;
    const modalRef = this.modalService.open(UserInfoComponent, { windowClass: 'modal-right', size: 'lg' });
    modalRef.componentInstance.userID = userId;
    modalRef.componentInstance.name = r?.userName ?? r?.UserName ?? '';
    modalRef.componentInstance.email = r?.userEmail ?? r?.UserEmail ?? '';
    modalRef.result.then(() => this.loadPermissionRequests()).catch(() => {});
  }

  /** Open permissions page (gear only on list): pass pending requests so they show inside the modal with Approve/Reject. */
  openPermissionsPageWithRequests(item: any): void {
    const pending = this.getPendingRequestsForTrainer(item?.id);
    const modalRef = this.modalService.open(UserInfoComponent, { windowClass: 'modal-right', size: 'lg' });
    modalRef.componentInstance.userID = item?.id;
    modalRef.componentInstance.name = item?.userName ?? '';
    modalRef.componentInstance.email = item?.email ?? '';
    modalRef.componentInstance.pendingRequests = pending.length ? [...pending] : [];
    modalRef.result.then(() => this.loadPermissionRequests()).catch(() => {});
  }

  trackByRequestId(_index: number, item: any): string {
    return item?.id ?? '';
  }

  /** Normalize id for comparison (GUIDs may come with/without dashes, different case). */
  private normalizeId(value: any): string {
    const s = (value ?? '').toString().trim().toLowerCase().replace(/-/g, '');
    return s;
  }

  /** Pending permission requests for a trainer (by userId). */
  getPendingRequestsForTrainer(trainerId: string): any[] {
    if (!trainerId || !this.permissionRequests?.length) return [];
    const id = this.normalizeId(trainerId);
    if (!id) return [];
    return this.permissionRequests.filter((r: any) => this.normalizeId(r?.userId ?? r?.UserId) === id);
  }

  openRemoveFromManagement(item) {
    const modalRef = this.modalService.open(RemoveFromManagementComponent);
    modalRef.componentInstance.trainerId = item.id;
    modalRef.componentInstance.trainerName = item.userName || item.email;
    modalRef.result.then(() => this.fetchTrainers()).catch(() => {});
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sharedService.showUserMappingButton.next(false);
    this.sharedService.showTrainerListToolbar.next(false);
    this.sharedService.trainerListSearchTerm$.next('');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  addToUserMagt() {
    const modalRef = this.modalService.open(UserManagemntMappingComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.users = [];
    modalRef.componentInstance.sourceRole = 'trainer';
    modalRef.result.then(() => this.fetchTrainers()).catch(() => {});
  }
  selectAll(){
    if(this.checkedAll){
      this.users.forEach(x=>x.Selected=true)
    }else{
      this.users.forEach(x=>x.Selected=false)
    }
  }
}
