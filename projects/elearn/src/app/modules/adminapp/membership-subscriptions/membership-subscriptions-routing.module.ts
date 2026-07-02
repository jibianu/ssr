import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MembershipSubscriptionsListComponent } from './membership-subscriptions-list/membership-subscriptions-list.component';

const routes: Routes = [
  { path: '', component: MembershipSubscriptionsListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MembershipSubscriptionsRoutingModule {}
