import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CourseGuard } from '../../../core/guards/course.guard';
import { CourseLayoutSwitcherComponent } from './course-layout-switcher.component';
import { PublicCourseDetailsComponent } from '../public-course/public-course-details/public-course-details.component';

const routes: Routes = [
  {
    path: '',
    component: CourseLayoutSwitcherComponent,
    children: [
      {
        path: ':url',
        canActivate: [CourseGuard],
        component: PublicCourseDetailsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CourseLayoutSwitcherRoutingModule {}
