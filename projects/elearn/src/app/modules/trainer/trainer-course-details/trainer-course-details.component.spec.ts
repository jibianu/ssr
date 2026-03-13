import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrainerCourseDetailsComponent } from './trainer-course-details.component';

describe('TrainerCourseDetailsComponent', () => {
  let component: TrainerCourseDetailsComponent;
  let fixture: ComponentFixture<TrainerCourseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TrainerCourseDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TrainerCourseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
