import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumDescriptionComponent } from './curriculum-description.component';

describe('CurriculumDescriptionComponent', () => {
  let component: CurriculumDescriptionComponent;
  let fixture: ComponentFixture<CurriculumDescriptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumDescriptionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumDescriptionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
