import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { EventsComponent } from './events.component';
import { FormsModule } from '@angular/forms';
import { NgbAccordionModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

const routes: Routes = [
  {
    path: '',
    component: EventsComponent
  }
];

@NgModule({
  declarations: [
    EventsComponent
  ],
  imports: [
    CommonModule,
    NgbAccordionModule,
    NgbDropdownModule,
    FormsModule,
    RouterModule.forChild(routes),
  ]
})
export class EventsModule { }
