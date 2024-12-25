import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss']
})
export class ConfirmationModalComponent implements OnInit {

  @Input() title;
  @Input() descText;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
  }

  closeModal(sendData) {
    this.activeModal.close(sendData);
  }

}
