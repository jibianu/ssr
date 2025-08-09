import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddEventComponent } from './add-event/add-event.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { SharedModule } from 'src/app/shared/shared.module';
import { RouterModule, Routes } from '@angular/router';
import { InternalAuthGuard } from 'src/app/core/guards/internal-auth.guard';
import { EventListComponent } from './event-list/event-list.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';


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
    
  ],
  imports: [


  ],
})
export class EventModule { }
