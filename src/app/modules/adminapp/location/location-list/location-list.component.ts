// import { Subscription } from 'rxjs';
// import { Component, OnInit, OnDestroy } from '@angular/core';
// import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
// import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
// import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
// import { AdminAppService } from '../../adminapp.service';

// @Component({
//     selector: 'app-location-list',
//     templateUrl: './location-list.component.html',
//     styleUrls: ['./location-list.component.scss'],
//     standalone: false
// })
// export class LocationListComponent implements OnInit, OnDestroy {

//   config: any;
//   tableSizes = [5, 10, 25, 50];
//   subscription: Subscription = new Subscription();
//   locations = [];
//   term = ''
//   constructor(
//     private appService: AdminAppService,
//     private toasterService: ToasterService,
//     private modalService: NgbModal
//   ) { }

//   ngOnInit(): void {
//     this.config = {
//       itemsPerPage: 5,
//       currentPage: 1,
//     };
//     this.fetchLocations();
//   }

//   deleteLocation(id) {
//     this.open(id);
//   }

//   fetchLocations() {
//     this.subscription.add(this.appService.getLocation()
//       .subscribe(
//         response => {
//           this.locations = response;
//         },
//         error => {
//           console.log(error);
//         }));
//   }

//   pageChanged(event) {
//     this.config.currentPage = event;
//   }

//   onTableSizeChange(event): void {
//     this.config.itemsPerPage = event.target.value;
//     this.config.currentPage = 1;
//   }

//   open(id) {
//     const modalRef = this.modalService.open(ConfirmationModalComponent);
//     modalRef.componentInstance.title = 'Location Deletion';
//     modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
//     modalRef.result.then((result) => {
//       if (result === 'ok') {
//         this.subscription.add(this.appService.deleteLocationById(id)
//           .subscribe(
//             response => {
//               this.toasterService.showSuccess('Location deleted successfully');
//               this.fetchLocations();
//             },
//             error => {
//               console.log(error);
//               this.toasterService.showError('Something went wrong');
//             }));
//       }
//     }, (reason) => {

//     });
//   }

//   ngOnDestroy() {
//     if (this.subscription) {
//       this.subscription.unsubscribe();
//     }
//   }

// }



import { Component, OnDestroy, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from "ngx-pagination";
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss'],
  standalone: true,

  imports: [
    NgxPaginationModule,
    CommonModule
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
    private modalService: NgbModal
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

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
