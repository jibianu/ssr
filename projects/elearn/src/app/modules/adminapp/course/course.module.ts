import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CourseRoutingModule } from './course-routing.module';
import { AddCourseComponent } from './add-course/add-course.component';
import { CourseListComponent } from './course-list/course-list.component';
import { UserCourseComponent } from './user-course/user-course.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { LocationMetadataComponent } from './location-metadata/location-metadata.component';
// TEMPORARILY COMMENTED OUT - View Engine library incompatible with Angular Ivy
// TODO: Replace with Ivy-compatible alternative
// import { TagInputModule } from 'ngx-chips'


@NgModule({
  declarations: [AddCourseComponent, CourseListComponent, UserCourseComponent, LocationMetadataComponent],
  imports: [
    CommonModule,
    CourseRoutingModule,
    NgxPaginationModule,
    ReactiveFormsModule,
    SharedModule
    // TagInputModule // TEMPORARILY DISABLED - View Engine incompatible
  ]
})
export class CourseModule { }
