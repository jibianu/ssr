import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { RedirectCoursesToSlugComponent } from './redirect-courses-to-slug/redirect-courses-to-slug.component';
import { RouteSeoData } from '../../../shared/interfaces/route-seo.interface';

const routes: Routes = [
  {
    path: '',
    component: PublicCourseHomeComponent,
    data: {
      seo: {
        title: 'Oil and Gas Courses | Professional Training Programs',
        description: 'Browse our comprehensive collection of oil and gas courses. From beginner to advanced levels, enhance your skills with industry-expert training.',
        keywords: 'oil and gas courses, petroleum training, energy education, professional development',
        type: 'website'
      }
    } as RouteSeoData
  },
  { path: ':url', component: RedirectCoursesToSlugComponent },
  { path: ':url/:location', component: RedirectCoursesToSlugComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseFeatureRoutingModule {}
