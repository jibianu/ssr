import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicCategoryComponent } from './public-category.component';

describe('PublicCategoryComponent', () => {
  let component: PublicCategoryComponent;
  let fixture: ComponentFixture<PublicCategoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicCategoryComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicCategoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
