import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterManagementComponent } from './register-management.component';

describe('RegisterManagementComponent', () => {
  let component: RegisterManagementComponent;
  let fixture: ComponentFixture<RegisterManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RegisterManagementComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
