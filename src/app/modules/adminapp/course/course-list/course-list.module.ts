import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { UserCourseComponent } from '../user-course/user-course.component';
import { CourseListComponent } from './course-list.component';

const routes: Routes = [
    {
        path: '',
        component: CourseListComponent
    }
  ];

  @NgModule({
    declarations: [
      CourseListComponent 
    ],
    imports: [
      CommonModule,
      RouterModule,
      NgxPaginationModule,
      ReactiveFormsModule,
      SharedModule,
      RouterModule.forChild(routes),
      UserCourseComponent
    ]
  })
export class CourseListModule { }
