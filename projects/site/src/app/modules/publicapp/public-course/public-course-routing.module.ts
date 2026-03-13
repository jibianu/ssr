import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { CourseShellComponent } from './course-shell/course-shell.component';

const routes: Routes = [
  // ✅ Course shell: parent route :courseSlug has resolver; this shows public vs learning view
  {
    path: '',
    component: CourseShellComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PublicCourseRoutingModule { }
