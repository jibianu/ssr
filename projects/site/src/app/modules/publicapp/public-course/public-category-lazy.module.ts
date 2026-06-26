import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PublicCategoryComponent } from './public-category/public-category.component';
import { PublicCourseModule } from './public-course.module';

const routes: Routes = [
  { path: ':name', component: PublicCategoryComponent }
];

@NgModule({
  imports: [PublicCourseModule, RouterModule.forChild(routes)]
})
export class PublicCategoryLazyModule {}
