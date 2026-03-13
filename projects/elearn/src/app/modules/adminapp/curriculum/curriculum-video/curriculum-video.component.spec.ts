import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumVideoComponent } from './curriculum-video.component';

describe('CurriculumVideoComponent', () => {
  let component: CurriculumVideoComponent;
  let fixture: ComponentFixture<CurriculumVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumVideoComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
