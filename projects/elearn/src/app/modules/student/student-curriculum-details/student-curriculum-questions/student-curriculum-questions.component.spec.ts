import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumQuestionsComponent } from './student-curriculum-questions.component';

describe('StudentCurriculumQuestionsComponent', () => {
  let component: StudentCurriculumQuestionsComponent;
  let fixture: ComponentFixture<StudentCurriculumQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
