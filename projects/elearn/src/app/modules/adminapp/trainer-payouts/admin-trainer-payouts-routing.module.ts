import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminTrainerPayoutsComponent } from './admin-trainer-payouts.component';

const routes: Routes = [
  { path: '', component: AdminTrainerPayoutsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminTrainerPayoutsRoutingModule {}
