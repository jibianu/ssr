import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagementDashboardComponent } from './management-dashboard/management-dashboard.component';
import { ManagementPermissionGuard } from '../../core/guards/management-permission.guard';

const routes: Routes = [
  { path: 'dashboard', component: ManagementDashboardComponent },
  { path: 'revenue', loadChildren: () => import('../adminapp/revenue/admin-revenue.module').then(m => m.AdminRevenueModule) },
  {
    path: '',
    loadChildren: () => import('../adminapp/user/user.module').then(m => m.UserModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'course',
    loadChildren: () => import('../adminapp/course/course.module').then(m => m.CourseModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'category',
    loadChildren: () => import('../adminapp/category/category.module').then(m => m.CategoryModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'blog',
    loadChildren: () => import('../adminapp/blog/blog.module').then(m => m.BlogModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'blog-users',
    loadChildren: () => import('../adminapp/blog-users/blog-users.module').then(m => m.BlogUsersModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'newsletter-subscriptions',
    loadChildren: () => import('../adminapp/newsletter-subscriptions/newsletter-subscriptions.module').then(m => m.NewsletterSubscriptionsModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'loop-marketing',
    loadChildren: () => import('../adminapp/loop-marketing/loop-marketing.module').then(m => m.LoopMarketingModule),
    canActivate: [ManagementPermissionGuard]
  },
  {
    path: 'trainer-payouts',
    loadChildren: () => import('../adminapp/trainer-payouts/admin-trainer-payouts.module').then(m => m.AdminTrainerPayoutsModule)
  },
  {
    path: 'affiliates',
    loadChildren: () => import('../adminapp/affiliates/admin-affiliates.module').then(m => m.AdminAffiliatesModule)
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagementRoutingModule{}