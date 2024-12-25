import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  { path: 'user', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
  { path: 'course', loadChildren: () => import('./course/course.module').then(m => m.CourseModule) },
  { path: 'category', loadChildren: () => import('./category/category.module').then(m => m.CategoryModule) },
  { path: 'location', loadChildren: () => import('./location/location.module').then(m => m.LocationModule) },
  { path: 'icon', loadChildren: () => import('./icon/icon.module').then(m => m.IconModule) }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminappRoutingModule { }
