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