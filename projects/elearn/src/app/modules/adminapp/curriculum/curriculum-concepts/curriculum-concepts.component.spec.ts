import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumConceptsComponent } from './curriculum-concepts.component';

describe('CurriculumConceptsComponent', () => {
  let component: CurriculumConceptsComponent;
  let fixture: ComponentFixture<CurriculumConceptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumConceptsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumConceptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
