import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumVideosComponent } from './curriculum-videos.component';

describe('CurriculumVideosComponent', () => {
  let component: CurriculumVideosComponent;
  let fixture: ComponentFixture<CurriculumVideosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumVideosComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumVideosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
