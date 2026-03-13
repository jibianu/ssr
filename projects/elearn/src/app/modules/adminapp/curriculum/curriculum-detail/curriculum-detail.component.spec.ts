import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CurriculumDetailComponent } from './curriculum-detail.component';

describe('CurriculumDetailComponent', () => {
  let component: CurriculumDetailComponent;
  let fixture: ComponentFixture<CurriculumDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CurriculumDetailComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CurriculumDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
