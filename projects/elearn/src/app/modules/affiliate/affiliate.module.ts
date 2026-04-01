import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateRoutingModule } from './affiliate-routing.module';
import { AffiliateRegisterComponent } from './affiliate-register/affiliate-register.component';
import { AffiliateDashboardComponent } from './affiliate-dashboard/affiliate-dashboard.component';
import { AffiliateOnboardingComponent } from './affiliate-onboarding/affiliate-onboarding.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AffiliateRegisterComponent,
    AffiliateDashboardComponent,
    AffiliateOnboardingComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    AffiliateRoutingModule
  ]
})
export class AffiliateModule {}
