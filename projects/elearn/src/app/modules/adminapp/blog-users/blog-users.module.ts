import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BlogUsersRoutingModule } from './blog-users-routing.module';
import { BlogUsersListComponent } from './blog-users-list/blog-users-list.component';
import { SharedModule } from '../../../shared/shared.module';

@NgModule({
  declarations: [BlogUsersListComponent],
  imports: [
    CommonModule,
    BlogUsersRoutingModule,
    SharedModule
  ]
})
export class BlogUsersModule {}
