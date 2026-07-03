import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MembershipApiService, MembershipPlanApi, MembershipStatusApi } from '../../services/membership-api.service';

type BillingCycle = 'sixMonth' | 'yearly';

interface PlanFeatureSet {
  subtitle: string;
  featuresHeading: string;
  features: string[];
  badge?: string;
  isMostPopular?: boolean;
}

@Component({
  selector: 'app-student-membership-page',
  templateUrl: './student-membership-page.component.html',
  styleUrls: ['./student-membership-page.component.scss'],
  standalone: false,
})
export class StudentMembershipPageComponent implements OnInit, OnDestroy {
  plans: MembershipPlanApi[] = [];
  membershipStatus: MembershipStatusApi | null = null;
  selectedBillingCycle: BillingCycle = 'yearly';
  loading = true;
  loadError = '';
  highlightPlanCode = '';
  private sub = new Subscription();

  readonly billingOptions: { id: BillingCycle; label: string; savingsBadge?: string }[] = [
    { id: 'sixMonth', label: '6 months' },
    { id: 'yearly', label: 'Yearly', savingsBadge: 'Save 30%' },
  ];

  private readonly planMeta: Record<string, PlanFeatureSet> = {
    student: {
      subtitle: 'Best for students and freshers starting their oil & gas career.',
      featuresHeading: 'Key Features:',
      features: [
        'Free notifications for selected category workshops',
        'On-demand free access to 50+ courses',
        'New courses added frequently',
        'Free coupon access for Oilandgasclub monthly workshops',
        'Job-ready templates and career guides',
        'Access to specific category workshops',
      ],
    },
    professional: {
      subtitle: 'Best for working professionals upgrading technical skills.',
      featuresHeading: 'Everything in Student Plan plus:',
      badge: 'Most Popular',
      isMostPopular: true,
      features: [
        'Priority workshop notifications by category',
        'Free coupons for all monthly Oilandgasclub events',
        'Access to professional templates and technical guides',
        'Career-focused workshop recommendations',
        'Early access to new technical courses',
        'Better support for career and skill growth',
      ],
    },
  };

  private readonly planDisplayRank: Record<string, number> = {
    student: 0,
    professional: 1,
  };

  private sortPlansForDisplay(plans: MembershipPlanApi[]): MembershipPlanApi[] {
    return [...plans].sort((a, b) => {
      const rankA = this.planDisplayRank[(a.planCode || '').toLowerCase()] ?? 99;
      const rankB = this.planDisplayRank[(b.planCode || '').toLowerCase()] ?? 99;
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
    });
  }

  constructor(
    private membershipApi: MembershipApiService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  get isStudentMember(): boolean {
    const code = (this.membershipStatus?.planCode || '').toLowerCase();
    return !!this.membershipStatus?.isActiveMember && code === 'student';
  }

  get lockedBillingCycle(): BillingCycle | null {
    if (this.isStudentMember || this.isProMember) {
      const cycle = (this.membershipStatus?.billingCycle || 'yearly').toLowerCase();
      return cycle === 'sixmonth' ? 'sixMonth' : 'yearly';
    }
    return null;
  }

  get availableBillingOptions(): { id: BillingCycle; label: string; savingsBadge?: string }[] {
    const locked = this.lockedBillingCycle;
    if (locked) {
      return this.billingOptions.filter((option) => option.id === locked);
    }
    return this.billingOptions;
  }

  ngOnInit(): void {
    this.highlightPlanCode = (this.route.snapshot.queryParamMap.get('highlight') || '').toLowerCase();
    this.sub.add(
      this.route.queryParamMap.subscribe((params) => {
        this.highlightPlanCode = (params.get('highlight') || '').toLowerCase();
      })
    );

    this.sub.add(
      this.membershipApi.getStatus().subscribe({
        next: (status) => {
          this.membershipStatus = status;
          if (this.isStudentMember && !this.highlightPlanCode) {
            this.highlightPlanCode = 'professional';
          }
          if (this.lockedBillingCycle) {
            this.selectedBillingCycle = this.lockedBillingCycle;
          }
          if (this.isProMember) {
            this.highlightPlanCode = 'professional';
          }
        },
      })
    );

    this.sub.add(
      this.membershipApi.getPlans().subscribe({
        next: (plans) => {
          this.plans = this.sortPlansForDisplay(
            (plans || []).filter((p) => ['student', 'professional'].includes((p.planCode || '').toLowerCase()))
          );
          this.loading = false;
        },
        error: () => {
          this.loadError = 'Unable to load membership plans. Please try again later.';
          this.loading = false;
        },
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get isProMember(): boolean {
    const code = (this.membershipStatus?.planCode || '').toLowerCase();
    return !!this.membershipStatus?.isActiveMember && code === 'professional';
  }

  get canRenewMembership(): boolean {
    return !!this.membershipStatus?.canRenew;
  }

  get renewalOpensInDays(): number {
    return this.membershipStatus?.renewalOpensInDays ?? 0;
  }

  get membershipEndDateLabel(): string {
    const end = this.membershipStatus?.endDate;
    if (!end) return '';
    return new Date(end).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  get featuredPlan(): MembershipPlanApi | null {
    return this.plans.find((p) => p.planCode === 'professional') || this.plans[0] || null;
  }

  get visiblePlans(): MembershipPlanApi[] {
    if (this.isStudentMember || this.isProMember) {
      return this.plans.filter((p) => p.planCode === 'professional');
    }
    return this.plans;
  }

  get pageTitle(): string {
    if (this.isProMember) {
      return 'Your Professional Membership';
    }
    return this.isStudentMember
      ? 'Upgrade to Professional Plan'
      : 'Unlimited Courses & Workshops for One Full Year';
  }

  get pageLead(): string {
    if (this.isProMember) {
      if (this.canRenewMembership) {
        return 'Your plan is eligible for renewal. Renew now to continue without interruption.';
      }
      const days = this.renewalOpensInDays;
      return days > 0
        ? `You are on the Professional Plan. Renewal opens in ${days} day${days === 1 ? '' : 's'}.`
        : 'You are on the Professional Plan.';
    }
    return this.isStudentMember
      ? 'Upgrade your membership to unlock all workshops, events, and professional resources.'
      : 'Access 50+ technical courses, live workshops, engineering resources, and exclusive member benefits.';
  }

  selectBillingCycle(cycle: BillingCycle): void {
    if (this.lockedBillingCycle && cycle !== this.lockedBillingCycle) {
      return;
    }
    this.selectedBillingCycle = cycle;
  }

  isYearlyBilling(): boolean {
    return this.selectedBillingCycle === 'yearly';
  }

  getDisplayPrice(plan: MembershipPlanApi): number {
    return this.isYearlyBilling() ? plan.yearlyPrice : plan.sixMonthPrice;
  }

  getOriginalPrice(plan: MembershipPlanApi): number {
    return plan.yearlyOriginalPrice;
  }

  showYearlyDiscount(): boolean {
    return this.isYearlyBilling();
  }

  getPricePeriodLabel(): string {
    return this.isYearlyBilling() ? '/ year' : '/ 6 months';
  }

  getPlanMeta(plan: MembershipPlanApi): PlanFeatureSet {
    return this.planMeta[plan.planCode] || {
      subtitle: '',
      featuresHeading: 'Includes:',
      features: [],
    };
  }

  isHighlighted(plan: MembershipPlanApi): boolean {
    if (this.highlightPlanCode) {
      return plan.planCode === this.highlightPlanCode;
    }
    return !!this.getPlanMeta(plan).isMostPopular;
  }

  isCurrentPlan(plan: MembershipPlanApi): boolean {
    const code = (this.membershipStatus?.planCode || '').toLowerCase();
    return !!this.membershipStatus?.isActiveMember && code === plan.planCode;
  }

  canPurchase(plan: MembershipPlanApi): boolean {
    if (this.isCurrentPlan(plan)) {
      return this.isProMember && this.canRenewMembership;
    }
    if (this.isStudentMember && plan.planCode === 'student') {
      return false;
    }
    if (this.isProMember) {
      return false;
    }
    return true;
  }

  getCtaLabel(plan: MembershipPlanApi): string {
    if (this.isCurrentPlan(plan) && this.isProMember) {
      if (this.canRenewMembership) {
        return 'Renew plan';
      }
      if (this.renewalOpensInDays > 0) {
        return `Renewal in ${this.renewalOpensInDays} days`;
      }
      return 'Current plan';
    }
    if (this.isCurrentPlan(plan)) {
      return 'Current plan';
    }
    if (this.isStudentMember && plan.planCode === 'professional') {
      return 'Upgrade now';
    }
    return 'Choose this plan';
  }

  startCheckout(plan: MembershipPlanApi): void {
    if (!this.canPurchase(plan)) {
      return;
    }
    this.router.navigate(['/checkout/membership', plan.planCode], {
      queryParams: { cycle: this.selectedBillingCycle },
    });
  }

  scrollToPricing(): void {
    document.getElementById('student-membership-pricing')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  startFeaturedCheckout(): void {
    const plan = this.featuredPlan;
    if (!plan || !this.canPurchase(plan)) {
      if (this.isProMember) {
        this.scrollToPricing();
      }
      return;
    }
    if (this.lockedBillingCycle) {
      this.selectedBillingCycle = this.lockedBillingCycle;
    } else {
      this.selectedBillingCycle = 'yearly';
    }
    this.startCheckout(plan);
  }
}
