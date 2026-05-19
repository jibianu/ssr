import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { StudentCourseListComponent } from 'src/app/shared/component/course-list/student-course-list/student-course-list.component';
import { UpdatePermissionomponent } from 'src/app/shared/component/permission/update-permission/update-permission.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { UserInfoComponent } from 'src/app/shared/component/user-info/user-info.component';
import { UserManagemntMappingComponent } from 'src/app/shared/component/user-managemnt-mapping/user-managemnt-mapping.component';
import { RemoveFromManagementComponent } from 'src/app/shared/component/remove-from-management/remove-from-management.component';
import { Role } from 'src/app/shared/models/role';
import { AdminAppService } from '../../adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { AdminCompanyStudentsDrawerComponent } from './admin-company-students-drawer.component';
import { AdminCompanyTrainersDrawerComponent } from './admin-company-trainers-drawer.component';

@Component({
    selector: 'app-company-list',
    templateUrl: './company-list.component.html',
    styleUrls: ['./company-list.component.scss'],
    standalone: false
})
export class CompanyListComponent implements OnInit, OnDestroy {

  users = [];
  page = 1;
  count: number;
  tableSize = 20;
  searchTitle = '';
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  role:Role;
  
  checkedAll = false;
  managerListEnbale = false;
  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private activatedRoute: ActivatedRoute,
    private router: Router
  ) { }

  get isManagementContext(): boolean {
    return this.router?.url?.includes('/management/') ?? false;
  }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Company List');
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
    this.fetchCompanies();
  }

  private updateUserMappingVisibility(): void {
    this.sharedService.showUserMappingButton.next(
      !!this.managerListEnbale && this.users.length > 0 && !this.isManagementContext
    );
  }

  fetchCompanies(): void {
    const obj = {
      'Filters.FirstName': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    };
    if (this.isManagementContext) {
      this.subscription.add(this.appService.getAssignedCompaniesForManagement(obj).subscribe({
        next: response => {
          this.users = response?.results || [];
          this.count = response?.totalNumberOfRecords ?? 0;
          this.updateUserMappingVisibility();
        },
        error: err => {
          this.users = [];
          this.count = 0;
          if (err?.status !== 401) console.log(err);
          this.updateUserMappingVisibility();
        }
      }));
      return;
    }
    this.subscription.add(this.appService.GetPermissionByAction('Users.GetCompanies').subscribe(res => {
      this.subscription.add(this.appService.getCompanies(obj, res).subscribe({
        next: response => {
          this.users = response?.results || [];
          this.count = response?.totalNumberOfRecords ?? 0;
          this.updateUserMappingVisibility();
        },
        error: err => {
          this.users = [];
          this.count = 0;
          if (err?.status !== 401) console.log(err);
          this.updateUserMappingVisibility();
        }
      }));
    }));
  }

  pageChanged(event) {
    this.page = event;
    this.fetchCompanies();
  }

  onPageSizeChange(size: number): void {
    this.tableSize = size;
    this.page = 1;
    this.fetchCompanies();
  }

  deleteUser(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Company Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteUserById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Company deleted successfully');
              this.page = 1;
              this.fetchCompanies();
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
      this.fetchCompanies()
    }
  }

  sortByHeading(value: string) {
    this.sortBy = value;
    if (this.isAsc) {
      this.isAsc = false;
    } else {
      this.isAsc = true;
    }
    this.fetchCompanies();
  }

  ngOnDestroy() {
    this.sharedService.certificateName.next('');
    this.sharedService.showUserMappingButton.next(false);
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
  openPermisionModal(item) {
    const studentDetailsmodel = this.modalService.open(UpdatePermissionomponent, { windowClass: 'modal-right' });
    studentDetailsmodel.componentInstance.userId = item.id;
    studentDetailsmodel.componentInstance.role=this.role;
  }
  openCourseModal(item) {
    var studentDetailsmodel = this.modalService.open(StudentCourseListComponent,
      { windowClass: 'modal-right' });
    studentDetailsmodel.componentInstance.userID = item.id;
    studentDetailsmodel.componentInstance.showNoOfUserField = true;
    studentDetailsmodel.componentInstance.name = item.firstName + ' ' + item.lastName;
    studentDetailsmodel.componentInstance.email = item.email;
  }
  openStudentInfo(item){
    var studentDetailsmodel = this.modalService.open(UserInfoComponent,
      { windowClass: 'modal-right'});
    studentDetailsmodel.componentInstance.userID = item.id;
    // studentDetailsmodel.componentInstance.name = item.firstName + ' ' + item.lastName;
    studentDetailsmodel.componentInstance.email = item.email;
  }
  addToUserMagt() {
    const modalRef = this.modalService.open(UserManagemntMappingComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.users = [];
    modalRef.componentInstance.sourceRole = 'company';
    modalRef.result.then(() => this.fetchCompanies()).catch(() => {});
  }

  openRemoveFromManagement(item) {
    const modalRef = this.modalService.open(RemoveFromManagementComponent);
    modalRef.componentInstance.trainerId = item.id;
    modalRef.componentInstance.trainerName = item.userName || item.email;
    modalRef.componentInstance.entityType = 'company';
    modalRef.result.then(() => this.fetchCompanies()).catch(() => {});
  }

  openPortalTrainers(item: { id: string; email?: string }): void {
    const ref = this.modalService.open(AdminCompanyTrainersDrawerComponent, {
      windowClass: 'modal-right modal-right--wide',
      backdrop: true,
      scrollable: true
    });
    ref.componentInstance.companyUserId = item.id;
    ref.componentInstance.companyEmail = (item.email ?? '').toString();
  }

  openPortalStudents(item: { id: string; email?: string }): void {
    const ref = this.modalService.open(AdminCompanyStudentsDrawerComponent, {
      windowClass: 'modal-right modal-right--wide',
      backdrop: true,
      scrollable: true
    });
    ref.componentInstance.companyUserId = item.id;
    ref.componentInstance.companyEmail = (item.email ?? '').toString();
  }
  selectAll(){
    if(this.checkedAll){
      this.users.forEach(x=>x.Selected=true)
    }else{
      this.users.forEach(x=>x.Selected=false)
    }
  }
}
