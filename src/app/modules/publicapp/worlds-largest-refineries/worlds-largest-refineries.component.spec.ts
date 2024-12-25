import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorldsLargestRefineriesComponent } from './worlds-largest-refineries.component';

describe('WorldsLargestRefineriesComponent', () => {
  let component: WorldsLargestRefineriesComponent;
  let fixture: ComponentFixture<WorldsLargestRefineriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WorldsLargestRefineriesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorldsLargestRefineriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
