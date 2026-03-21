import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsletterSubscriptionsRoutingModule } from './newsletter-subscriptions-routing.module';
import { NewsletterSubscriptionsListComponent } from './newsletter-subscriptions-list/newsletter-subscriptions-list.component';
import { SharedModule } from '../../../shared/shared.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [NewsletterSubscriptionsListComponent],
  imports: [
    CommonModule,
    FormsModule,
    NewsletterSubscriptionsRoutingModule,
    SharedModule
  ]
})
export class NewsletterSubscriptionsModule {}
