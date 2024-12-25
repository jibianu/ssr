import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { CourseRoutingModule } from '../course-routing.module';
import { RouterModule, Routes } from '@angular/router';
import { LocationMetadataComponent } from './location-metadata.component';

const routes: Routes = [
    {
        path: '',
        component: LocationMetadataComponent
    }
  ];

@NgModule({
  declarations: [LocationMetadataComponent],
  imports: [
    CommonModule,
    CourseRoutingModule,
    RouterModule.forChild(routes),
    NgxPaginationModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class LocationMetadataModule { }
