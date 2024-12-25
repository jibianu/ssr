import { AdminAppService } from './../../adminapp.service';
import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class UserListComponent implements OnInit {

  users = [];
  config: any;
  page = 1;
  count: number;
  tableSize = 5;
  searchTitle = '';
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  sortBy = 'FirstName';
  isAsc = true;
  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService
  ) { }

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    let obj = {
      'Filters.FirstName': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    }
    this.subscription.add(this.appService.getUsers(obj)
      .subscribe(
        response => {
          this.users = response.results;
          this.count = response.totalNumberOfRecords;
        },
        error => {
          console.log(error);
        }));
  }

  pageChanged(event) {
    this.page = event;
    this.fetchUsers();
  }

  onTableSizeChange(event): void {
    this.tableSize = event.target.value;
    this.page = 1;
    this.fetchUsers();
  }

  deleteUser(id) {
    this.open(id);
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'User Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteUserById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('User deleted successfully');
              this.page = 1;
              this.fetchUsers();
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
      this.fetchUsers()
    }
  }

  sortByHeading(value: string) {
      this.sortBy = value;
      if (this.isAsc) {
        this.isAsc = false;
      } else {
        this.isAsc = true;
      }
      this.fetchUsers();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
