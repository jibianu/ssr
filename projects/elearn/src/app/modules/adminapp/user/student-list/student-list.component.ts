import { UpdatePermissionomponent } from './../../../../shared/component/permission/update-permission/update-permission.component';
import { ChangeDetectionStrategy, Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { StudentDetailsComponent } from 'src/app/app/modal/student-details/student-details.component';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { DropListComponent } from 'src/app/shared/component/dropdown/drop-list/drop-list.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { UpdateCourseListComponent } from 'src/app/shared/component/update-course-list/update-course-list.component';
import { Category } from '../../category/category.model';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Role } from 'src/app/shared/models/role';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { UserManagemntMappingComponent } from 'src/app/shared/component/user-managemnt-mapping/user-managemnt-mapping.component';
import { RemoveFromManagementComponent } from 'src/app/shared/component/remove-from-management/remove-from-management.component';
import { SharedService } from 'src/app/shared/service/shared-service.service';

@Component({
    selector: 'app-student-list',
    templateUrl: './student-list.component.html',
    styleUrls: ['./student-list.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.Default,
    standalone: false
})
export class StudentListComponent implements OnInit, OnDestroy {

  users = [];
  page = 1;
  count: number;
  tableSize = 20;
  searchTitle = '';
  filterCreatedFrom = '';
  filterCreatedTo = '';
  filterLastLoginFrom = '';
  filterLastLoginTo = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  categories = new Array<Category>();
  sortDir = 1;
  role: Role;
  checkedAll = false;
  managerListEnbale = false;
  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private sharedService: SharedService
  ) { }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Student List');
    this.activatedRoute.data.subscribe(res=>{
      if(res && res.roles){
        var d=res.roles[0]
        this.role=d;
      }
    })
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
    this.fetchStudents();
  }

  private updateUserMappingVisibility(): void {
    this.sharedService.showUserMappingButton.next(
      !!this.managerListEnbale && this.users.length > 0 && !this.isManagementContext
    );
  }

  get isManagementContext(): boolean {
    return this.router?.url?.includes('/management/') ?? false;
  }

  goToStudentAnalytics(): void {
    this.router.navigate(['/app/admin/analytics']);
  }

  getInitial(item: { email?: string; userName?: string }): string {
    const str = item?.email || item?.userName || '?';
    return (str.charAt(0) || '?').toUpperCase();
  }

  fetchStudents(): void {
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
    if (this.isManagementContext) {
      this.subscription.add(this.appService.getAssignedStudentsForManagement(obj).subscribe({
        next: response => {
          this.users = response?.results || [];
          this.count = response?.totalNumberOfRecords ?? 0;
        },
        error: err => {
          this.users = [];
          this.count = 0;
          if (err?.status !== 401) console.log(err);
        }
      }));
      return;
    }
    this.subscription.add(
      this.appService.GetPermissionByAction('Users.GetStudents').subscribe(res => {
        this.subscription.add(
          this.appService.getStudents(obj, res).subscribe(
            response => {
              this.users = response?.results || [];
              this.count = response?.totalNumberOfRecords ?? 0;
              this.updateUserMappingVisibility();
            },
            error => {
              this.users = [];
              this.count = 0;
              if (error?.status !== 401) console.log(error);
              this.updateUserMappingVisibility();
            }
          )
        );
      })
    );
  }

  pageChanged(event) {
    this.page = event;
    this.fetchStudents();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchStudents();
  }

  deleteUser(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Student Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteUserById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Student deleted successfully');
              this.page = 1;
              this.fetchStudents();
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
      this.fetchStudents();
    }
  }

  applyFilters(): void {
    this.page = 1;
    this.fetchStudents();
  }

  clearFilters(): void {
    this.searchTitle = '';
    this.filterCreatedFrom = '';
    this.filterCreatedTo = '';
    this.filterLastLoginFrom = '';
    this.filterLastLoginTo = '';
    this.page = 1;
    this.fetchStudents();
  }

  sortByHeading(value: string) {
    this.sortBy = value;
    if (this.isAsc) {
      this.isAsc = false;
    } else {
      this.isAsc = true;
    }
    this.fetchStudents();
  }


  openPermisionModal(item) {
    // debugger
    var studentDetailsmodel = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    studentDetailsmodel.componentInstance.userId = item.id;
    studentDetailsmodel.componentInstance.role=this.role;
  }

  ngOnDestroy() {
    this.sharedService.certificateName.next('');
    this.sharedService.showUserMappingButton.next(false);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  openCourseModal(item) {
    var studentDetailsmodel = this.modalService.open(StudentCourseListComponent,
      { windowClass: 'modal-right'});
    studentDetailsmodel.componentInstance.userID = item.id;
    studentDetailsmodel.componentInstance.name = item.firstName + ' ' + item.lastName;
    studentDetailsmodel.componentInstance.email = item.email;
    studentDetailsmodel.componentInstance.showNoOfUserField=true;
  }
  openStudentInfo(item){
    const isFullDrawer = !this.isManagementContext;
    const studentDetailsmodel = this.modalService.open(UserInfoComponent, {
      windowClass: isFullDrawer ? 'modal-right modal-right--wide' : 'modal-right'
    });
    studentDetailsmodel.componentInstance.userID = item.id;
    studentDetailsmodel.componentInstance.email = item.email;
    studentDetailsmodel.componentInstance.showFullDrawer = isFullDrawer;
  }
  addToUserMagt(){
    const modalRef = this.modalService.open(UserManagemntMappingComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.users = [];
    modalRef.componentInstance.sourceRole = 'student';
    modalRef.result.then(() => this.fetchStudents()).catch(() => {});
  }

  openRemoveFromManagement(item) {
    const modalRef = this.modalService.open(RemoveFromManagementComponent);
    modalRef.componentInstance.trainerId = item.id;
    modalRef.componentInstance.trainerName = item.userName || item.email;
    modalRef.componentInstance.entityType = 'student';
    modalRef.result.then(() => this.fetchStudents()).catch(() => {});
  }
  selectAll(){
    if(this.checkedAll){
      this.users.forEach(x=>x.Selected=true)
    }else{
      this.users.forEach(x=>x.Selected=false)
    }
  }
}
