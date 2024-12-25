import { SharedModule } from './../../../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LocationRoutingModule } from './location-routing.module';
import { AddLocationComponent } from './add-location/add-location.component';
import { LocationListComponent } from './location-list/location-list.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';


@NgModule({
  declarations: [AddLocationComponent, LocationListComponent],
  imports: [
    CommonModule,
    LocationRoutingModule,
    ReactiveFormsModule,
    NgxPaginationModule,
    SharedModule
  ]
})
export class LocationModule { }
