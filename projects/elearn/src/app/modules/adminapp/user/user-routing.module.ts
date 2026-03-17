import { ManagementListComponent } from './management-list/management-list.component';
import { TrainerListComponent } from './trainer-list/trainer-list.component';
import { CompanyListComponent } from './company-list/company-list.component';
import { StudentListComponent } from './student-list/student-list.component';
import { SendNotificationComponent } from './send-notification/send-notification.component';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { NotificationHistoryComponent } from './notification-history/notification-history.component';
import { ContentPermissionRequestsComponent } from './content-permission-requests/content-permission-requests.component';
import { InternalAuthGuard } from './../../../core/guards/internal-auth.guard';
import { AddUserComponent } from './add-user/add-user.component';
import { UserListComponent } from './user-list/user-list.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { UserProfileComponent } from 'src/app/shared/component/user-profile/user-profile.component';

const routes: Routes = [
  {
    path: 'students',
    component: StudentListComponent,
    // canActivate: [InternalAuthGuard]
  },
  {
    path: 'companies',
    component: CompanyListComponent,
    // canActivate: [InternalAuthGuard]
  },
  {
    path: 'trainers',
    component: TrainerListComponent,
    // canActivate: [InternalAuthGuard]
  },
  {
    path: 'management',
    component: ManagementListComponent,
    // canActivate: [InternalAuthGuard]
  },
  {
    path: 'profile',
    component: UserProfileComponent,
    // canActivate: [InternalAuthGuard]
  },
  {
    path: 'notifications',
    component: SendNotificationComponent,
  },
  {
    path: 'notification-list',
    component: NotificationListComponent,
  },
  {
    path: 'notification-history',
    component: NotificationHistoryComponent,
  },
  {
    path: 'content-permission-requests',
    component: ContentPermissionRequestsComponent,
  },
  // {
  //   path: 'edit/:id',
  //   component: AddUserComponent,
  //   canActivate: [InternalAuthGuard]
  // },
  {
    path: '',
    redirectTo: 'students',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserRoutingModule { }
