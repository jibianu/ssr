import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicCourseHomeComponent } from './public-course-home.component';

describe('PublicCourseHomeComponent', () => {
  let component: PublicCourseHomeComponent;
  let fixture: ComponentFixture<PublicCourseHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicCourseHomeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicCourseHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
