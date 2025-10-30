import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddEventComponent } from './add-event/add-event.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { FilterPipeModule } from 'ngx-filter-pipe';
import { SharedModule } from 'src/app/shared/shared.module';
// ✅ REMOVED: Ng2SearchPipeModule import no longer needed
// Replaced filterBy pipe with component-based filtering to avoid Angular 20 compatibility issue
import { RouterModule, Routes } from '@angular/router';
import { InternalAuthGuard } from 'src/app/core/guards/internal-auth.guard';
import { EventListComponent } from './event-list/event-list.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';
//import { EventRoutingModule } from './event-routing.module';

const routes:Routes=[
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
    path: 'users/:id',
    component: EventUserListComponent,
    canActivate: [InternalAuthGuard]
  },
]

@NgModule({
  declarations: [
    AddEventComponent,EventListComponent,EventUserListComponent
  ],
  imports: [
        CommonModule,
    ReactiveFormsModule,
    NgxPaginationModule,
      FilterPipeModule,
    SharedModule,
    // ✅ REMOVED: Ng2SearchPipeModule - replaced filterBy pipe with component-based filtering
    RouterModule.forChild(routes)
  ],
})
export class EventModule { }
