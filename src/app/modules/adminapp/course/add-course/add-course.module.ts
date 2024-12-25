import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { AddCourseComponent } from './add-course.component';
import { CourseRoutingModule } from '../course-routing.module';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
    {
        path: '',
        component: AddCourseComponent
    }
  ];

@NgModule({
  declarations: [AddCourseComponent],
  imports: [
    CommonModule,
    CourseRoutingModule,
    RouterModule.forChild(routes),
    NgxPaginationModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class AddCourseModule { }
