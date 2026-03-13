import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumQuestionsSetComponent } from './curriculum-questions-set.component';

describe('CurriculumQuestionsSetComponent', () => {
  let component: CurriculumQuestionsSetComponent;
  let fixture: ComponentFixture<CurriculumQuestionsSetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumQuestionsSetComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumQuestionsSetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
