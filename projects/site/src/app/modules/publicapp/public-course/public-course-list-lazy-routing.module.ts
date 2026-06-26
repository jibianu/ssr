import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';
import { RouteSeoData } from '../../../shared/interfaces/route-seo.interface';

const routes: Routes = [
  {
    path: '',
    component: PublicCourseListComponent,
    data: {
      seo: {
        title: 'All Courses - Oilandgasclub',
        description: 'Browse the complete list of Oilandgasclub courses and training programs.',
        type: 'website'
      }
    } as RouteSeoData
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseListLazyRoutingModule {}
