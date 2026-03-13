import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminAffiliatesComponent } from './admin-affiliates.component';

const routes: Routes = [
  { path: '', component: AdminAffiliatesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAffiliatesRoutingModule {}
