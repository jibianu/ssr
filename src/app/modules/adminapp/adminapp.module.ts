import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminappRoutingModule } from './adminapp-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocationListComponent } from './location/location-list/location-list.component';



@NgModule({
  declarations: [
    

  ],
  imports: [
    AdminappRoutingModule,
    RouterModule,
    LocationListComponent,
    FormsModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class AdminappModule { }
