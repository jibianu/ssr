import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-course-reject-modal',
  templateUrl: './course-reject-modal.component.html',
  styleUrls: ['./course-reject-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CourseRejectModalComponent {
  rejectionReason = '';

  constructor(public activeModal: NgbActiveModal) {}

  reject(): void {
    this.activeModal.close(this.rejectionReason?.trim() ?? '');
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
