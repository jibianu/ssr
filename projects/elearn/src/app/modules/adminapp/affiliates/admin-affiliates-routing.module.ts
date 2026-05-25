import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAffiliatesComponent } from './admin-affiliates.component';
import { AllowCoursesComponent } from './allow-courses/allow-courses.component';
import { CampaignLinksComponent } from './campaign-links/campaign-links.component';

const routes: Routes = [
  { path: 'allow-courses', component: AllowCoursesComponent },
  { path: 'campaign-links', component: CampaignLinksComponent },
  { path: '', component: AdminAffiliatesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAffiliatesRoutingModule {}
