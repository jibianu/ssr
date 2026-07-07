import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedCurriculumListComponent } from './CurriculumList/shared-curriculum-list.component';
import { SharedModuleRoutingModule } from './shared-routing.module';
import { SharedModule } from '../shared/shared.module';
import { CourseDetailsComponent } from './course-details/course-details.component';
import { TestListComponent } from './test-list/test-list.component';
import { TestDetailsComponent } from './test-details/test-details.component';
// import { ExamTestComponent } from './exam-test/exam-test.component';
import { QuestionsBankComponent } from './questions-bank/questions-bank.component';
import { PracticeQuestionsComponent } from './practice-questions/practice-questions.component';
import { CurriculumDetailsComponent } from './curriculum-details/curriculum-details.component';
import { CurriculumVideosComponent } from './curriculum-details/curriculum-videos-component/curriculum-videos.component';
import { SharedCurriculumStudyMaterialComponent } from './curriculum-details/shared-curriculum-study-material/shared-curriculum-study-material.component';
// import { CurriculumQuestionsComponent } from './curriculum-details/curriculum-questions/curriculum-questions.component';
import { CommonCourseComponent } from './common-course/common-course.component';
import { CommonCategoryComponent } from './common-category/common-category.component';
import { CategoryCoursesComponent } from './category-courses/category-courses.component';
import { CategoryCourseDescriptionComponent } from './category-course-description/category-course-description.component';
import { PublicCourseEmbedComponent } from '../core/public-course-embed/public-course-embed.component';
import { TestResultComponent } from './test-result/test-result.component';
import { CommonCertificateComponent } from './common-certificate/common-certificate.component';
import { CertificateTemplateComponent } from './certificate-template/certificate-template.component';
import { EventCertificateTemplateComponent } from './event-certificate-template/event-certificate-template.component';
import { PurchaseHistoryComponent } from './purchase-history/purchase-history.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { StudentSearchPageComponent } from './student-search-page/student-search-page.component';
import { LessonEditorModule } from '../shared/component/lesson-editor/lesson-editor.module';
import { StudyMaterialModule } from '../shared/component/study-material/study-material.module';
import { LessonPlayerShellComponent } from './course-player/course-player-layout/course-player-layout.component';
import { CurriculumSidebarComponent } from './course-player/curriculum-sidebar/curriculum-sidebar.component';
import { LessonVideoComponent } from './course-player/video-player/video-player.component';
import { StudentEventsListComponent } from './student-events/student-events-list.component';
import { StudentEventDetailComponent } from './student-events/student-event-detail.component';
import { StudentCompletedEventsListComponent } from './student-events/student-completed-events-list.component';
import { StudentCompletedEventContentComponent } from './student-events/student-completed-event-content.component';
import { StudentMembershipPageComponent } from './student-membership/student-membership-page.component';

@NgModule({
  declarations: [
    LessonPlayerShellComponent,
    CurriculumSidebarComponent,
    LessonVideoComponent,
    SharedCurriculumListComponent,
    CourseDetailsComponent,
    TestListComponent,
    TestDetailsComponent,
    // ExamTestComponent,
    QuestionsBankComponent,
    PracticeQuestionsComponent,
    CurriculumDetailsComponent,
    CurriculumVideosComponent,
    SharedCurriculumStudyMaterialComponent,
    // CurriculumQuestionsComponent,
    CommonCourseComponent,
    CommonCategoryComponent,
    CategoryCoursesComponent,
    CategoryCourseDescriptionComponent,
    PublicCourseEmbedComponent,
    TestResultComponent,
    CommonCertificateComponent,
    CertificateTemplateComponent,
    EventCertificateTemplateComponent,
    StudentSearchPageComponent,
    StudentEventsListComponent,
    StudentEventDetailComponent,
    StudentCompletedEventsListComponent,
    StudentCompletedEventContentComponent,
    StudentMembershipPageComponent,
  ],
  imports: [
    PurchaseHistoryComponent,
    NotificationsComponent,
    CommonModule,
    SharedModuleRoutingModule,
    SharedModule,
    LessonEditorModule,
    StudyMaterialModule
  ],
  schemas:[
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class SharedModulesModule { }
