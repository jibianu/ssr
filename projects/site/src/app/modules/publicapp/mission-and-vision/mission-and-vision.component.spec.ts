import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MissionAndVisionComponent } from './mission-and-vision.component';

describe('MissionAndVisionComponent', () => {
  let component: MissionAndVisionComponent;
  let fixture: ComponentFixture<MissionAndVisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MissionAndVisionComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MissionAndVisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
