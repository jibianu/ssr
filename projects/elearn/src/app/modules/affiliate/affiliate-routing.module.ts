import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AffiliateRegisterComponent } from './affiliate-register/affiliate-register.component';
import { AffiliateDashboardComponent } from './affiliate-dashboard/affiliate-dashboard.component';
import { AffiliateOnboardingComponent } from './affiliate-onboarding/affiliate-onboarding.component';
import { AuthGuard } from '../../core/guards/auth.guard';

const routes: Routes = [
  { path: 'register', component: AffiliateRegisterComponent },
  { path: 'onboarding', component: AffiliateOnboardingComponent, canActivate: [AuthGuard] },
  { path: 'profile', component: AffiliateOnboardingComponent, canActivate: [AuthGuard] },
  { path: 'dashboard', component: AffiliateDashboardComponent, canActivate: [AuthGuard] },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AffiliateRoutingModule {}
