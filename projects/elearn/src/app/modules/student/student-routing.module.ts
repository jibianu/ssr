import { StudentPracticeQuestionsComponent } from './student-practice-questions/student-practice-questions.component';
import { StudentQuestionsBankComponent } from './student-questions-bank/student-questions-bank.component';
import { StudentTestDetailsComponent } from './student-test-details/student-test-details.component';
import { StudentTestListComponent } from './student-test-list/student-test-list.component';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StudentCourseDetailsComponent } from './student-course-details/student-course-details.component';
import { StudentCurriculumDetailsComponent } from './student-curriculum-details/student-curriculum-details.component';
import { StudentCurriculumListComponent } from './student-curriculum-list/student-curriculum-list.component';
import { StudentCurriculumQuestionsComponent } from './student-curriculum-details/student-curriculum-questions/student-curriculum-questions.component';
import { StudentExamTestComponent } from './student-exam-test/student-exam-test.component';
import { Role } from 'src/app/shared/models/role';

const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadChildren: () => import('./student-analytics-dashboard/student-analytics-dashboard.module').then(m => m.StudentAnalyticsDashboardModule) },
  {
    path: '',
    loadChildren: () => import('./../../sharedModules/shared-modules.module').then(m => m.SharedModulesModule),
    data: { roles: [Role.Student] }
  },
  // {
  //   path: 'details',
  //   component: StudentCourseDetailsComponent,
  //   children: [
  //   {
  //     path: 'curriculum-list/:courseId',
  //     component: StudentCurriculumListComponent
  //   },
  //   {
  //     path: 'curriculum-details/:curriculumId',
  //     component: StudentCurriculumDetailsComponent
  //   },
  //   {
  //     path: 'test-list/:courseId',
  //     component: StudentTestListComponent
  //   },
  //   {
  //     path: 'test-details/:questionSetId',
  //     component: StudentTestDetailsComponent
  //   },
  //   ]
  // },
  // { path: 'curriculum-questions/:curriculumId', component: StudentCurriculumQuestionsComponent },
  // { path: 'question-bank/:courseId', component: StudentQuestionsBankComponent },
  // { path: 'practice-question/:courseId/:difficultyId', component: StudentPracticeQuestionsComponent },
  // { path: 'exam-test/:questionSetId', component: StudentExamTestComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StudentRoutingModule { }
