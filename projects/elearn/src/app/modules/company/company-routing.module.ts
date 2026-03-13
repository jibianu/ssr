
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Role } from 'src/app/shared/models/role';
import { CourseDetailsComponent } from 'src/app/sharedModules/course-details/course-details.component';
import { CurriculumDetailsComponent } from 'src/app/sharedModules/curriculum-details/curriculum-details.component';
// import { CurriculumQuestionsComponent } from 'src/app/sharedModules/curriculum-details/curriculum-questions/curriculum-questions.component';
import { SharedCurriculumListComponent } from 'src/app/sharedModules/CurriculumList/shared-curriculum-list.component';
// import { ExamTestComponent } from 'src/app/sharedModules/exam-test/exam-test.component';
import { PracticeQuestionsComponent } from 'src/app/sharedModules/practice-questions/practice-questions.component';
import { QuestionsBankComponent } from 'src/app/sharedModules/questions-bank/questions-bank.component';
import { TestDetailsComponent } from 'src/app/sharedModules/test-details/test-details.component';
import { TestListComponent } from 'src/app/sharedModules/test-list/test-list.component';
import { CurriculumListComponent } from '../adminapp/curriculum/curriculum-list/curriculum-list.component';
import { StudentCourseDetailsComponent } from '../student/student-course-details/student-course-details.component';
import { StudentCurriculumQuestionsComponent } from '../student/student-curriculum-details/student-curriculum-questions/student-curriculum-questions.component';
import { StudentCurriculumListComponent } from '../student/student-curriculum-list/student-curriculum-list.component';
import { ComapanyDashboardComponent } from './company-dashboard/comapny-dashboard.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadChildren: () => import('./company-analytics-dashboard/company-analytics-dashboard.module').then(m => m.CompanyAnalyticsDashboardModule) },
  { path: 'courses', component: ComapanyDashboardComponent },
  {
    path: '',
    loadChildren: () => import('./../../sharedModules/shared-modules.module').then(m => m.SharedModulesModule),
    data: { roles: [Role.Company] }
  },
  // {
  //   path: 'details',
  //   component: CourseDetailsComponent,
  //   children: [
  //     {
  //       path: 'curriculum-list/:courseId',
  //       component: SharedCurriculumListComponent,
  //       data: { roles: [Role.Company] }
  //     },
  //     {
  //       path: 'curriculum-details/:curriculumId',
  //       component: CurriculumDetailsComponent,
  //       data: { curriculumRole: [Role.Company] }
  //     },
  //     {
  //       path: 'test-list/:courseId',
  //       component: TestListComponent,
  //       data: { testRole: [Role.Company] }
  //     },
  //     {
  //       path: 'test-details/:questionSetId',
  //       component: TestDetailsComponent,
  //       data: { testDetailRole: [Role.Company] }
  //     },
  //   ],
  //   data: { role: [Role.Company] }
  // },
  // { path: 'exam-test/:questionSetId', component: ExamTestComponent },
  // { path: 'curriculum-questions/:curriculumId', component: CurriculumQuestionsComponent },
  // { path: 'question-bank/:courseId', component: QuestionsBankComponent,data: { questionRole: [Role.Company] } },
  // { path: 'practice-question/:courseId/:difficultyId', component: PracticeQuestionsComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CompanyRoutingModule { }