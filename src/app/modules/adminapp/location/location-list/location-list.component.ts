import { Subscription } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent } from 'src/app/shared/component/confirmation-modal/confirmation-modal.component';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AdminAppService } from '../../adminapp.service';

@Component({
  selector: 'app-location-list',
  templateUrl: './location-list.component.html',
  styleUrls: ['./location-list.component.scss']
})
export class LocationListComponent implements OnInit, OnDestroy {

  config: any;
  tableSizes = [5, 10, 25, 50];
  subscription: Subscription = new Subscription();
  locations = [];
  term = ''
  constructor(
    private appService: AdminAppService,
    private toasterService: ToasterService,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    this.config = {
      itemsPerPage: 5,
      currentPage: 1,
    };
    this.fetchLocations();
  }

  deleteLocation(id) {
    this.open(id);
  }

  fetchLocations() {
    this.subscription.add(this.appService.getLocation()
      .subscribe(
        response => {
          this.locations = response;
        },
        error => {
          console.log(error);
        }));
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
    modalRef.componentInstance.title = 'Location Deletion';
    modalRef.componentInstance.descText = '<strong>Are you sure you want to delete?</strong>'
    modalRef.result.then((result) => {
      if (result === 'ok') {
        this.subscription.add(this.appService.deleteLocationById(id)
          .subscribe(
            response => {
              this.toasterService.showSuccess('Location deleted successfully');
              this.fetchLocations();
            },
            error => {
              console.log(error);
              this.toasterService.showError('Something went wrong');
            }));
      }
    }, (reason) => {

    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

}
