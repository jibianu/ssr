import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from "ngx-pagination";
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BaseComponent } from 'src/app/core/utils/base.component';
import { getErrorMessage } from 'src/app/core/utils/error.util';

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, // ✅ PERFORMANCE: OnPush change detection
  imports: [
    NgxPaginationModule,
    CommonModule,
    RouterModule,
    FormsModule // ✅ FIX: FormsModule required for ngValue directive
  ]
})
export class LocationListComponent extends BaseComponent implements OnInit {

  config = {
    itemsPerPage: 5,
    currentPage: 1
  };

  tableSizes: number[] = [5, 10, 25, 50];
  locations: any[] = [];
  filteredLocations: any[] = [];
  term: string = '';

  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger
  ) {
    super(); // ✅ BEST PRACTICE: Initialize BaseComponent for subscription management
  }

  ngOnInit(): void {
    this.fetchLocations();
  }

  fetchLocations(): void {
    // ✅ BEST PRACTICE: Use BaseComponent.addSubscription for automatic cleanup
    this.addSubscription(
      this.appService.getLocation().subscribe({
        next: (response: any[]) => {
          this.locations = response;
          this.applyFilter();
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
        },
        error: (error) => {
          // ✅ BEST PRACTICE: Use ErrorUtil for consistent error messages
          const errorMessage = getErrorMessage(error);
          console.error('Error fetching locations:', errorMessage, error);
          this.toasterService.showError(errorMessage);
        }
      })
    );
  }

  deleteLocation(id: number): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Location Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>';

    modalRef.result.then(result => {
      if (result === 'ok') {
        // ✅ BEST PRACTICE: Use BaseComponent.addSubscription for automatic cleanup
        this.addSubscription(
          this.appService.deleteLocationById(id).subscribe({
            next: () => {
              this.toasterService.showSuccess('Location deleted successfully');
              this.fetchLocations();
            },
            error: (error) => {
              // ✅ BEST PRACTICE: Use ErrorUtil for consistent error messages
              const errorMessage = getErrorMessage(error);
              console.error('Deletion error:', errorMessage, error);
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

  pageChanged(event: number): void {
    this.config.currentPage = event;
  }

  onTableSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.config.itemsPerPage = +target.value;
    this.config.currentPage = 1;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  applyFilter(): void {
    if (!this.term) {
      this.filteredLocations = this.locations;
    } else {
      const searchTerm = this.term.toLowerCase();
      this.filteredLocations = this.locations.filter(location =>
        location.name?.toLowerCase().includes(searchTerm)
      );
    }
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByLocationId(index: number, location: any): string {
    return location?.id || index.toString();
  }

  trackByTableSize(index: number, size: number): number {
    return size;
  }
}
