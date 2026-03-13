import { SharedModule } from './../../../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PublicCourseRoutingModule } from './public-course-routing.module';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicRelatedCoursesComponent } from './public-related-courses/public-related-courses.component';
import { CanonicalService } from './../../../shared/service/canonical.service';
import { MetadataService } from './../../../shared/service/meta.service';

@NgModule({
  declarations: [PublicCourseHomeComponent, PublicCourseListComponent, PublicCourseDetailsComponent, PublicCategoryComponent, PublicRelatedCoursesComponent],
  imports: [
    CommonModule,
    PublicCourseRoutingModule,
    SharedModule
  ],
  providers: [CanonicalService, MetadataService],
  exports: [PublicCourseDetailsComponent]
})
export class PublicCourseModule { }
