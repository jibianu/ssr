import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElearnCourseRoutingModule } from './elearn-course-routing.module';
import { PublicCourseModule } from '../publicapp/public-course/public-course.module';

@NgModule({
  imports: [
    CommonModule,
    ElearnCourseRoutingModule,
    PublicCourseModule
  ]
})
export class ElearnCourseModule {}
