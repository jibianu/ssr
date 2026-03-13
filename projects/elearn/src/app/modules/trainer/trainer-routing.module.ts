import { TrainerProfileComponent } from './trainer-profile/trainer-profile.component';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
import { TrainerAnalyticsDashboardComponent } from './trainer-analytics-dashboard/trainer-analytics-dashboard.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TrainerCourseDetailsComponent } from './trainer-course-details/trainer-course-details.component';
import { Role } from 'src/app/shared/models/role';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'certificate', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'categories', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: TrainerAnalyticsDashboardComponent },
  { path: 'earnings', loadChildren: () => import('./trainer-earnings/trainer-earnings.module').then(m => m.TrainerEarningsModule) },
  { path: 'payout', loadChildren: () => import('./trainer-payout/trainer-payout.module').then(m => m.TrainerPayoutModule) },
  { path: 'course/list', component: TrainerDashboardComponent },
  { path: 'courses', component: TrainerDashboardComponent },
  { path: 'course', redirectTo: 'course/list', pathMatch: 'full' },
  { path: 'course', loadChildren: () => import('./../adminapp/course/course.module').then(m => m.CourseModule) },
  { path: 'profile', component: TrainerProfileComponent },
  { path: 'course-details/:courseId', component: TrainerCourseDetailsComponent },
  { path: 'events', loadChildren: () => import('../adminapp/event/event.module').then(m => m.EventModule) },
  {
    path: '',
    loadChildren: () => import('./../../sharedModules/shared-modules.module').then(m => m.SharedModulesModule),
    data: { userRole: [Role.Trainer], roles: [Role.Trainer] }
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TrainerRoutingModule { }
