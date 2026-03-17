import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlugResolverComponent } from './slug-resolver.component';
import { SlugResolverRoutingModule } from './slug-resolver-routing.module';
import { PublicCourseModule } from '../public-course/public-course.module';
import { BlogDetailComponent } from '../blog/blog-detail/blog-detail.component';
import { PublicEventModule } from '../public-event/public-event.module';

@NgModule({
  imports: [
    CommonModule,
    SlugResolverRoutingModule,
    PublicCourseModule,
    BlogDetailComponent,
    PublicEventModule,
    SlugResolverComponent
  ]
})
export class SlugResolverModule {}
