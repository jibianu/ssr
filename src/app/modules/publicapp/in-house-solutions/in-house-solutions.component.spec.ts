import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InHouseSolutionsComponent } from './in-house-solutions.component';

describe('InHouseSolutionsComponent', () => {
  let component: InHouseSolutionsComponent;
  let fixture: ComponentFixture<InHouseSolutionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InHouseSolutionsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InHouseSolutionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
