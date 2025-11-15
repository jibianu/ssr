
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
    selector: 'app-partner-us',
    templateUrl: './partner-us.component.html',
    styleUrls: ['./partner-us.component.scss'],
    standalone: false
})
export class PartnerUsComponent implements OnInit {

  submitted = false;

  readonly spotlightPoints = [
    'Global audience: reach engineers, inspectors, and decision-makers across 30+ countries.',
    'Flexible partnership models: sponsors, distributors, referral partners, facilitators.',
    'Co-marketing campaigns with guaranteed impressions and qualified leads.'
  ];

  readonly opportunities = [
    {
      title: 'Sponsorship & exhibitions',
      description: 'Showcase your brand at conferences, live trainings, and digital events attended by industry leaders.'
    },
    {
      title: 'Affiliate & referral programs',
      description: 'Promote courses or consulting services, earn commissions, and expand your service catalog.'
    },
    {
      title: 'Content collaborations',
      description: 'Co-create webinars, whitepapers, and best-practice guides for the oil & gas community.'
    },
    {
      title: 'Speaker & facilitator roles',
      description: 'Share expertise onstage or in classrooms while strengthening personal and corporate credibility.'
    }
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/partner-us');
         this.titleService.setTitle('Partner with Us - Oilandgasclub | Empower Your Marketing Strategy');
     this.metaService.addTags([
      { name: 'description', content: 'Discover how partnering with Oilandgasclub can boost your reach and engagement. Become part of a global platform offering oil and gas training and certifications.' },
      { name: 'keywords', content: 'oil and gas partnerships, affiliate program, industry collaboration, business partnerships, oil and gas industry, expand reach, professional collaboration, digital learning partnerships, oil and gas club partnership' },
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

  onFormSubmit(): void {
    this.submitted = true;
  }

  onIframeLoad(): void {
    if (this.submitted) {
      const confirmed = confirm('Thank you for completing this form!');
      if (confirmed) {
        window.location.href = '/';
      }
    }
  }
}
