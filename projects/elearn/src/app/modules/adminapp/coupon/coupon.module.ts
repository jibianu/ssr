import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CouponRoutingModule } from './coupon-routing.module';
import { CouponListComponent } from './coupon-list/coupon-list.component';
import { CouponFormComponent } from './coupon-form/coupon-form.component';
import { CouponUsageComponent } from './coupon-usage/coupon-usage.component';

@NgModule({
  declarations: [CouponListComponent, CouponFormComponent, CouponUsageComponent],
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CouponRoutingModule]
})
export class CouponModule {}
