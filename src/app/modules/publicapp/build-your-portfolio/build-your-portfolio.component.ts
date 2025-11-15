


import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-build-your-portfolio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './build-your-portfolio.component.html',
  styleUrls: ['./build-your-portfolio.component.scss'],
  standalone: false,
})
export class BuildYourPortfolioComponent implements OnInit {
  readonly heroHighlights = [
    { value: '8K+', label: 'Professionals empowered' },
    { value: '120+', label: 'Templates & layouts' },
    { value: '40+', label: 'Industry credentials supported' },
  ];

  readonly experiencePillars = [
    {
      title: 'Structured storytelling',
      description:
        'Blend certifications, projects, and testimonials into guided chapters tuned for engineering journeys.',
    },
    {
      title: 'Live credibility',
      description:
        'Embed live badges, CPD points, and verified scores that refresh as soon as you add new learning.',
    },
    {
      title: 'Share-ready links',
      description:
        'Generate a premium, mobile-optimized link that travels with proposals, interviews, and bids.',
    },
  ];

  readonly buildSteps = [
    {
      step: '01',
      title: 'Curate your evidence',
      description: 'Upload course certificates, client wins, safety moments, and measurable impact.',
    },
    {
      step: '02',
      title: 'Tag and organize',
      description: 'Map every entry to skills, standards, and segments that recruiters search for.',
    },
    {
      step: '03',
      title: 'Share and iterate',
      description: 'Publish one secure link and update it anytime without resending attachments.',
    },
  ];

  readonly showcaseSpotlights = [
    {
      badge: 'Live',
      title: 'Skills heatmap',
      description: 'Visualize technical proficiency and compliance readiness across every discipline.',
    },
    {
      badge: 'Trusted',
      title: 'Project capsules',
      description: 'Summarize assignments with scope, KPIs, and embedded media for richer storytelling.',
    },
    {
      badge: 'Verified',
      title: 'Credential vault',
      description: 'Store API, NACE, AWS, ASNT, and more with expiry reminders baked in.',
    },
  ];

  constructor(
    private readonly titleService: Title,
    private readonly metaService: Meta,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/build-your-portfolio');
    this.titleService.setTitle('Build Your Portfolio - Oil and Gas Club');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Build a premium energy portfolio with Oilandgasclub. Showcase certifications, projects, and wins to accelerate your oil & gas career.',
      },
      {
        name: 'keywords',
        content:
          'build portfolio, oil and gas portfolio, certification showcase, professional branding, oilandgasclub portfolio, energy skills profile',
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
