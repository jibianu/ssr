import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AuthGuard } from "../../core/guards/auth.guard";
import { CheckoutComponent } from "./checkout/checkout.component";
import { EventCheckoutComponent } from "./event-checkout/event-checkout.component";
import { MembershipCheckoutComponent } from "./membership-checkout/membership-checkout.component";
import { PaymentFailedComponent } from "./payment-failed/payment-failed.component";
import { PaymentSuccessComponent } from "./payment-success/payment-success.component";

const routes: Routes = [
    { path: 'success', component: PaymentSuccessComponent },
    { path: 'failed', component: PaymentFailedComponent },
    { path: 'membership/:planId', component: MembershipCheckoutComponent, canActivate: [AuthGuard] },
    { path: 'event/:eventId', component: EventCheckoutComponent, canActivate: [AuthGuard] },
    { path: ':courseId', component: CheckoutComponent, canActivate: [AuthGuard] },
  ];

  @NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
  })
  export class PaymentRoutingModule { }