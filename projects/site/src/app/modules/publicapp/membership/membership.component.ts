import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../../auth/auth.service';
import { buildElearnAuthUrl } from 'src/app/core/helpers/elearn-auth-url.helper';
import { isSplitElearnOrigin } from 'src/app/core/helpers/course-checkout-url.helper';

export type MembershipPlanId = 'student' | 'professional' | 'business';
export type BillingCycle = 'sixMonth' | 'yearly';

export interface MembershipPlan {
  id: MembershipPlanId;
  title: string;
  subtitle: string;
  sixMonthPrice: number | null;
  yearlyDiscountPercent?: number;
  ctaLabel: string;
  badge?: string;
  isMostPopular: boolean;
  isCustom?: boolean;
  featuresHeading?: string;
  features: string[];
}

export interface MembershipFaq {
  question: string;
  answer?: string;
  intro?: string;
  bullets?: string[];
}

export interface MembershipFeatureHighlight {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
}

export interface MembershipPromoHighlight {
  id: string;
  label: string;
  iconTone: 'purple' | 'teal' | 'pink' | 'green' | 'orange';
}

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: false,
})
export class MembershipComponent implements OnInit {
  readonly heroFeaturedPlanId: MembershipPlanId = 'professional';

  readonly trustedCompanies = {
    title: 'Top Companies Trust Us',
    lead: 'Get your team access to top 70+ courses',
  };

  readonly trustedCompanyLogos = [
    { name: 'Shell', src: 'assets/img/shell.svg' },
    { name: 'ADNOC', src: 'assets/img/adnoc.svg' },
    { name: 'Petronas', src: 'assets/img/petronas-2.svg' },
    { name: 'Fluor', src: 'assets/img/fluor.svg' },
    { name: 'TechnipFMC', src: 'assets/img/technipfm.svg' },
    { name: 'SWECO', src: 'assets/img/sweco.svg' },
  ];

  membershipPlans: MembershipPlan[] = [
    {
      id: 'student',
      title: 'Student Plan',
      subtitle: 'Best for students and freshers starting their oil & gas career.',
      sixMonthPrice: 5999,
      yearlyDiscountPercent: 30,
      ctaLabel: 'Choose this plan',
      isMostPopular: false,
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
    {
      id: 'professional',
      title: 'Professional Plan',
      subtitle: 'Best for working professionals upgrading technical skills.',
      sixMonthPrice: 8999,
      yearlyDiscountPercent: 30,
      ctaLabel: 'Choose this plan',
      badge: 'Most Popular',
      isMostPopular: true,
      featuresHeading: 'Everything in Student Plan plus:',
      features: [
        'Priority workshop notifications by category',
        'Free coupons for all monthly Oilandgasclub events',
        'Access to professional templates and technical guides',
        'Career-focused workshop recommendations',
        'Early access to new technical courses',
        'Better support for career and skill growth',
      ],
    },
    {
      id: 'business',
      title: 'Business Custom',
      subtitle: 'Best for teams, EPC firms, and organizations upskilling their workforce.',
      sixMonthPrice: null,
      ctaLabel: 'Contact sales',
      isCustom: true,
      isMostPopular: false,
      featuresHeading: 'Everything in Professional Plan plus:',
      features: [
        'Custom team licensing and seat management',
        'Private workshops and cohort-based training',
        'Dedicated account and onboarding support',
        'Custom learning paths by discipline',
        'Progress tracking and completion reports',
        'Priority technical support for your team',
      ],
    },
  ];

  readonly billingOptions: { id: BillingCycle; label: string; savingsBadge?: string }[] = [
    { id: 'sixMonth', label: '6 Months' },
    { id: 'yearly', label: 'Yearly', savingsBadge: 'Save 30%' },
  ];

  readonly perks = [
    'Unlimited access to 50+ industry-focused courses',
    'One year of free live workshops',
    'Monthly exclusive member coupons',
    'Engineering templates & project documentation',
    'Interview questions & career preparation guides',
    'Category-specific learning paths',
    'Priority notifications for new workshops',
    'Continuous course updates throughout the year',
    'Certificates for completed learning',
    'Learn Anytime with On-Demand Courses',
  ];

  readonly featureHighlight: MembershipFeatureHighlight = {
    title: 'Unlimited Learning for Every Oil & Gas Engineer',
    description:
      "Whether you're a student or an experienced professional, your membership gives you one year of access to technical courses, live workshops, engineering templates, interview guides, career resources, and exclusive member-only benefits.",
    imageSrc: 'assets/img/membership-feature.png',
    imageAlt: 'Oil and gas professional learning with Oilandgasclub membership',
  };

  readonly membershipPromo = {
    title: 'Unlock One Year of Unlimited Learning with Oilandgasclub Membership',
    description:
      'Get free access to eligible technical courses, live workshops, engineering resources, and exclusive member benefits—all with a single membership. Designed for students and professionals looking to build successful careers in the oil & gas industry.',
    ctaPrimary: 'Subscribe now',
    ctaSecondary: 'Learn more',
    imageSrc: 'assets/img/membership-promo.png',
    imageAlt: 'Professional building oil and gas career skills with Oilandgasclub membership',
    highlights: [
      {
        id: 'courses',
        label: 'Unlimited access to 50+ technical courses for one year',
        iconTone: 'purple',
      },
      {
        id: 'workshops',
        label: 'Free access to live workshops throughout your membership',
        iconTone: 'teal',
      },
      {
        id: 'updates',
        label: 'New courses and workshops added regularly',
        iconTone: 'pink',
      },
      {
        id: 'instructors',
        label: 'Learn from experienced industry professionals',
        iconTone: 'orange',
      },
    ] as MembershipPromoHighlight[],
  };

  readonly faqs: MembershipFaq[] = [
    {
      question: 'What is the Oilandgasclub Membership?',
      answer:
        'The Oilandgasclub Membership gives you ongoing access to technical learning resources, selected courses, workshop benefits, career templates, and exclusive member-only offers designed for oil & gas professionals and students.',
    },
    {
      question: 'What is included in the Student Plan?',
      intro: 'The Student Plan includes:',
      bullets: [
        'Free notifications for selected category workshops',
        'Access to 50+ on-demand courses',
        'New course updates',
        'Monthly workshop coupons',
        'Job-ready templates and career guides',
        'Selected category workshop access',
      ],
    },
    {
      question: 'What additional benefits do I get with the Professional Plan?',
      intro: 'The Professional Plan includes everything in the Student Plan plus:',
      bullets: [
        'Priority workshop notifications',
        'Free coupons for monthly Oilandgasclub workshops',
        'Early access to new technical courses',
        'Professional templates and engineering resources',
        'Career-focused learning recommendations',
      ],
    },
    {
      question: 'Will new courses be added regularly?',
      answer:
        'Yes. We continuously add new technical courses, engineering workshops, interview resources, and learning materials throughout the year.',
    },
    {
      question: 'Are live workshops included?',
      answer:
        'Members receive free or discounted access (depending on the workshop) through exclusive member coupons. Selected workshops are available at no additional cost.',
    },
    {
      question: 'Which workshops will I receive notifications for?',
      intro: "You'll receive notifications based on the engineering categories you choose, such as:",
      bullets: [
        'Process Engineering',
        'Piping Design',
        'Mechanical Engineering',
        'Instrumentation',
        'Electrical Engineering',
        'Civil Engineering',
        'NDT & Welding',
        'Pipeline Engineering',
      ],
    },
    {
      question: 'Can I cancel my membership anytime?',
      answer:
        'Yes. You can cancel your membership at any time. Your membership benefits remain active until the end of your current billing period.',
    },
    {
      question: 'Will I receive certificates?',
      answer: 'Yes. Certificates are available for eligible courses and workshops completed through the platform.',
    },
    {
      question: 'Can I access the courses on mobile?',
      answer: 'Yes. Oilandgasclub is fully accessible from desktop, tablet, and mobile devices.',
    },
    {
      question: 'Is the membership suitable for beginners?',
      answer:
        "Absolutely. Whether you're a student, fresher, or experienced engineer, the membership provides learning resources suitable for every career stage.",
    },
    {
      question: 'Do I get job preparation resources?',
      answer:
        'Yes. Members receive access to interview preparation materials, engineering templates, resume guides, career resources, and technical documentation.',
    },
    {
      question: 'How do I start my membership?',
      answer:
        "Simply choose the plan that best fits your career goals, complete the subscription process, and you'll immediately gain access to your membership benefits.",
    },
  ];

  readonly supportEmail = 'anush@oilandgasclub.com';
  readonly supportWhatsAppUrl = 'https://wa.me/919840287919';
  readonly supportWhatsAppDisplay = '+91 98402 87919';

  selectedBillingCycle: BillingCycle = 'yearly';

  constructor(
    private readonly titleService: Title,
    private readonly metaService: Meta,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document,
    private readonly authService: AuthenticationService,
    private readonly http: HttpClient
  ) {}

  get yearlyDiscountPercent(): number {
    return this.getPlanDiscount(this.featuredPlan);
  }

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/membership');
    this.titleService.setTitle('Membership - Oilandgasclub');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Join Oilandgasclub membership for premium training perks, expert access, and invitations to global oil & gas events.',
      },
      {
        name: 'keywords',
        content:
          'oil and gas membership, industry community, professional network, technical mentors, oilandgasclub benefits',
      },
    ]);
    this.loadPricingFromApi();
  }

  private loadPricingFromApi(): void {
    const url = `${environment.apiUrl}api/membership/plans`;
    this.http.get<Array<{
      planCode?: string;
      planName?: string;
      sixMonthPrice?: number;
      yearlyDiscountPercent?: number;
    }>>(url).subscribe({
      next: (plans) => {
        for (const api of plans || []) {
          const code = (api.planCode || '').toLowerCase();
          const plan = this.membershipPlans.find((p) => p.id === code);
          if (!plan || plan.isCustom) continue;
          if (api.sixMonthPrice != null) plan.sixMonthPrice = Number(api.sixMonthPrice);
          if (api.yearlyDiscountPercent != null) plan.yearlyDiscountPercent = Number(api.yearlyDiscountPercent);
          if (api.planName?.trim()) plan.title = api.planName.trim();
        }
        const yearlyOption = this.billingOptions.find((o) => o.id === 'yearly');
        if (yearlyOption) {
          yearlyOption.savingsBadge = `Save ${this.yearlyDiscountPercent}%`;
        }
      },
      error: () => {
        /* Keep hardcoded fallback prices */
      },
    });
  }

  planYearlyDiscount(plan: MembershipPlan): number {
    return this.getPlanDiscount(plan);
  }

  private getPlanDiscount(plan: MembershipPlan): number {
    return plan.yearlyDiscountPercent ?? 30;
  }

  selectBillingCycle(cycle: BillingCycle): void {
    this.selectedBillingCycle = cycle;
  }

  isYearlyBilling(): boolean {
    return this.selectedBillingCycle === 'yearly';
  }

  getPricePeriodLabel(): string {
    return this.isYearlyBilling() ? '/ year' : '/ 6 months';
  }

  getDisplayPrice(plan: MembershipPlan): number | null {
    if (plan.isCustom || plan.sixMonthPrice === null) {
      return null;
    }

    if (this.isYearlyBilling()) {
      const fullYearPrice = plan.sixMonthPrice * 2;
      return Math.round(fullYearPrice * (1 - this.getPlanDiscount(plan) / 100));
    }

    return plan.sixMonthPrice;
  }

  getOriginalPrice(plan: MembershipPlan): number | null {
    if (plan.isCustom || plan.sixMonthPrice === null || !this.isYearlyBilling()) {
      return null;
    }

    return plan.sixMonthPrice * 2;
  }

  showYearlyDiscount(plan: MembershipPlan): boolean {
    return this.isYearlyBilling() && !plan.isCustom && plan.sixMonthPrice !== null;
  }

  get featuredPlan(): MembershipPlan {
    return this.membershipPlans.find((plan) => plan.id === this.heroFeaturedPlanId)!;
  }

  getHeroYearlyOriginal(): number {
    return this.featuredPlan.sixMonthPrice! * 2;
  }

  getHeroYearlyPrice(): number {
    return Math.round(this.getHeroYearlyOriginal() * (1 - this.getPlanDiscount(this.featuredPlan) / 100));
  }

  getHeroMonthlyEquivalent(): number {
    return Math.round(this.getHeroYearlyPrice() / 12);
  }

  getHeroSixMonthPrice(): number {
    return this.featuredPlan.sixMonthPrice!;
  }

  getPromoStartingMonthly(): number {
    const studentPlan = this.membershipPlans.find((plan) => plan.id === 'student');
    if (!studentPlan?.sixMonthPrice) {
      return this.getHeroMonthlyEquivalent();
    }

    const yearlyPrice = Math.round(
      studentPlan.sixMonthPrice * 2 * (1 - this.getPlanDiscount(studentPlan) / 100)
    );
    return Math.round(yearlyPrice / 12);
  }

  scrollToPricing(): void {
    this.document.getElementById('membership-pricing-heading')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  startHeroMembership(): void {
    this.selectedBillingCycle = 'yearly';
    this.startMembership(this.featuredPlan);
    this.scrollToPricing();
  }

  startPromoMembership(): void {
    this.startHeroMembership();
  }

  startMembership(plan: MembershipPlan): void {
    if (plan.isCustom) {
      if (typeof window !== 'undefined') {
        window.location.href = '/partner-us';
      }
      return;
    }

    const cycle = this.selectedBillingCycle;
    const returnUrl = `/checkout/membership/${encodeURIComponent(plan.id)}?cycle=${encodeURIComponent(cycle)}`;
    const elearnBase = (environment.elearnAppUrl || '').trim().replace(/\/$/, '');

    this.authService.ensureTokensLoaded();
    if (!this.authService.hasJwtForAuthenticatedApi()) {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('returnUrl', returnUrl);
        } catch {
          /* ignore */
        }
      }
      window.location.href = buildElearnAuthUrl('login', `returnUrl=${encodeURIComponent(returnUrl)}`, elearnBase);
      return;
    }

    const checkoutPath = isSplitElearnOrigin()
      ? `${elearnBase}${returnUrl}`
      : returnUrl;
    window.location.href = checkoutPath;
  }

  private setCanonicalURL(url: string): void {
    const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', url);
    } else {
      const link: HTMLLinkElement = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }
}
