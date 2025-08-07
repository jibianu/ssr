import { InternalAuthGuard } from './../../../core/guards/internal-auth.guard';
import { UserProfileComponent } from './user-profile/user-profile.component';
import { AddUserComponent } from './add-user/add-user.component';
import { UserListComponent } from './user-list/user-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
  {
    path: 'list',
    component: UserListComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'edit/:id',
    component: AddUserComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'profile',
    component: UserProfileComponent,
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
export class UserRoutingModule { }
