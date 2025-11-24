import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { NgxPaginationModule } from 'ngx-pagination';

@Component({
    selector: 'app-icon-list',
    templateUrl: './icon-list.component.html',
    styleUrls: ['./icon-list.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class IconListComponent implements OnInit,OnDestroy {

  config: any;
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  term = '';
  icons = [];
  filteredIcons = []; // ✅ FIX: Add filtered array for search
  sortDir = 1;
  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger
  ) { }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 5,
      currentPage: 1,
    };
    this.fetchIcons();
  }

  deleteIcon(id) {
    this.open(id);
  }

  fetchIcons() {
    this.subscription.add(this.appService.getIcon()
      .subscribe(
        response => {
          this.icons = response;
          this.applyFilter(); // ✅ FIX: Apply filter after fetching
          this.sortArr('name');
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
        },
        error => {
          console.log(error);
        }));
  }

  // ✅ FIX: Add filter method for search functionality
  applyFilter(): void {
    if (!this.term || this.term.trim() === '') {
      this.filteredIcons = this.icons;
    } else {
      const searchTerm = this.term.toLowerCase();
      this.filteredIcons = this.icons.filter(item => {
        return (item.name && item.name.toLowerCase().includes(searchTerm)) ||
               (item.url && item.url.toLowerCase().includes(searchTerm));
      });
    }
    this.cdr.markForCheck();
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  pageChanged(event) {
    this.config.currentPage = event;
  }

  onTableSizeChange(event): void {
    this.config.itemsPerPage = event.target.value;
    this.config.currentPage = 1;
  }

  open(id) {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Icon Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteIconById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Icon deleted successfully');
              this.fetchIcons();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  onSortClick(event,colName) {
    let target = event.currentTarget,
      classList = target.classList;

    if (classList.contains('fa-caret-up')) {
      classList.remove('fa-caret-up');
      classList.add('fa-caret-down');
      this.sortDir = -1;
    } else {
      classList.add('fa-caret-up');
      classList.remove('fa-caret-down');
      this.sortDir = 1;
    }
    this.sortArr(colName);
  }

  sortArr(colName: any) {
    this.filteredIcons.sort((a, b) => {
      a = a[colName].toLowerCase();
      b = b[colName].toLowerCase();
      if (a < b) {
        return -1 * this.sortDir;
      }
      else if (a > b) {
        return 1 * this.sortDir;
      }
      else {
        return 0;
      }
    });
    this.cdr.markForCheck();
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByIconId(index: number, icon: any): string {
    return icon?.id || index.toString();
  }

  trackByTableSize(index: number, size: number): number {
    return size;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
