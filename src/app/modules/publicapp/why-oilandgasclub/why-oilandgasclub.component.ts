
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

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    // ✅ SEO: Set canonical URL
    this.setCanonicalURL('https://www.oilandgasclub.com/why-oilandgasclub');
    
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
      { property: 'og:image', content: 'https://www.oilandgasclub.com/images/logo.png' },
      { property: 'og:image:width', content: '600' },
      { property: 'og:image:height', content: '500' },
      { property: 'og:url', content: 'https://www.oilandgasclub.com/why-oilandgasclub' },
      
      // ✅ Article Meta Tags
      { property: 'article:published_time', content: '2021-09-01T06:18:55.5419129' },
      { property: 'article:modified_time', content: '2023-07-08T06:43:07.881401' },
      { property: 'article:tag', content: 'Oil and Gas Training, Professional Certifications, Online Learning, Career Development' },
      { property: 'article:publisher', content: 'https://www.oilandgasclub.com' },
      
      // ✅ Twitter Meta Tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Why Oilandgasclub.com - Your Path to Success in Oil and Gas Certifications' },
      { name: 'twitter:description', content: 'Learn why Oilandgasclub.com is trusted by professionals for online learning in API, ASNT, and CSWIP certifications. Flexible, affordable, and career-focused courses.' },
      { name: 'twitter:site', content: '@oilandgasclub' },
      { name: 'twitter:creator', content: '@Oilandgasclub' },
      { name: 'twitter:url', content: 'https://www.oilandgasclub.com/why-oilandgasclub' },
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
