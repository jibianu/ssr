import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ElearnCourseWrapperComponent } from '../publicapp/public-course/elearn-course-wrapper/elearn-course-wrapper.component';

const routes: Routes = [
  {
    path: '',
    component: ElearnCourseWrapperComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ElearnCourseRoutingModule {}
