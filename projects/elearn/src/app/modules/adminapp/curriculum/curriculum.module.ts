import { SafeUrlPipe } from './../../../shared/pipes/safeUrl.pipe';
import { SharedModule } from './../../../shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CurriculumRoutingModule } from './curriculum-routing.module';
import { AddCurriculumComponent } from './add-curriculum/add-curriculum.component';
import { CurriculumListComponent } from './curriculum-list/curriculum-list.component';
import { CurriculumDetailComponent } from './curriculum-detail/curriculum-detail.component';
import { CurriculumDescriptionComponent } from './curriculum-description/curriculum-description.component';
import { CurriculumConceptsComponent } from './curriculum-concepts/curriculum-concepts.component';
import { CurriculumStudyMaterialComponent } from './curriculum-study-material/curriculum-study-material.component';
import { CurriculumVideoComponent } from './curriculum-video/curriculum-video.component';
import { CurriculumQuestionsSetComponent } from './curriculum-questions-set/curriculum-questions-set.component';
import { QuestionListComponent } from './curriculum-questions/question-list/question-list.component';
import { CourseQuestionComponent } from './course-question/course-question.component';
import { CurriculumQuestionSetQuestionsListComponent } from './curriculum-questions-set/curriculum-question-set-questions-list/curriculum-question-set-questions-list.component';
import { CoursePricesComponent } from './course-prices/course-prices.component';
import { LessonEditorModule } from './../../../shared/component/lesson-editor/lesson-editor.module';
import { CourseRejectModalComponent } from '../course/course-review/course-reject-modal/course-reject-modal.component';
import { CourseApproveModalComponent } from '../course/course-review/course-approve-modal/course-approve-modal.component';

@NgModule({
  declarations: [
    AddCurriculumComponent,
    CurriculumListComponent,
    CurriculumDetailComponent,
    CurriculumDescriptionComponent,
    CurriculumConceptsComponent,
    CurriculumStudyMaterialComponent,
    CurriculumVideoComponent,
    CurriculumQuestionsSetComponent,
    QuestionListComponent,
    CourseQuestionComponent,
    CurriculumQuestionSetQuestionsListComponent,
    CoursePricesComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    CurriculumRoutingModule,
    LessonEditorModule,
    CourseRejectModalComponent,
    CourseApproveModalComponent
  ],
  exports: [
    AddCurriculumComponent,
    CurriculumListComponent,
    CurriculumDetailComponent,
    CurriculumDescriptionComponent,
    CurriculumConceptsComponent,
    CurriculumStudyMaterialComponent,
    CurriculumVideoComponent,
    CurriculumQuestionsSetComponent,
    QuestionListComponent,
    CourseQuestionComponent
  ]
})
export class CurriculumModule { }
