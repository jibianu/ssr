import { NgModule } from '@angular/core';
import { BlogRoutingModule } from './blog-routing.module';
import { BlogListComponent } from './blog-list/blog-list.component';

@NgModule({
  imports: [
    BlogRoutingModule,
    BlogListComponent
  ],
  exports: [BlogRoutingModule]
})
export class BlogModule {}
