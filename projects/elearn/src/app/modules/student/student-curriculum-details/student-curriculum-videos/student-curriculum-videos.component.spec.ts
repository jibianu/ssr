import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentCurriculumVideosComponent } from './student-curriculum-videos.component';

describe('StudentCurriculumVideosComponent', () => {
  let component: StudentCurriculumVideosComponent;
  let fixture: ComponentFixture<StudentCurriculumVideosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentCurriculumVideosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(StudentCurriculumVideosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
