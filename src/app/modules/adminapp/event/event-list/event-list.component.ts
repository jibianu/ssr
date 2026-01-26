import { ConfirmationModalComponent } from './../../../../shared/component/confirmation-modal/confirmation-modal.component';
// import { Category } from './../category.model';
import { AdminAppService } from './../../adminapp.service';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

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
  deletingEventId: string | null = null; // ✅ DELETE: Track which event is being deleted to disable button
  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef, // ✅ PERFORMANCE: For manual change detection trigger
    private route: ActivatedRoute,
    private router: Router
  ) {
    // ✅ DEBUG: Verify we're using the same service instance
    console.log('[EventListComponent] 🏗️ Component created, using AdminAppService instance:', this.appService);
  }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 5,
      currentPage: 1,
    };
    
    // ✅ SHARED STATE: Subscribe to events$ observable for immediate UI updates
    // This ensures list updates automatically when events are updated elsewhere
    this.subscription.add(
      this.appService.events$.subscribe(events => {
        // ✅ FIX: Update even if events array is empty (to handle deletions)
        if (events && Array.isArray(events)) {
          console.log('[EventListComponent] 📥 Received events from shared state:', events.length, 'events');
          console.log('[EventListComponent] 🔍 Event IDs:', events.map(e => e.id || (e as any).Id).join(', '));
          
          // ✅ FIX: Only update if data actually changed (prevent unnecessary re-renders)
          const currentIds = this.categories.map(c => c.id || (c as any).Id).join(',');
          const newIds = events.map(e => e.id || (e as any).Id).join(',');
          
          if (currentIds !== newIds || this.categories.length !== events.length) {
            this.categories = events;
            this.applyFilter();
            this.sortArr('name');
            this.cdr.markForCheck();
            console.log('[EventListComponent] ✅ Events updated from shared state:', events.length, 'events');
            console.log('[EventListComponent] 🎨 DOM will update (markForCheck called)');
          } else {
            console.log('[EventListComponent] ⏭️ No change detected, skipping update');
          }
        }
      })
    );
    
    // ✅ INITIAL LOAD: Fetch events on component init
    this.fetchEvents();
  }

  deleteEvent(id) {
    this.open(id);
  }

  fetchEvents() {
    // ✅ FIX: Only fetch if shared state is empty (to avoid overwriting updates)
    // The events$ subscription will handle updates automatically
    const currentEventsCount = this.appService.getEventsCount();
    if (currentEventsCount === 0) {
      console.log('[EventListComponent] 🔄 Initial fetch: shared state is empty, fetching events...');
      this.subscription.add(this.appService.getEvents()
        .subscribe(
          response => {
            // ✅ SHARED STATE: Events are automatically updated via events$ subscription
            // This initial fetch populates the shared state, which triggers the subscription above
            // Don't directly assign here - let the subscription handle it
            console.log('[EventListComponent] ✅ Initial fetch completed:', response?.length || 0, 'events');
            // The events$ subscription will update this.categories automatically
          },
          error => {
            console.error('[EventListComponent] Error fetching events:', error);
          }));
    } else {
      console.log('[EventListComponent] ⏭️ Skipping fetch: shared state already has', currentEventsCount, 'events');
      // Shared state already has data, subscription will handle it
    }
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
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete this event?</strong><br><br>This will permanently delete the event and all associated data including images and files.'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.deleteEventConfirmed(id);
      }
    }, (reason) => {
      // Modal dismissed - do nothing
    });
  }
  
  /**
   * ✅ DELETE: Handles confirmed event deletion with proper error handling and UI updates
   */
  deleteEventConfirmed(eventId: string): void {
    // ✅ PREVENT DOUBLE SUBMIT: Set deleting flag to disable button
    if (this.deletingEventId === eventId) {
      return; // Already deleting this event
    }
    
    this.deletingEventId = eventId;
    this.cdr.markForCheck(); // Trigger change detection to update button state
    
    this.subscription.add(this.appService.deleteEvent(eventId)
      .subscribe({
        next: (response) => {
          // ✅ SUCCESS: Remove event from UI without full reload
          const index = this.categories.findIndex(e => e.id === eventId);
          if (index !== -1) {
            this.categories.splice(index, 1);
            this.applyFilter(); // Re-apply filter to update filteredCategories
            this.cdr.markForCheck();
          }
          
          // ✅ TOAST: Show success message
          this.toasterService.showSuccess('Event deleted successfully');
          
          // ✅ RESET: Clear deleting flag
          this.deletingEventId = null;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('[EventListComponent] Error deleting event:', error);
          
          // ✅ ERROR HANDLING: Show user-friendly error message
          let errorMessage = 'Failed to delete event. Please try again.';
          
          if (error?.error?.Messages && Array.isArray(error.error.Messages)) {
            errorMessage = error.error.Messages.join(', ');
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // ✅ SPECIFIC ERRORS: Handle specific error cases
          if (error?.status === 404) {
            errorMessage = 'Event not found. It may have already been deleted.';
            // Remove from UI if 404 (event doesn't exist)
            const index = this.categories.findIndex(e => e.id === eventId);
            if (index !== -1) {
              this.categories.splice(index, 1);
              this.applyFilter();
              this.cdr.markForCheck();
            }
          } else if (error?.status === 401) {
            errorMessage = 'Your session has expired. Please log in again.';
          } else if (error?.status === 403) {
            errorMessage = 'You do not have permission to delete this event.';
          } else if (error?.status === 500) {
            errorMessage = 'Server error occurred while deleting event. Please try again later.';
          }
          
          this.toasterService.showError(errorMessage);
          
          // ✅ RESET: Clear deleting flag on error
          this.deletingEventId = null;
          this.cdr.markForCheck();
        }
      }));
  }
  
  /**
   * ✅ DELETE: Check if an event is currently being deleted
   */
  isDeleting(eventId: string): boolean {
    return this.deletingEventId === eventId;
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