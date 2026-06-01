import { SharedModule } from 'src/app/shared/shared.module';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StudentRoutingModule } from './student-routing.module';
import { StudentDashboardComponent } from './student-dashboard/student-dashboard.component';
import { StudentCourseDetailsComponent } from './student-course-details/student-course-details.component';
import { StudentCurriculumDetailsComponent } from './student-curriculum-details/student-curriculum-details.component';
import { StudentTestListComponent } from './student-test-list/student-test-list.component';
import { StudentCurriculumListComponent } from './student-curriculum-list/student-curriculum-list.component';
import { StudentTestDetailsComponent } from './student-test-details/student-test-details.component';
import { StudentCurriculumVideosComponent } from './student-curriculum-details/student-curriculum-videos/student-curriculum-videos.component';
import { StudentCurriculumStudyMaterialComponent } from './student-curriculum-details/student-curriculum-study-material/student-curriculum-study-material.component';
import { StudentCurriculumQuestionsComponent } from './student-curriculum-details/student-curriculum-questions/student-curriculum-questions.component';
import { StudentQuestionsBankComponent } from './student-questions-bank/student-questions-bank.component';
import { StudentPracticeQuestionsComponent } from './student-practice-questions/student-practice-questions.component';
import { StudentExamTestComponent } from './student-exam-test/student-exam-test.component';
import { StudyMaterialModule } from 'src/app/shared/component/study-material/study-material.module';

@NgModule({
  declarations: [
    StudentDashboardComponent,
    StudentCourseDetailsComponent,
    StudentCurriculumDetailsComponent,
    StudentTestListComponent,
    StudentCurriculumListComponent,
    StudentTestDetailsComponent,
    StudentCurriculumVideosComponent,
    StudentCurriculumStudyMaterialComponent,
    StudentCurriculumQuestionsComponent,
    StudentQuestionsBankComponent,
    StudentPracticeQuestionsComponent,
    StudentExamTestComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    StudentRoutingModule,
    StudyMaterialModule
  ]
})
export class StudentModule { }
