import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GuestBloggingComponent } from './guest-blogging.component';

describe('GuestBloggingComponent', () => {
  let component: GuestBloggingComponent;
  let fixture: ComponentFixture<GuestBloggingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GuestBloggingComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GuestBloggingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
