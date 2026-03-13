import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { CoursePreviewComponent } from './course-preview.component';

const routes: Routes = [
    {
        path: '',
        component: CoursePreviewComponent
    }
  ];

@NgModule({
  declarations: [CoursePreviewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    NgxPaginationModule,
    ReactiveFormsModule,
    SharedModule
  ]
})
export class CoursePreviewModule { }
