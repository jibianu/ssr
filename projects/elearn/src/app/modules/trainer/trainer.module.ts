import { CurriculumModule } from './../adminapp/curriculum/curriculum.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TrainerRoutingModule } from './trainer-routing.module';
import { TrainerDashboardComponent } from './trainer-dashboard/trainer-dashboard.component';
import { TrainerAnalyticsDashboardComponent } from './trainer-analytics-dashboard/trainer-analytics-dashboard.component';
import { TrainerProfileComponent } from './trainer-profile/trainer-profile.component';
import { TrainerCourseDetailsComponent } from './trainer-course-details/trainer-course-details.component';
import { LessonEditorModule } from 'src/app/shared/component/lesson-editor/lesson-editor.module';
import { SubmitForReviewModalComponent } from '../adminapp/course/course-review/submit-for-review-modal/submit-for-review-modal.component';

@NgModule({
  declarations: [
    TrainerDashboardComponent,
    TrainerAnalyticsDashboardComponent,
    TrainerProfileComponent,
    TrainerCourseDetailsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    CurriculumModule,
    LessonEditorModule,
    TrainerRoutingModule,
    SubmitForReviewModalComponent
  ]
})
export class TrainerModule { }
