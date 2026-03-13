import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumConceptsComponent } from './student-curriculum-concepts.component';

describe('StudentCurriculumConceptsComponent', () => {
  let component: StudentCurriculumConceptsComponent;
  let fixture: ComponentFixture<StudentCurriculumConceptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumConceptsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumConceptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
