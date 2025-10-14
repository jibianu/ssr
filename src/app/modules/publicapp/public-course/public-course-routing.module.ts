import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
import { publicCourseDetailsResolver } from './public-course-details/public-course-details.resolver';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';

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
    path: ':url/:location',
    resolve:{
      courseDetails:publicCourseDetailsResolver
    },
    component: PublicCourseDetailsComponent,
  },
  {
    path: ':url',
    resolve:{
      courseDetails: publicCourseDetailsResolver
    },
    component: PublicCourseDetailsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseRoutingModule { }
