import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrainerPayoutComponent } from './trainer-payout.component';

const routes: Routes = [
  { path: '', component: TrainerPayoutComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerPayoutRoutingModule {}
