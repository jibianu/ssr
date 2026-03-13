import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentExamTestComponent } from './student-exam-test.component';

describe('StudentExamTestComponent', () => {
  let component: StudentExamTestComponent;
  let fixture: ComponentFixture<StudentExamTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentExamTestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentExamTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
