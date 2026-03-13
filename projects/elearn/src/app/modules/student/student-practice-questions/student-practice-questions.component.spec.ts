import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentPracticeQuestionsComponent } from './student-practice-questions.component';

describe('StudentPracticeQuestionsComponent', () => {
  let component: StudentPracticeQuestionsComponent;
  let fixture: ComponentFixture<StudentPracticeQuestionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentPracticeQuestionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentPracticeQuestionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
