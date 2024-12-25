import { InternalAuthGuard } from './../../../core/guards/internal-auth.guard';
import { AddCategoryComponent } from './add-category/add-category.component';
import { CategoryListComponent } from './category-list/category-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: 'list',
    component: CategoryListComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'add',
    component: AddCategoryComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'edit/:id',
    component: AddCategoryComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CategoryRoutingModule { }
