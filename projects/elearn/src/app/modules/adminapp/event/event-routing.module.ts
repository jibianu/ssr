import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EventListComponent } from './event-list/event-list.component';
import { EventAddComponent } from './event-add/event-add.component';
import { EventEditComponent } from './event-edit/event-edit.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';

const routes: Routes = [
  { path: '', pathMatch: 'full', component: EventListComponent },
  { path: 'add', component: EventAddComponent },
  { path: 'create', redirectTo: 'add', pathMatch: 'full' },
  { path: 'edit/:id', component: EventEditComponent },
  { path: 'users', pathMatch: 'full', redirectTo: '' },
  { path: 'users/:id', component: EventUserListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EventRoutingModule {}
