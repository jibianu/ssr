import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventDetailsComponent } from './event-details/event-details.component';
import { EventsComponent } from './events/events.component';
import {  RouterModule, Routes } from '@angular/router';
import { NgbAccordionModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { SharedModule } from 'src/app/shared/shared.module';
import { EventResolverService } from 'src/app/core/resolver/event-url.resover';
import { PaymentSuccessComponent } from './payments/sucess.component';
import { PaymentErrorComponent } from './payments/error.component';

const routes : Routes=[
  {
    path:'',
    component:EventsComponent
  },
  {
    path: ':url',
    component:EventDetailsComponent,
    resolve:{event:EventResolverService},
  },
  {
    path:'payment/success',
    component:PaymentSuccessComponent
  },
  {
    path:'payment/error',
    component:PaymentErrorComponent
  }
]

@NgModule({
  declarations: [
    EventDetailsComponent,
    EventsComponent,PaymentSuccessComponent,PaymentErrorComponent
  ],
  imports: [
    CommonModule,RouterModule.forChild(routes),
    NgbAccordionModule,
    NgbDropdownModule,
    FormsModule,
    ReactiveFormsModule,
    NgMultiSelectDropDownModule.forRoot(),
    SharedModule,
  ]
})
export class PublicEventModule { }
