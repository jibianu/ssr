import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { CompanyRoutingModule } from './company-routing.module';
import {ComapanyDashboardComponent } from './company-dashboard/comapny-dashboard.component';
import { StudentDashboardComponent } from './company-dashboard/student-dashboard/student-dashboard.component';
import { SsoSettingsComponent } from './sso-settings/sso-settings.component';
import { CompanyUsersComponent } from './company-users/company-users.component';
import { UserFormDialogComponent } from './company-users/user-form-dialog.component';
import { CompanyTrainersComponent } from './company-trainers/company-trainers.component';
import { TrainerFormDialogComponent } from './company-trainers/trainer-form-dialog.component';
import { CommonPaginationComponent } from 'src/app/shared/component/common-pagination/common-pagination.component';
// import { CourseDetailsComponent } from 'src/app/sharedModules/course-details/course-details.component';
// import { SharedCurriculumListComponent } from 'src/app/sharedModules/CurriculumList/shared-curriculum-list.component';
// import { TestListComponent } from 'src/app/sharedModules/test-list/test-list.component';
// import { TestDetailsComponent } from 'src/app/sharedModules/test-details/test-details.component';
// import { ExamTestComponent } from 'src/app/sharedModules/exam-test/exam-test.component';
// import { PracticeQuestionsComponent } from 'src/app/sharedModules/practice-questions/practice-questions.component';
// import { QuestionsBankComponent } from 'src/app/sharedModules/questions-bank/questions-bank.component';
// import { CurriculumDetailsComponent } from 'src/app/sharedModules/curriculum-details/curriculum-details.component';
// import { CurriculumVideosComponent } from 'src/app/sharedModules/curriculum-details/curriculum-videos-component/curriculum-videos.component';
// import { SharedCurriculumStudyMaterialComponent } from 'src/app/sharedModules/curriculum-details/shared-curriculum-study-material/shared-curriculum-study-material.component';
// import { SharedCurriculumConceptsComponent } from 'src/app/sharedModules/curriculum-details/shared-curriculum-concepts-component/shared-curriculum-concepts.component';
// import { CurriculumQuestionsComponent } from 'src/app/sharedModules/curriculum-details/curriculum-questions/curriculum-questions.component';

@NgModule({
  declarations: [
    ComapanyDashboardComponent,
    StudentDashboardComponent,
    SsoSettingsComponent,
    CompanyUsersComponent,
    UserFormDialogComponent,
    CompanyTrainersComponent,
    TrainerFormDialogComponent,
    // CourseDetailsComponent,
    // SharedCurriculumListComponent,
    // TestListComponent,
    // TestDetailsComponent,
    // ExamTestComponent,
    // PracticeQuestionsComponent,
    // QuestionsBankComponent,
    // CurriculumDetailsComponent,
    // CurriculumVideosComponent,
    // SharedCurriculumConceptsComponent,
    // SharedCurriculumStudyMaterialComponent,
    // CurriculumQuestionsComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    CompanyRoutingModule,
    CommonPaginationComponent
  ]
})
export class CompanyModule { }
