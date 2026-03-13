import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumListComponent } from './student-curriculum-list.component';

describe('StudentCurriculumListComponent', () => {
  let component: StudentCurriculumListComponent;
  let fixture: ComponentFixture<StudentCurriculumListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
