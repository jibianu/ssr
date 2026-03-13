import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicCourseDetailsComponent } from './public-course-details.component';

describe('PublicCourseDetailsComponent', () => {
  let component: PublicCourseDetailsComponent;
  let fixture: ComponentFixture<PublicCourseDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicCourseDetailsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicCourseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
