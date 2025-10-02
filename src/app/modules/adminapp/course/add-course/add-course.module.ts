import { NgModule } from '@angular/core';

import { RouterModule, Routes } from '@angular/router';
import { AddCourseComponent } from './add-course.component';

const routes: Routes = [
    {
        path: '',
        component: AddCourseComponent
    }
  ];

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forChild(routes)
  ]
})
export class AddCourseModule { }
