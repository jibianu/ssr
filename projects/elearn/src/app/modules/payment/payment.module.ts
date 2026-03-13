import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared/shared.module';
import { PaymentRoutingModule } from './payment-routing.module';
import { CheckoutComponent } from './checkout/checkout.component';
import { EventCheckoutComponent } from './event-checkout/event-checkout.component';
import { PaymentSuccessComponent } from './payment-success/payment-success.component';
import { PaymentFailedComponent } from './payment-failed/payment-failed.component';
import { PaymentRedirectComponent } from './payment-redirect/payment-redirect.component';

@NgModule({
  declarations: [
    CheckoutComponent,
    EventCheckoutComponent,
    PaymentSuccessComponent,
    PaymentFailedComponent,
    PaymentRedirectComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    PaymentRoutingModule
  ]
})
export class PaymentModule { }
