import { SharedModule } from './../../../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PublicCourseRoutingModule } from './public-course-routing.module';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicRelatedCoursesComponent } from './public-related-courses/public-related-courses.component';
import { NgxPaginationModule } from "ngx-pagination";

@NgModule({
  declarations: [PublicCourseHomeComponent,  PublicCourseDetailsComponent,PublicCategoryComponent, PublicRelatedCoursesComponent],
  imports: [
    CommonModule,
    RouterModule,
    PublicCourseRoutingModule,
    SharedModule,
    NgxPaginationModule
]
})
export class PublicCourseModule { }

