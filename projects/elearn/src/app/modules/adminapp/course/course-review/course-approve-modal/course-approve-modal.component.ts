import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-course-approve-modal',
  templateUrl: './course-approve-modal.component.html',
  styleUrls: ['./course-approve-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CourseApproveModalComponent {
  approvalNote = '';

  constructor(public activeModal: NgbActiveModal) {}

  approve(): void {
    this.activeModal.close(this.approvalNote?.trim() ?? '');
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
