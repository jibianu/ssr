import { NgModule } from '@angular/core';
import { PublicCourseModule } from './public-course.module';
import { PublicCourseFeatureRoutingModule } from './public-course-feature-routing.module';
import { RedirectCoursesToSlugComponent } from './redirect-courses-to-slug/redirect-courses-to-slug.component';

/** Lazy-loaded course catalog routes (/courses, /list, /category/:name, legacy redirects). */
@NgModule({
  imports: [
    PublicCourseModule,
    PublicCourseFeatureRoutingModule,
    RedirectCoursesToSlugComponent
  ]
})
export class PublicCourseFeatureModule {}
