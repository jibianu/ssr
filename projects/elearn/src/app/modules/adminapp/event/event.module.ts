import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventRoutingModule } from './event-routing.module';
import { EventListComponent } from './event-list/event-list.component';
import { EventAddComponent } from './event-add/event-add.component';
import { EventEditComponent } from './event-edit/event-edit.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  declarations: [
    EventListComponent,
    EventUserListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EventRoutingModule,
    SharedModule,
    EventAddComponent,
    EventEditComponent
  ]
})
export class EventModule {}
