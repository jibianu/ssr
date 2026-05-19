import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UserRoutingModule } from './user-routing.module';
import { UserListComponent } from './user-list/user-list.component';
import { AddUserComponent } from './add-user/add-user.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { StudentListComponent } from './student-list/student-list.component';
import { TrainerListComponent } from './trainer-list/trainer-list.component';
import { CompanyListComponent } from './company-list/company-list.component';
import { AdminCompanyStudentsDrawerComponent } from './company-list/admin-company-students-drawer.component';
import { AdminCompanyTrainersDrawerComponent } from './company-list/admin-company-trainers-drawer.component';
import { ManagementListComponent } from './management-list/management-list.component';
import { SendNotificationComponent } from './send-notification/send-notification.component';
import { NotificationListComponent } from './notification-list/notification-list.component';
import { NotificationHistoryComponent } from './notification-history/notification-history.component';
import { ContentPermissionRequestsComponent } from './content-permission-requests/content-permission-requests.component';
import { UserProfileComponent } from './user-profile/user-profile.component';

@NgModule({
  declarations: [UserListComponent, AddUserComponent, StudentListComponent, TrainerListComponent, CompanyListComponent, AdminCompanyStudentsDrawerComponent, AdminCompanyTrainersDrawerComponent, ManagementListComponent, SendNotificationComponent, NotificationListComponent, NotificationHistoryComponent, ContentPermissionRequestsComponent, UserProfileComponent],
  imports: [
    CommonModule,
    UserRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    NgxPaginationModule,
    SharedModule
  ]
})
export class UserModule { }
