import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-skip-question',
    templateUrl: './skip-question.component.html',
    styleUrls: ['./skip-question.component.scss'],
    standalone: false
})
export class SkipQuestionComponent implements OnInit {
  @Input() noOfSkipQuestion: any;
  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
  }
  closeModal(sendData) {
    this.activeModal.close(sendData);
  }
}
