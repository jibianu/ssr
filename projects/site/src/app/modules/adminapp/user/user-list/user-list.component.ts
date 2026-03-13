import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AdminAppService } from './../../adminapp.service';
import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { BaseComponent } from 'src/app/core/utils/base.component';
import { getErrorMessage } from 'src/app/core/utils/error.util';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserListComponent extends BaseComponent implements OnInit {
  
  users: any[] = [];
  page: number = 1;
  count: number = 0;
  tableSize: number = 5;
  searchTitle: string = '';
  tableSizes: number[] = [5, 10, 25, 50];
  sortBy: string = 'FirstName';
  isAsc: boolean = true;

  constructor(
    private appService: AdminAppService,
    private modalService: NgbModal,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef
  ) {
    super(); // ✅ BEST PRACTICE: Initialize BaseComponent for subscription management
  }

  ngOnInit(): void {
    this.fetchUsers();
  }

  fetchUsers(): void {
    const filters = {
      'Filters.FirstName': this.searchTitle,
      'Sort.PropertyName': this.sortBy,
      'Sort.IsAscending': this.isAsc,
      pageSize: this.tableSize,
      pageNumber: this.page,
    };

    // ✅ BEST PRACTICE: Use BaseComponent.addSubscription for automatic cleanup
    this.addSubscription(
      this.appService.getUsers(filters).subscribe({
        next: (response) => {
          this.users = response.results || [];
          this.count = response.totalNumberOfRecords || 0;
          this.cdr.markForCheck(); // Manual change detection trigger for OnPush
        },
        error: (error) => {
          // ✅ BEST PRACTICE: Use ErrorUtil for consistent error messages
          const errorMessage = getErrorMessage(error);
          console.error('Error fetching users:', errorMessage, error);
          this.toasterService.showError(errorMessage);
        }
      })
    );
  }

  // PERFORMANCE: Add trackBy for ngFor optimization
  trackByUserId(index: number, user: any): string {
    return user?.id || index;
  }

  trackByTableSize(index: number, size: number): number {
    return size;
  }

  pageChanged(event: number): void {
    this.page = event;
    this.fetchUsers();
  }

  onTableSizeChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.tableSize = Number(selectElement.value);
    this.page = 1;
    this.fetchUsers();
  }

  deleteUser(id: string): void {
    this.openConfirmationModal(id);
  }

  private openConfirmationModal(userId: string): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'User Deletion';
    modalRef.componentInstance.descText = 'Are you sure you want to delete?';

    modalRef.result.then((result: string) => {
      if (result === 'ok') {
        // ✅ BEST PRACTICE: Use BaseComponent.addSubscription for automatic cleanup
        this.addSubscription(
          this.appService.deleteUserById(userId).subscribe({
            next: () => {
              this.toasterService.showSuccess('User deleted successfully');
              this.page = 1;
              this.fetchUsers(); // This will call markForCheck internally
            },
            error: (err) => {
              // ✅ BEST PRACTICE: Use ErrorUtil for consistent error messages
              const errorMessage = getErrorMessage(err);
              console.error('Delete error:', errorMessage, err);
              this.toasterService.showError(errorMessage || 'Something went wrong');
            }
          })
        );
      }
    }).catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Modal dismissed:', msg);
    })
  }

  dataChanged(searchValue: string): void {
    if (!searchValue.trim()) {
      this.fetchUsers();
    }
  }

  sortByHeading(column: string): void {
    this.sortBy = column;
    this.isAsc = !this.isAsc;
    this.fetchUsers();
  }
}
