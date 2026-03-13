import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AnalyticsStudentsListComponent } from './analytics-students-list/analytics-students-list.component';
import { AnalyticsStudentDetailComponent } from './analytics-student-detail/analytics-student-detail.component';
import { AnalyticsCoursesComponent } from './analytics-courses/analytics-courses.component';
import { AnalyticsDropOffComponent } from './analytics-drop-off/analytics-drop-off.component';
import { AnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';

const routes: Routes = [
  { path: '', component: AnalyticsStudentsListComponent },
  { path: 'dashboard', component: AnalyticsDashboardComponent },
  { path: 'student/:id', component: AnalyticsStudentDetailComponent },
  { path: 'courses', component: AnalyticsCoursesComponent },
  { path: 'drop-off', component: AnalyticsDropOffComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminAnalyticsRoutingModule {}
