import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp.service';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { Role } from 'src/app/shared/models/role';

@Component({
  selector: 'app-admin-company-trainers-drawer',
  templateUrl: './admin-company-trainers-drawer.component.html',
  styleUrls: ['./admin-company-students-drawer.component.scss'],
  standalone: false
})
export class AdminCompanyTrainersDrawerComponent implements OnInit, OnDestroy {
  @Input() companyUserId!: string;
  @Input() companyEmail = '';

  users: unknown[] = [];
  page = 1;
  count = 0;
  tableSize = 20;
  tableSizes = [10, 20, 50];
  sortBy = 'FirstName';
  isAsc = true;
  searchTitle = '';

  private subscription = new Subscription();

  constructor(
    public activeModal: NgbActiveModal,
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.fetchTrainers();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getInitial(item: { email?: string; userName?: string }): string {
    const str = item?.email || item?.userName || '?';
    return (str.charAt(0) || '?').toUpperCase();
  }

  fetchTrainers(): void {
    const obj: Record<string, string | number | boolean> = {
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page
    };
    if (this.searchTitle?.trim()) {
      obj['Filter.Search'] = this.searchTitle.trim();
    }
    this.subscription.add(
      this.appService.getCompanyPortalTrainers(this.companyUserId, obj).subscribe({
        next: (response: { results?: unknown[]; totalNumberOfRecords?: number }) => {
          this.users = response?.results || [];
          this.count = response?.totalNumberOfRecords ?? 0;
        },
        error: () => {
          this.users = [];
          this.count = 0;
        }
      })
    );
  }

  pageChanged(event: number): void {
    this.page = event;
    this.fetchTrainers();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchTrainers();
  }

  applySearch(): void {
    this.page = 1;
    this.fetchTrainers();
  }

  sortByHeading(value: string): void {
    this.sortBy = value;
    this.isAsc = !this.isAsc;
    this.fetchTrainers();
  }

  openTrainerInfo(item: { id: string; email?: string; userName?: string }): void {
    const ref = this.modalService.open(UserInfoComponent, {
      windowClass: 'modal-right modal-right--wide'
    });
    ref.componentInstance.userID = item.id;
    ref.componentInstance.email = item.email;
    ref.componentInstance.name = item.userName ?? '';
    ref.componentInstance.showFullDrawer = true;
  }

  openCourseModal(item: { id: string; firstName?: string; lastName?: string; email?: string }): void {
    const ref = this.modalService.open(StudentCourseListComponent, { windowClass: 'modal-right' });
    ref.componentInstance.userID = item.id;
    ref.componentInstance.name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || (item.email ?? '');
    ref.componentInstance.email = item.email;
    ref.componentInstance.showNoOfUserField = false;
    ref.componentInstance.showViewEditPermissions = true;
  }

  openPermissionModal(item: { id: string }): void {
    const ref = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    ref.componentInstance.userId = item.id;
    ref.componentInstance.role = Role.Trainer;
  }

  deleteUser(id: string): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Trainer deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete this trainer?';
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(
          this.appService.deleteUserById(id).subscribe({
            next: () => {
              this.toasterService.showSuccess('Trainer deleted successfully');
              this.page = 1;
              this.fetchTrainers();
            },
            error: () => this.toasterService.showError('Something went wrong')
          })
        );
      }
    }).catch(() => {});
  }
}
