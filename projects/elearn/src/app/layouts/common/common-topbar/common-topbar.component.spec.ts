import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommonTopbarComponent } from './common-topbar.component';

describe('CommonTopbarComponent', () => {
  let component: CommonTopbarComponent;
  let fixture: ComponentFixture<CommonTopbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CommonTopbarComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CommonTopbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
