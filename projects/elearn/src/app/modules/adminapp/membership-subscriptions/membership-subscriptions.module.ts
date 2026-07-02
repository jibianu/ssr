import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MembershipSubscriptionsRoutingModule } from './membership-subscriptions-routing.module';
import { MembershipSubscriptionsListComponent } from './membership-subscriptions-list/membership-subscriptions-list.component';

@NgModule({
  declarations: [MembershipSubscriptionsListComponent],
  imports: [CommonModule, FormsModule, MembershipSubscriptionsRoutingModule]
})
export class MembershipSubscriptionsModule {}
