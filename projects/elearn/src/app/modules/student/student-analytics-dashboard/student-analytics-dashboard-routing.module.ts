import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentAnalyticsDashboardComponent } from './student-analytics-dashboard.component';

const routes: Routes = [
  { path: '', component: StudentAnalyticsDashboardComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class StudentAnalyticsDashboardRoutingModule {}
