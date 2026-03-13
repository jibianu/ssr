import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationModalComponent, ConfirmStyle } from '../../shared/component/confirmation-modal/confirmation-modal.component';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmStyle?: ConfirmStyle;
  confirmLabel?: string;
  cancelLabel?: string;
}

/**
 * Opens the app confirmation modal (no browser "localhost says" popup).
 * Use for leave-page, delete, or any yes/no confirmation.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmationService {

  constructor(private ngbModal: NgbModal) {}

  /**
   * Show confirmation modal. Returns a promise that resolves to true if user confirmed, false if cancelled or dismissed.
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    const modalRef = this.ngbModal.open(ConfirmationModalComponent, {
      centered: true,
      backdrop: 'static',
      windowClass: 'confirmation-modal-window',
      size: 'sm'
    });
    const comp = modalRef.componentInstance as ConfirmationModalComponent;
    comp.title = options.title ?? 'Confirm';
    comp.descText = options.message;
    comp.confirmStyle = options.confirmStyle ?? 'danger';
    comp.confirmLabel = options.confirmLabel ?? 'Confirm';
    comp.cancelLabel = options.cancelLabel ?? 'Cancel';

    return modalRef.result
      .then((result: string) => result === 'ok')
      .catch(() => false);
  }
}
