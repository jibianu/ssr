import { UserProfileComponent } from './shared/component/user-profile/user-profile.component';
import { Role } from './shared/models/role';
import { CommonComponent } from './layouts/common/common.component';
import { StudentLayoutSwitcherComponent } from './layouts/student/layout-switcher/layout-switcher.component';
import { PublicLayoutComponent } from './layouts/public/public-layout.component';
import { AdminLayoutComponent } from './layouts/admin/admin-layout.component';
import { TrainerLayoutComponent } from './layouts/trainer/trainer-layout.component';
import { AffiliateLayoutComponent } from './layouts/affiliate/affiliate-layout.component';
import { CompanyLayoutComponent } from './layouts/company/company-layout.component';
import { ManagementLayoutComponent } from './layouts/management/management-layout.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule, ExtraOptions, PreloadAllModules } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { UserValidationGuard } from './core/guards/user-validation.guard';
import { RoleGuard } from './core/guards/role.guard';
import { UnauthorizedComponent } from './shared/component/unauthorized/unauthorized.component';
import { AUTH_ROUTES } from './modules/auth/auth-routing.module';

const routerOptions: ExtraOptions = {
  scrollPositionRestoration: 'enabled',
  anchorScrolling: 'enabled',
  scrollOffset: [0, 64],
  preloadingStrategy: PreloadAllModules,
};

const routes: Routes = [
  ...AUTH_ROUTES,
  {
    path: 'checkout',
    loadChildren: () => import('./modules/payment/payment.module').then(m => m.PaymentModule)
  },
  {
    path: 'affiliate/dashboard',
    redirectTo: 'app/affiliate/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'affiliate',
    loadChildren: () => import('./modules/affiliate/affiliate.module').then(m => m.AffiliateModule)
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: 'app',
    canActivate: [AuthGuard, UserValidationGuard],
    children: [
    {
      path: 'admin',
      component: AdminLayoutComponent,
      canActivate: [RoleGuard],
      loadChildren: () => import('./modules/adminapp/adminapp.module').then(m => m.AdminappModule),
      data: { roles: [Role.Admin] }
    },
    {
      path: 'student',
      component: StudentLayoutSwitcherComponent,
      canActivate: [RoleGuard],
      loadChildren: () => import('./modules/student/student.module').then(m => m.StudentModule),
      data: { roles: [Role.Student] }
    },
    {
      path: 'trainer',
      component: TrainerLayoutComponent,
      canActivate: [RoleGuard],
      loadChildren: () => import('./modules/trainer/trainer.module').then(m => m.TrainerModule),
      data: { roles: [Role.Trainer] }
    },
    {
      path: 'affiliate',
      component: AffiliateLayoutComponent,
      canActivate: [AuthGuard, UserValidationGuard],
      loadChildren: () => import('./modules/affiliate/affiliate.module').then(m => m.AffiliateModule)
    },
    {
      path: 'company',
      component: CompanyLayoutComponent,
      canActivate: [RoleGuard],
      loadChildren: () => import('./modules/company/company.module').then(m => m.CompanyModule),
      data: { roles: [Role.Company] }
    },
    {
      path: 'management',
      component: ManagementLayoutComponent,
      canActivate: [RoleGuard],
      loadChildren: () => import('./modules/management/management.module').then(m => m.ManagementModule),
      data: { roles: [Role.Manager] }
    },
    {
      path: 'payment',
      // component: CommonComponent,
      loadChildren: () => import('./modules/payment/payment.module').then(m => m.PaymentModule),
      // data: { roles: [Role.Student] }
    },
    {
      path: 'profile',
      component: UserProfileComponent,
    },
    ],
  },
  {
    path: '',
    component: PublicLayoutComponent,
    loadChildren: () => import('./modules/publicapp/publicapp.module').then(m => m.PublicappModule),
    // canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/', pathMatch:'full' }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, routerOptions)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
