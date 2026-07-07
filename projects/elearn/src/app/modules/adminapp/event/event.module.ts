import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EventRoutingModule } from './event-routing.module';
import { EventListComponent } from './event-list/event-list.component';
import { EventRecordingPanelComponent } from './event-recording-panel/event-recording-panel.component';
import { EventAddComponent } from './event-add/event-add.component';
import { EventEditComponent } from './event-edit/event-edit.component';
import { EventUserListComponent } from './event-user-list/event-user-list.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { SubmitForReviewModalComponent } from '../course/course-review/submit-for-review-modal/submit-for-review-modal.component';
import { CourseApproveModalComponent } from '../course/course-review/course-approve-modal/course-approve-modal.component';
import { CourseRejectModalComponent } from '../course/course-review/course-reject-modal/course-reject-modal.component';

@NgModule({
  declarations: [
    EventListComponent,
    EventUserListComponent,
    EventRecordingPanelComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    EventRoutingModule,
    SharedModule,
    EventAddComponent,
    EventEditComponent,
    SubmitForReviewModalComponent,
    CourseApproveModalComponent,
    CourseRejectModalComponent
  ]
})
export class EventModule {}
