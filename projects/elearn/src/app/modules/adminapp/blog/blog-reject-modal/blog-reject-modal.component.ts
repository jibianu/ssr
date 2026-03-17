import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-blog-reject-modal',
  templateUrl: './blog-reject-modal.component.html',
  styleUrls: ['./blog-reject-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BlogRejectModalComponent {
  rejectionReason = '';

  constructor(public activeModal: NgbActiveModal) {}

  reject(): void {
    this.activeModal.close(this.rejectionReason?.trim() ?? '');
  }

  cancel(): void {
    this.activeModal.dismiss();
  }
}
