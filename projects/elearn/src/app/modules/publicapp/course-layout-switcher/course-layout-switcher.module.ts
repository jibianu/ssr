import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LayoutsModule } from '../../../layouts/layouts.module';
import { PublicCourseModule } from '../public-course/public-course.module';
import { CourseLayoutSwitcherComponent } from './course-layout-switcher.component';
import { CourseLayoutSwitcherRoutingModule } from './course-layout-switcher-routing.module';

@NgModule({
  declarations: [CourseLayoutSwitcherComponent],
  imports: [
    CommonModule,
    RouterModule,
    LayoutsModule,
    PublicCourseModule,
    CourseLayoutSwitcherRoutingModule
  ]
})
export class CourseLayoutSwitcherModule {}
