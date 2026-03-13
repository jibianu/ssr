import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicCourseListComponent } from './public-course-list.component';

describe('PublicCourseListComponent', () => {
  let component: PublicCourseListComponent;
  let fixture: ComponentFixture<PublicCourseListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicCourseListComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicCourseListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
