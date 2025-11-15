import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-membership',
  templateUrl: './membership.component.html',
  styleUrls: ['./membership.component.scss'],
  standalone: false,
})
export class MembershipComponent implements OnInit {
  readonly heroStats = [
    { value: '15K+', label: 'Active members' },
    { value: '220+', label: 'Expert mentors' },
    { value: '40+', label: 'Annual industry events' },
  ];

  readonly reasonsToJoin = [
    {
      title: 'Priority invites',
      description: 'Secure first access to masterclasses, summits, and talent showcases across regions.',
    },
    {
      title: 'Advisor access',
      description: 'Book tactical sessions with drilling, inspection, and automation experts on demand.',
    },
    {
      title: 'Technical concierge',
      description: 'Get troubleshooting guidance and curated standards for operational decisions.',
    },
    {
      title: 'Community recognition',
      description: 'Showcase thought leadership in forums, newsletters, and partner webinars.',
    },
  ];

  readonly membershipTiers = [
    {
      name: 'Essential',
      tagline: 'For engineers building core capability',
      benefits: ['Monthly newsletter & insights', 'Community discussion forums', 'Discounted public courses'],
      ctaUrl: '/contact-us',
    },
    {
      name: 'Professional',
      tagline: 'For leads managing teams & projects',
      benefits: ['All Essential benefits', 'Quarterly mentor sessions', 'Exclusive technical briefs', 'Event priority seating'],
      ctaUrl: '/contact-us',
    },
    {
      name: 'Enterprise',
      tagline: 'For organizations powering large cohorts',
      benefits: ['All Professional benefits', 'Custom learning analytics', 'Private forums & AMAs', 'White-glove onboarding'],
      ctaUrl: '/partner-us',
    },
  ];

  readonly perks = [
    'Monthly e-newsletters',
    'Guideline library access',
    'Technical forums',
    'Networking sessions',
    'Industry councils',
    'Partner event passes',
    'Calls with experts',
    'Project showcases',
  ];

  constructor(
    private readonly titleService: Title,
    private readonly metaService: Meta,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

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


