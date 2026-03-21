import { SharedModule } from './../../../shared/shared.module';
import { FixMojibakeSafeHtmlPipe } from '../../../shared/pipes/fix-mojibake-safe-html.pipe';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { PublicCourseRoutingModule } from './public-course-routing.module';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicRelatedCoursesComponent } from './public-related-courses/public-related-courses.component';
import { CourseShellComponent } from './course-shell/course-shell.component';
import { LearningCourseIframeComponent } from './learning-course-iframe/learning-course-iframe.component';
import { ElearnCourseWrapperComponent } from './elearn-course-wrapper/elearn-course-wrapper.component';
import { ElearnLayoutComponent } from '../../../layouts/public/elearn-layout/elearn-layout.component';
import { NgxPaginationModule } from "ngx-pagination";

@NgModule({
  declarations: [
    PublicCourseHomeComponent,
    PublicCourseListComponent,
    PublicCourseDetailsComponent,
    PublicCategoryComponent,
    PublicRelatedCoursesComponent,
    CourseShellComponent,
    ElearnCourseWrapperComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    PublicCourseRoutingModule,
    SharedModule,
    NgxPaginationModule,
    LearningCourseIframeComponent,
    ElearnLayoutComponent,
    FixMojibakeSafeHtmlPipe
  ],
  exports: [
    PublicCategoryComponent,
    PublicCourseListComponent,
    PublicCourseDetailsComponent,
    ElearnCourseWrapperComponent
  ]
})
export class PublicCourseModule { }

