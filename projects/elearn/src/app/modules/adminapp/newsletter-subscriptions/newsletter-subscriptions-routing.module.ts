import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NewsletterSubscriptionsListComponent } from './newsletter-subscriptions-list/newsletter-subscriptions-list.component';

const routes: Routes = [
  { path: '', component: NewsletterSubscriptionsListComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class NewsletterSubscriptionsRoutingModule {}
