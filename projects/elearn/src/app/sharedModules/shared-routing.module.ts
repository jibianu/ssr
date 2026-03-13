import { CertificateTemplateComponent } from './certificate-template/certificate-template.component';
import { TestResultComponent } from './test-result/test-result.component';

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CanDeactivateGuard } from '../core/guards/can-deactivate.guard';
import { TrainerBlockCertificateGuard } from '../core/guards/trainer-block-certificate.guard';
import { Role } from '../shared/models/role';
import { CategoryCourseDescriptionComponent } from './category-course-description/category-course-description.component';
import { PublicCourseEmbedComponent } from '../core/public-course-embed/public-course-embed.component';
import { CategoryCoursesComponent } from './category-courses/category-courses.component';
import { CommonCategoryComponent } from './common-category/common-category.component';
import { CommonCourseComponent } from './common-course/common-course.component';
import { CourseDetailsComponent } from './course-details/course-details.component';
import { CurriculumDetailsComponent } from './curriculum-details/curriculum-details.component';
// import { CurriculumQuestionsComponent } from './curriculum-details/curriculum-questions/curriculum-questions.component';
import { SharedCurriculumListComponent } from './CurriculumList/shared-curriculum-list.component';
// import { ExamTestComponent } from './exam-test/exam-test.component';
import { PracticeQuestionsComponent } from './practice-questions/practice-questions.component';
import { QuestionsBankComponent } from './questions-bank/questions-bank.component';
import { TestDetailsComponent } from './test-details/test-details.component';
import { TestListComponent } from './test-list/test-list.component';
import { UserProfileComponent } from '../shared/component/user-profile/user-profile.component';
import { CommonCertificateComponent } from './common-certificate/common-certificate.component';
import { PurchaseHistoryComponent } from './purchase-history/purchase-history.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { StudentSearchPageComponent } from './student-search-page/student-search-page.component';
import { StudentEventsListComponent } from './student-events/student-events-list.component';
import { StudentEventDetailComponent } from './student-events/student-event-detail.component';

const routes: Routes = [
  { path: 'course/:courseId', redirectTo: 'details/curriculum-list/:courseId', pathMatch: 'full' },
  {
    path: 'details',
    component: CourseDetailsComponent,
    children: [
      {
        path: 'curriculum-list/:courseId',
        component: SharedCurriculumListComponent
      },
      {
        path: 'curriculum-details/:curriculumId',
        component: CurriculumDetailsComponent,
        data: { curriculumRole: [Role.Company] }
      },
      {
        path: 'test-list/:courseId',
        component: TestListComponent,
        data: { testRole: [Role.Company] }
      },
      {
        path: 'test-details/:questionSetId',
        component: TestDetailsComponent,
        data: { testDetailRole: [Role.Company] }
      },
      {
        path: 'exam-result/:questionSetID', component: TestResultComponent,
      },
      {
        path: 'question-bank/:courseId',
        component: QuestionsBankComponent,
        data: { questionRole: [Role.Company] }
      },
    ],
    data: { role: [Role.Company] }
  },
  {
    path: 'exam-test/:Id/:questionType', component: PracticeQuestionsComponent,
    data: { IsExamRole: true }, canDeactivate: [CanDeactivateGuard]
  },
  {
    path: 'curriculum-questions/:Id/:questionType', component: PracticeQuestionsComponent,
    canDeactivate: [CanDeactivateGuard]
  },
  { path: 'practice-question/:Id/:questionType/:difficultyId', component: PracticeQuestionsComponent, canDeactivate: [CanDeactivateGuard] },
  { path: 'courses', component: CommonCourseComponent },
  { path: 'search', component: StudentSearchPageComponent },
  { path: 'categories', component: CommonCategoryComponent, canActivate: [TrainerBlockCertificateGuard] },
  { path: 'category-courses/:categoryID', component: CategoryCoursesComponent },
  { path: 'category-courses/:categoryID/:name', component: CategoryCoursesComponent },
  { path: 'category-courses-description/:courseID', component: PublicCourseEmbedComponent },
  { path: 'category-courses-description/:courseID/:wishId', component: PublicCourseEmbedComponent },
  // { path: 'exam-result/:questionSetID', component: TestResultComponent },
  { path: 'profile', component: UserProfileComponent },
  { path: 'purchase-history', component: PurchaseHistoryComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'certificate', component: CommonCertificateComponent, canActivate: [TrainerBlockCertificateGuard] },
  { path: 'certificate-template/:courseID', component: CertificateTemplateComponent },
  { path: 'events', component: StudentEventsListComponent },
  { path: 'events/event/:id', component: StudentEventDetailComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SharedModuleRoutingModule { }