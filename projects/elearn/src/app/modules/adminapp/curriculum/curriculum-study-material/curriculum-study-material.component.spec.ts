import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumStudyMaterialComponent } from './curriculum-study-material.component';

describe('CurriculumStudyMaterialComponent', () => {
  let component: CurriculumStudyMaterialComponent;
  let fixture: ComponentFixture<CurriculumStudyMaterialComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumStudyMaterialComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumStudyMaterialComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
