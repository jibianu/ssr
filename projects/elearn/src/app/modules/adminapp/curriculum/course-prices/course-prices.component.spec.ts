import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoursePricesComponent } from './course-prices.component';

describe('CoursePricesComponent', () => {
  let component: CoursePricesComponent;
  let fixture: ComponentFixture<CoursePricesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CoursePricesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CoursePricesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
