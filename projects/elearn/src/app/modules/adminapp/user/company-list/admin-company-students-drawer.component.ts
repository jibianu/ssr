import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { AdminAppService } from '../../adminapp.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { Role } from 'src/app/shared/models/role';

@Component({
  selector: 'app-admin-company-students-drawer',
  templateUrl: './admin-company-students-drawer.component.html',
  styleUrls: ['./admin-company-students-drawer.component.scss'],
  standalone: false
})
export class AdminCompanyStudentsDrawerComponent implements OnInit, OnDestroy {
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
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.fetchStudents();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getInitial(item: { email?: string; userName?: string }): string {
    const str = item?.email || item?.userName || '?';
    return (str.charAt(0) || '?').toUpperCase();
  }

  fetchStudents(): void {
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
      this.appService.getCompanyPortalStudents(this.companyUserId, obj).subscribe({
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
    this.fetchStudents();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchStudents();
  }

  applySearch(): void {
    this.page = 1;
    this.fetchStudents();
  }

  sortByHeading(value: string): void {
    this.sortBy = value;
    this.isAsc = !this.isAsc;
    this.fetchStudents();
  }

  openStudentInfo(item: { id: string; email?: string }): void {
    const ref = this.modalService.open(UserInfoComponent, {
      windowClass: 'modal-right modal-right--wide'
    });
    ref.componentInstance.userID = item.id;
    ref.componentInstance.email = item.email;
    ref.componentInstance.showFullDrawer = true;
  }

  openCourseModal(item: { id: string; firstName?: string; lastName?: string; email?: string }): void {
    const ref = this.modalService.open(StudentCourseListComponent, { windowClass: 'modal-right' });
    ref.componentInstance.userID = item.id;
    ref.componentInstance.showNoOfUserField = true;
    ref.componentInstance.name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || (item.email ?? '');
    ref.componentInstance.email = item.email;
  }

  openPermissionModal(item: { id: string }): void {
    const ref = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    ref.componentInstance.userId = item.id;
    ref.componentInstance.role = Role.Student;
  }
}
