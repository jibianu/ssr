import { ChatComponent } from './../../shared/component/chat/chat.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { AdminBillingDashboardComponent } from './billing/admin-billing-dashboard.component';

const routes: Routes = [
  { path: 'billing', component: AdminBillingDashboardComponent },
  { path: 'dashboard', loadChildren: () => import('./dashboard/admin-dashboard.module').then(m => m.AdminDashboardModule) },
  { path: 'revenue', loadChildren: () => import('./revenue/admin-revenue.module').then(m => m.AdminRevenueModule) },
  { path: 'analytics', loadChildren: () => import('./analytics/admin-analytics.module').then(m => m.AdminAnalyticsModule) },
  { path: '', loadChildren: () => import('./user/user.module').then(m => m.UserModule) },
  { path: 'course', loadChildren: () => import('./course/course.module').then(m => m.CourseModule) },
  { path: 'category', loadChildren: () => import('./category/category.module').then(m => m.CategoryModule) },
  { path: 'blog', loadChildren: () => import('./blog/blog.module').then(m => m.BlogModule) },
  { path: 'blog-users', loadChildren: () => import('./blog-users/blog-users.module').then(m => m.BlogUsersModule) },
  { path: 'newsletter-subscriptions', loadChildren: () => import('./newsletter-subscriptions/newsletter-subscriptions.module').then(m => m.NewsletterSubscriptionsModule) },
  { path: 'loop-marketing', loadChildren: () => import('./loop-marketing/loop-marketing.module').then(m => m.LoopMarketingModule) },
  { path: 'events', loadChildren: () => import('./event/event.module').then(m => m.EventModule) },
  { path: 'chat', component: ChatComponent },
  { path: 'trainer-payouts', loadChildren: () => import('./trainer-payouts/admin-trainer-payouts.module').then(m => m.AdminTrainerPayoutsModule) },
  { path: 'affiliates', loadChildren: () => import('./affiliates/admin-affiliates.module').then(m => m.AdminAffiliatesModule) },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminappRoutingModule { }
