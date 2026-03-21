import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-submit-for-review-modal',
  templateUrl: './submit-for-review-modal.component.html',
  styleUrls: ['./submit-for-review-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SubmitForReviewModalComponent {
  message = '';

  constructor(public activeModal: NgbActiveModal) {}

  submit(): void {
    this.activeModal.close(this.message?.trim() ?? '');
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
