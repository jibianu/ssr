import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildYourPortfolioComponent } from './build-your-portfolio.component';

describe('BuildYourPortfolioComponent', () => {
  let component: BuildYourPortfolioComponent;
  let fixture: ComponentFixture<BuildYourPortfolioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BuildYourPortfolioComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BuildYourPortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
