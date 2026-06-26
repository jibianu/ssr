import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventDetailsComponent } from './event-details/event-details.component';
import { EventsComponent } from './events/events.component';
import {  RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';
import { SharedModule } from 'src/app/shared/shared.module';
import { EventResolverService } from 'src/app/core/resolver/event-url.resover';
import { PaymentSuccessComponent } from './payments/sucess.component';
import { PaymentErrorComponent } from './payments/error.component';
import { PaymentCardComponent } from './payments/payment-card.component';

const routes : Routes=[
  {
    path:'',
    component:EventsComponent
  },
  {
    path:'payment/success',
    component:PaymentSuccessComponent
  },
  {
    path:'payment/error',
    component:PaymentErrorComponent
  },
  {
    path: ':url',
    component:EventDetailsComponent,
    resolve:{event:EventResolverService},
  },
]

@NgModule({
  declarations: [
    EventDetailsComponent,
    EventsComponent,
    PaymentSuccessComponent,
    PaymentErrorComponent,
    PaymentCardComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    NgMultiSelectDropDownModule.forRoot(),
    SharedModule
  ],
  exports: [EventDetailsComponent]
})
export class PublicEventModule { }
