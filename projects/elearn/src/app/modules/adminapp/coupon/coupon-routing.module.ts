import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CouponListComponent } from './coupon-list/coupon-list.component';
import { CouponFormComponent } from './coupon-form/coupon-form.component';
import { CouponUsageComponent } from './coupon-usage/coupon-usage.component';

const routes: Routes = [
  { path: '', component: CouponListComponent },
  { path: 'create', component: CouponFormComponent },
  { path: 'edit/:id', component: CouponFormComponent },
  { path: 'usage', component: CouponUsageComponent },
  { path: 'usage/:couponId', component: CouponUsageComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CouponRoutingModule {}
