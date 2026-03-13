import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddEventComponent } from './add-event/add-event.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
// ✅ REMOVED: FilterPipeModule (ngx-filter-pipe not Ivy compatible) and Ng2SearchPipeModule - using component-based filtering
import { RouterModule, Routes } from '@angular/router';
import { InternalAuthGuard } from 'src/app/core/guards/internal-auth.guard';
import { EventListComponent } from './event-list/event-list.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';
import { EventUserListLandingComponent } from './event-user-list-landing/event-user-list-landing.component';
//import { EventRoutingModule } from './event-routing.module';

const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: EventListComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'add',
    component: AddEventComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'edit/:id',
    component: AddEventComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'edit/:id/:isNew',
    component: AddEventComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'users',
    component: EventUserListLandingComponent,
    canActivate: [InternalAuthGuard]
  },
  {
    path: 'users/:id',
    component: EventUserListComponent,
    canActivate: [InternalAuthGuard]
  },
];

@NgModule({
  declarations: [
    AddEventComponent,EventListComponent,EventUserListComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgxPaginationModule,
    SharedModule,
    EventUserListLandingComponent,
    RouterModule.forChild(routes)
  ],
})
export class EventModule { }
