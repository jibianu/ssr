import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminRevenueComponent } from './admin-revenue.component';

const routes: Routes = [
  { path: '', component: AdminRevenueComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRevenueRoutingModule {}
