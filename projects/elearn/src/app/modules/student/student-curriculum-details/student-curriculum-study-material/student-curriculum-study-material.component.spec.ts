import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumStudyMaterialComponent } from './student-curriculum-study-material.component';

describe('StudentCurriculumStudyMaterialComponent', () => {
  let component: StudentCurriculumStudyMaterialComponent;
  let fixture: ComponentFixture<StudentCurriculumStudyMaterialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumStudyMaterialComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumStudyMaterialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
