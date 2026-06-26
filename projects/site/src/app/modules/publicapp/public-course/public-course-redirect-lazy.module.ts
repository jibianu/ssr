import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RedirectCoursesToSlugComponent } from './redirect-courses-to-slug/redirect-courses-to-slug.component';

const routes: Routes = [
  { path: ':courseSlug', component: RedirectCoursesToSlugComponent }
];

@NgModule({
  imports: [RedirectCoursesToSlugComponent, RouterModule.forChild(routes)]
})
export class PublicCourseRedirectLazyModule {}
