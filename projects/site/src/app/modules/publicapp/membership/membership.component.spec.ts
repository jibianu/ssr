import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipComponent } from './membership.component';

describe('MembershipComponent', () => {
  let component: MembershipComponent;
  let fixture: ComponentFixture<MembershipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MembershipComponent],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MembershipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default to yearly billing', () => {
    expect(component.selectedBillingCycle).toBe('yearly');
  });

  it('should apply 30% yearly discount', () => {
    const studentPlan = component.membershipPlans.find((plan) => plan.id === 'student')!;

    expect(component.getOriginalPrice(studentPlan)).toBe(11998);
    expect(component.getDisplayPrice(studentPlan)).toBe(8399);
  });

  it('should show six-month prices without discount', () => {
    component.selectBillingCycle('sixMonth');
    const professionalPlan = component.membershipPlans.find((plan) => plan.id === 'professional')!;

    expect(component.getDisplayPrice(professionalPlan)).toBe(8999);
    expect(component.getOriginalPrice(professionalPlan)).toBeNull();
  });

  it('should calculate hero yearly pricing from featured plan', () => {
    expect(component.getHeroYearlyOriginal()).toBe(17998);
    expect(component.getHeroYearlyPrice()).toBe(12599);
    expect(component.getHeroSixMonthPrice()).toBe(8999);
  });
    spyOn(console, 'log');
    const plan = component.membershipPlans[0];

    component.startMembership(plan);

    expect(console.log).toHaveBeenCalledWith('[Membership] startMembership:', {
      planId: plan.id,
      billingCycle: component.selectedBillingCycle,
      price: component.getDisplayPrice(plan),
    });
  });
});
