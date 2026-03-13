import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedCurriculumConceptsComponent } from './shared-curriculum-concepts.component';

describe('SharedCurriculumConceptsComponent', () => {
  let component: SharedCurriculumConceptsComponent;
  let fixture: ComponentFixture<SharedCurriculumConceptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SharedCurriculumConceptsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SharedCurriculumConceptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
