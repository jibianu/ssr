import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrainerEarningsComponent } from './trainer-earnings.component';

const routes: Routes = [
  { path: '', component: TrainerEarningsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TrainerEarningsRoutingModule {}
