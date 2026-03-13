import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicRelatedCoursesComponent } from './public-related-courses.component';

describe('PublicRelatedCoursesComponent', () => {
  let component: PublicRelatedCoursesComponent;
  let fixture: ComponentFixture<PublicRelatedCoursesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicRelatedCoursesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicRelatedCoursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
