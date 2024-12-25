import { CourseLocationGuard } from './../../../core/guards/course-location.guard';
// import { CourseGuard } from './../../../core/guards/course.guard';

import { PublicCourseListComponent } from './public-course-list/public-course-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { CourseResoverService } from 'src/app/core/resolver/course-url.resover';

const routes: Routes = [

 
    {
    path: 'list',
    component: PublicCourseListComponent,
  },
  {
    path: 'category/:name',
    component: PublicCategoryComponent,
  },

  {
    path: '',
    component: PublicCourseHomeComponent,
  },

   {
    path: ':url',
    // canActivate: [CourseGuard],
    resolve:{course:CourseResoverService},
    component: PublicCourseDetailsComponent,
  },
  {
    path: ':url/:location',
    canActivate: [CourseLocationGuard],
    component: PublicCourseDetailsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseRoutingModule { }
