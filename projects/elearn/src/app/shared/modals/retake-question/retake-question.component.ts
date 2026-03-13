import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-retake-question',
    templateUrl: './retake-question.component.html',
    styleUrls: ['./retake-question.component.scss'],
    standalone: false
})
export class RetakeQuestionComponent implements OnInit {
  @Input() completedCurriculamName;
  @Input() nextCurriculamName;
  @Input() completedCurriculamURL;
  @Input() nextCurriculamURL;
  constructor(public activeModal: NgbActiveModal) { }

  ngOnInit(): void {
  }

}
