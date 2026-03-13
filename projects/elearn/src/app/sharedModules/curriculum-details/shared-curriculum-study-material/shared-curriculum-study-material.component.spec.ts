import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedCurriculumStudyMaterialComponent } from './shared-curriculum-study-material.component';

describe('SharedCurriculumStudyMaterialComponent', () => {
  let component: SharedCurriculumStudyMaterialComponent;
  let fixture: ComponentFixture<SharedCurriculumStudyMaterialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharedCurriculumStudyMaterialComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedCurriculumStudyMaterialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
