import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumDetailsComponent } from './student-curriculum-details.component';

describe('StudentCurriculumDetailsComponent', () => {
  let component: StudentCurriculumDetailsComponent;
  let fixture: ComponentFixture<StudentCurriculumDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
