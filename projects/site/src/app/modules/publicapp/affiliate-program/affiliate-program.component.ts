import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';

@Component({
   selector: 'app-affiliate-program',
   templateUrl: './affiliate-program.component.html',
   styleUrls: ['./affiliate-program.component.scss'],
   standalone: false
})
export class AffiliateProgramComponent implements OnInit {

  readonly programWorkSteps = [
    {
      icon: 'assets/affiliate-join-icon.svg',
      title: 'Join',
      description: 'Join OilAndGasClub\'s Affiliate Program on Impact.com, a trusted global partnership platform. Signing up is fast, simple, and completely free.'
    },
    {
      icon: 'assets/affiliate-choose-icon.svg',
      title: 'Choose',
      description: 'from Oil & Gas–specific courses, certifications, expert programs, and industry events. Promote the offerings that best match your audience using OilAndGasClub\'s banners, text links, or your own custom content.'
    },
    {
      icon: 'assets/affiliate-track-icon.svg',
      title: 'Track',
      description: 'your performance effortlessly with Impact.com\'s advanced tracking tools, including easy-to-use affiliate links, real-time analytics, and transparent reporting.'
    },
    {
      icon: 'assets/affiliate-earn-icon.svg',
      title: 'Earn',
      description: 'up to 45% commission on eligible purchases* that your users make on OilAndGasClub, while helping professionals grow their careers in the energy industry.'
    }
  ];


  readonly affiliateBenefits = [
    {
      icon: 'assets/affiliate-grow-icon.svg',
      title: 'Grow with OilAndGasClub',
      description: 'Help professionals upskill with industry-relevant Oil & Gas and energy programs.'
    },
    {
      icon: 'assets/affiliate-earn-icon.svg',
      title: 'Earn through your network',
      description: 'Generate income by promoting trusted courses and certifications to your audience.'
    },
    {
      icon: 'assets/affiliate-flexible-icon.svg',
      title: 'Work on your terms',
      description: 'Promote anytime, anywhere, at your own pace with full flexibility.'
    }
  ];

  readonly programPerks = [
    {
      title: 'High-converting courses',
      detail: 'Promote best-selling API, ASNT, CSWIP, HTRI and process design programs trusted by global engineers.'
    },
    {
      title: '30% recurring commissions',
      detail: 'Earn generous payouts on every qualified purchase, including subscription renewals and bundles.'
    },
    {
      title: 'Real-time tracking',
      detail: 'Use personalized dashboards, deep-linking, and attribution pixels to monitor leads instantly.'
    },
    {
      title: 'Marketing support',
      detail: 'Get pre-built creative assets, campaign guidance, and joint webinars to accelerate your reach.'
    }
  ];

  readonly steps = [
    {
      step: '01',
      title: 'Apply & get onboarded',
      description: 'Share how you plan to promote courses. Approved partners receive unique links within 24 hours.'
    },
    {
      step: '02',
      title: 'Launch campaigns',
      description: 'Embed banners, write reviews, stream demos, or host webinars. We supply creative + course data.'
    },
    {
      step: '03',
      title: 'Track & earn payouts',
      description: 'View clicks, trials, and purchases inside your dashboard. Payouts go out monthly via bank transfer.'
    }
  ];

  readonly faqList = [
    {
      question: 'Who can become an affiliate?',
      answer: 'Educators, content creators, training companies, student communities, or anyone with an engineering-focused audience.'
    },
    {
      question: 'How long do referral cookies last?',
      answer: 'We use 60-day tracking windows, so you earn commission even if learners return and buy later.'
    },
    {
      question: 'Do you provide exclusive discounts?',
      answer: 'Yes. Approved partners get custom coupon codes and launch packages for their audience.'
    }
  ];
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  /** Elearn affiliate signup page URL (auth/register-affiliate). Used for "Apply to be an affiliate" / "Submit application" links. */
  getAffiliateSignupUrl(): string {
    const elearnBase = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
    if (elearnBase.startsWith('http://') || elearnBase.startsWith('https://')) {
      return `${elearnBase}/register-affiliate`;
    }
    return '/register-affiliate';
  }

  /** Navigate to elearn affiliate signup page so user can register as an affiliate. */
  navigateToAffiliateSignup(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!isPlatformBrowser(this.platformId)) return;
    window.location.href = this.getAffiliateSignupUrl();
  }

  ngOnInit(): void {
    this.setCanonicalURL('https://oilandgasclub.com/affiliate-program');
         this.titleService.setTitle('Join the Oilandgasclub Affiliate Program - Earn Commissions on Online Courses');
     this.metaService.addTags([
      { name: 'description', content: "Promote Oilandgasclub's online courses and certifications. Join our affiliate program and earn commissions by referring learners in the oil and gas industry. Start today!" },
      { name: 'keywords', content: 'affiliate program, oil and gas training, affiliate marketing, API certification, ASNT NDT, CSWIP certification, HTRI training, oil and gas online courses, affiliate earnings, industry certifications, self-learning courses' },
    ]);
  }

  setCanonicalURL(url: string): void {
    // Remove any existing canonical link
    const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', url);
    } else {
      // Create a new canonical link
      const link: HTMLLinkElement = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }
}
