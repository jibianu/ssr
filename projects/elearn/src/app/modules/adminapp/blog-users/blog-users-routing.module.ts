import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlogUsersListComponent } from './blog-users-list/blog-users-list.component';

const routes: Routes = [
  { path: '', component: BlogUsersListComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BlogUsersRoutingModule {}
