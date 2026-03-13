import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumQuestionSetQuestionsListComponent } from './curriculum-question-set-questions-list.component';

describe('CurriculumQuestionSetQuestionsListComponent', () => {
  let component: CurriculumQuestionSetQuestionsListComponent;
  let fixture: ComponentFixture<CurriculumQuestionSetQuestionsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumQuestionSetQuestionsListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumQuestionSetQuestionsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
