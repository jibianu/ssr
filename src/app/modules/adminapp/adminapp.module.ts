import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdminappRoutingModule } from './adminapp-routing.module';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LocationListComponent } from './location/location-list/location-list.component';
import { CourseModule } from './course/course.module';



@NgModule({
  declarations: [
    

  ],
  imports: [
        CommonModule,
    AdminappRoutingModule,
    RouterModule,
    LocationListComponent,
    FormsModule,
    CourseModule
  ],
  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ],
})
export class AdminappModule { }
