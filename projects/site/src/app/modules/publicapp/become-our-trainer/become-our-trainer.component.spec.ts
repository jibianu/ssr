import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BecomeOurTrainerComponent } from './become-our-trainer.component';

describe('BecomeOurTrainerComponent', () => {
  let component: BecomeOurTrainerComponent;
  let fixture: ComponentFixture<BecomeOurTrainerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BecomeOurTrainerComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BecomeOurTrainerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
