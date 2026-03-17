import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { BlogListComponent } from './blog-list/blog-list.component';
import { BlogAddEditComponent } from './blog-add-edit/blog-add-edit.component';
import { BlogReviewComponent } from './blog-review/blog-review.component';

const routes: Routes = [
  { path: 'list', component: BlogListComponent },
  { path: 'review', component: BlogReviewComponent },
  { path: 'add', component: BlogAddEditComponent },
  { path: 'edit/:id', component: BlogAddEditComponent },
  { path: '', redirectTo: 'list', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlogRoutingModule { }
