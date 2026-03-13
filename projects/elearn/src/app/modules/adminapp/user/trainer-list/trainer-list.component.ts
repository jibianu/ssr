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
  tableSizes = [5, 10, 20, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  role:Role;
  checkedAll=false;
  managerListEnbale=false;
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
    })

    this.fetchTrainers();
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

  private updateUserMappingVisibility(): void {
    this.sharedService.showUserMappingButton.next(
      !!this.managerListEnbale && this.users.length > 0 && !this.isManagementContext
    );
  }

  get isManagementContext(): boolean {
    return this.router?.url?.includes('/management/') ?? false;
  }

  fetchTrainers(): void {
    const obj = {
      'Filters.FirstName': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    };
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

  dataChanged(word: string): void {
    if (word == '') {
      this.fetchTrainers()
    }
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
    const modalRef = this.modalService.open(UserInfoComponent, { windowClass: 'modal-right' });
    modalRef.componentInstance.userID = item.id;
    modalRef.componentInstance.email = item.email;
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
