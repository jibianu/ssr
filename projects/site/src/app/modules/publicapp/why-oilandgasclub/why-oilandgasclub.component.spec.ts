import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhyOilandgasclubComponent } from './why-oilandgasclub.component';

describe('WhyOilandgasclubComponent', () => {
  let component: WhyOilandgasclubComponent;
  let fixture: ComponentFixture<WhyOilandgasclubComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WhyOilandgasclubComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WhyOilandgasclubComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
