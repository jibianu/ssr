import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export type ConfirmStyle = 'danger' | 'default';

@Component({
    selector: 'app-confirmation-modal',
    templateUrl: './confirmation-modal.component.html',
    styleUrls: ['./confirmation-modal.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationModalComponent implements OnInit {

  @Input() title: string = 'Confirm';
  @Input() descText: string = '';
  /** 'danger' = red (e.g. delete), 'default' = purple (e.g. leave page) */
  @Input() confirmStyle: ConfirmStyle = 'danger';
  @Input() confirmLabel: string = 'Confirm';
  @Input() cancelLabel: string = 'Cancel';

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
  }

  closeModal(sendData: string) {
    this.activeModal.close(sendData);
  }

}
