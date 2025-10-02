import { CommonModule } from '@angular/common';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminappRoutingModule } from './adminapp-routing.module';
import { LocationListComponent } from './location/location-list/location-list.component';



@NgModule({
  declarations: [
    

  ],
  imports: [
    CommonModule,
    AdminappRoutingModule,
    RouterModule,
    LocationListComponent,
    FormsModule//need to reverify
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class AdminappModule { }
