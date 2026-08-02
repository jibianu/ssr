
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2, ChangeDetectionStrategy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
    selector: 'app-why-oilandgasclub',
    templateUrl: './why-oilandgasclub.component.html',
    styleUrls: ['./why-oilandgasclub.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection for static page
})
export class WhyOilandgasclubComponent implements OnInit {

  readonly heroHighlights = [
    { label: 'Customized content', value: '100%' },
    { label: 'Locations served', value: '7+' },
    { label: 'Learners', value: '250K+' }
  ];

  readonly pillars = [
    {
      icon: 'handshake',
      title: 'Partnership-first model',
      description: 'Joint planning cadences, transparent milestones, and success metrics that align to your competency roadmap.'
    },
    {
      icon: 'growth',
      title: 'Measurable ROI',
      description: 'Volume-based licenses, bundled cohorts, and dashboards that tie completions to productivity gains.'
    },
    {
      icon: 'collaboration',
      title: 'Specialist community',
      description: 'Practitioner mentors, peer-to-peer lounges, and cohort pods that sustain engagement across regions.'
    },
    {
      icon: 'promotion',
      title: 'Signal your expertise',
      description: 'Co-branded spotlights, badge kits, and internal campaigns that help you promote learning wins.'
    },
    {
      icon: 'workflow',
      title: 'Connected delivery',
      description: 'APIs, LMS integrations, and automation hooks so enrollments, tracking, and reports stay in sync.'
    }
  ];

  readonly differentiators = [
    {
      title: 'Built by practitioners',
      description: 'Programs are authored by plant leads, inspectors, and digital engineers—not generic content studios.'
    },
    {
      title: 'Hands-on simulators',
      description: 'Scenario labs using HYSYS, PV Elite, PIPENET, and RBI/FFS calculators sharpen real skills.'
    },
    {
      title: 'Career pathways',
      description: 'Structured roadmaps for process, mechanical, inspection, safety, and digital roles with certificates.'
    }
  ];

  readonly testimonials = [
    {
      quote: '“Flexible design sprints helped our global team master new codes without leaving the refinery.”',
      author: 'Training Lead – Downstream Major'
    },
    {
      quote: '“The community and mentor office hours kept our young engineers motivated post-certification.”',
      author: 'HR Partner – EPC'
    }
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // ✅ SEO: Set canonical URL
    this.setCanonicalURL('https://oilandgasclub.com/why-oilandgasclub');
    
    // ✅ SEO: Set page title
    this.titleService.setTitle('Why Oilandgasclub.com - Your Path to Success in Oil and Gas Certifications');
    
    // ✅ SEO: Set meta tags
    this.metaService.addTags([
      { name: 'description', content: 'Learn why Oilandgasclub.com is trusted by professionals for online learning in API, ASNT, and CSWIP certifications. Flexible, affordable, and career-focused courses.' },
      { name: 'keywords', content: 'Oil and Gas Club, industry certifications, self-learning courses, oil and gas training, API certifications, ASNT NDT, CSWIP training, HTRI courses, professional development, career advancement, oil and gas professionals' },
      { name: 'robots', content: 'index, follow' },
      
      // ✅ Open Graph Meta Tags
      { property: 'og:site_name', content: 'Oilandgasclub.com' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Why Oilandgasclub.com - Your Path to Success in Oil and Gas Certifications' },
      { property: 'og:description', content: 'Learn why Oilandgasclub.com is trusted by professionals for online learning in API, ASNT, and CSWIP certifications. Flexible, affordable, and career-focused courses.' },
      { property: 'og:author', content: 'Oilandgasclub Team' },
      { property: 'og:image', content: 'https://oilandgasclub.com/images/logo.png' },
      { property: 'og:image:width', content: '600' },
      { property: 'og:image:height', content: '500' },
      { property: 'og:url', content: 'https://oilandgasclub.com/why-oilandgasclub' },
      
      // ✅ Article Meta Tags
      { property: 'article:published_time', content: '2021-09-01T06:18:55.5419129' },
      { property: 'article:modified_time', content: '2023-07-08T06:43:07.881401' },
      { property: 'article:tag', content: 'Oil and Gas Training, Professional Certifications, Online Learning, Career Development' },
      { property: 'article:publisher', content: 'https://oilandgasclub.com' },
      
      // ✅ Twitter Meta Tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Why Oilandgasclub.com - Your Path to Success in Oil and Gas Certifications' },
      { name: 'twitter:description', content: 'Learn why Oilandgasclub.com is trusted by professionals for online learning in API, ASNT, and CSWIP certifications. Flexible, affordable, and career-focused courses.' },
      { name: 'twitter:site', content: '@oilandgasclub' },
      { name: 'twitter:creator', content: '@Oilandgasclub' },
      { name: 'twitter:url', content: 'https://oilandgasclub.com/why-oilandgasclub' },
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
