import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { EventDetailsComponent } from './event-details.component';
import { NgbAccordionModule, NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { SharedModule } from '../../../../shared/shared.module';

const routes: Routes = [
  {
    path: '',
    component: EventDetailsComponent
  }
];

@NgModule({
  declarations: [
    EventDetailsComponent
  ],
  imports: [
    CommonModule,
    NgbAccordionModule,
    NgbDropdownModule,
    NgbModalModule,
    FormsModule,
    NgMultiSelectDropDownModule.forRoot(),
    SharedModule,
    RouterModule.forChild(routes),
  ]
})
export class EventDetailsModule { }
