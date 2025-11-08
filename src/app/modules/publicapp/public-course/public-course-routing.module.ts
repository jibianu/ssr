import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicCourseDetailsComponent } from './public-course-details/public-course-details.component';
// ✅ REMOVED: publicCourseDetailsResolver - course data will be fetched manually on button click
import { PublicCourseHomeComponent } from './public-course-home/public-course-home.component';
import { PublicCourseListComponent } from './public-course-list/public-course-list.component';

const routes: Routes = [
  // ✅ Course detail routes - matched when parent has :url or :url/:location
  // The parent route (publicapp-routing) already matched the URL pattern
  // This module is lazy-loaded and provides the component with empty path
  // ✅ REMOVED: Resolver - course data will be fetched manually when user clicks "Load Course" button
  {
    path: '', // Empty path - parent route already matched :url or :url/:location
    component: PublicCourseDetailsComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseRoutingModule { }
