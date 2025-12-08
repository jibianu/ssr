import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
// import { Category } from './../category.model';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class EventListComponent implements OnInit, OnDestroy {

  config: any;
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  categories = new Array<any>();
  filteredCategories = new Array<any>(); // ✅ FIX: Add filtered array to replace filterBy pipe
  term = '';
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
    this.fetchEvents();
  }

  deleteEvent(id) {
    this.open(id);
  }

  fetchEvents() {
    this.subscription.add(this.appService.getEvents()
      .subscribe(
        response => {
          this.categories = response;
          this.applyFilter(); // ✅ FIX: Apply filter after fetching data
          this.sortArr('name');
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
        },
        error => {
          console.log(error);
        }));
  }

  // ✅ FIX: Replace filterBy pipe with component method to avoid ng2-search-filter compatibility issue
  applyFilter(): void {
    if (!this.term || this.term.trim() === '') {
      this.filteredCategories = this.categories;
    } else {
      const searchTerm = this.term.toLowerCase();
      const fieldsToSearch = ['title', 'startDate', 'endDate'];
      this.filteredCategories = this.categories.filter(item => {
        return fieldsToSearch.some(field => {
          const value = item[field];
          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      });
    }
    this.cdr.markForCheck();
  }

  // ✅ FIX: Update term and apply filter when search changes
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
    modalRef.componentInstance.title = 'Event Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteEvent(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Category deleted successfully');
              this.fetchEvents();
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
    this.filteredCategories.sort((a, b) => {
      // ✅ FIX: Handle null/undefined values and different data types
      const aValue = a[colName];
      const bValue = b[colName];
      
      // Handle null/undefined values - treat them as empty strings
      const aStr = aValue == null ? '' : String(aValue).toLowerCase();
      const bStr = bValue == null ? '' : String(bValue).toLowerCase();
      
      if (aStr < bStr) {
        return -1 * this.sortDir;
      }
      else if (aStr > bStr) {
        return 1 * this.sortDir;
      }
      else {
        return 0;
      }
    });
    this.cdr.markForCheck();
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByEventId(index: number, event: any): string {
    return event?.id || index.toString();
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