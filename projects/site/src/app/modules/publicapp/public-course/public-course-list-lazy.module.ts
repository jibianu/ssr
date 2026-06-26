import { NgModule } from '@angular/core';
import { PublicCourseModule } from './public-course.module';
import { PublicCourseListLazyRoutingModule } from './public-course-list-lazy-routing.module';

@NgModule({
  imports: [PublicCourseModule, PublicCourseListLazyRoutingModule]
})
export class PublicCourseListLazyModule {}
