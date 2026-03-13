import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentQuestionsBankComponent } from './student-questions-bank.component';

describe('StudentQuestionsBankComponent', () => {
  let component: StudentQuestionsBankComponent;
  let fixture: ComponentFixture<StudentQuestionsBankComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentQuestionsBankComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentQuestionsBankComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
