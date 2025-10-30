import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from "ngx-pagination";
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // ✅ FIX: Add FormsModule for ngValue binding

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
export class LocationListComponent implements OnInit, OnDestroy {

  config = {
    itemsPerPage: 5,
    currentPage: 1
  };

  tableSizes: number[] = [5, 10, 25, 50];
  locations: any[] = [];
  filteredLocations: any[] = [];
  term: string = '';
  subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger
  ) {}

  ngOnInit(): void {
    this.fetchLocations();
  }

  fetchLocations(): void {
    this.subscription.add(
      this.appService.getLocation().subscribe(
        (response: any[]) => {
          this.locations = response;
          this.applyFilter();
          this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
        },
        error => {
          console.error('Error fetching locations:', error);
        }
      )
    );
  }

  deleteLocation(id: number): void {
    const modalRef = this.modalService.open(ConfirmationModalComponent);
    modalRef.componentInstance.title = 'Location Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>';

    modalRef.result.then(result => {
      if (result === 'ok') {
        this.subscription.add(
          this.appService.deleteLocationById(id).subscribe(
            () => {
              this.toasterService.showSuccess('Location deleted successfully');
              this.fetchLocations();
            },
            error => {
              console.error('Deletion error:', error);
              this.toasterService.showError('Something went wrong');
            }
          )
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

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
