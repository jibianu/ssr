
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-career',
  templateUrl: './career.component.html',
  styleUrls: ['./career.component.scss']
})
export class CareerComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/career');
         this.titleService.setTitle('Careers at Oilandgasclub | Join Our Team and Grow with Us');
     this.metaService.addTags([
      { name: 'description', content: 'Explore exciting career opportunities in the oil and gas industry with Oil and Gas Club. Discover professional growth paths, industry insights, certifications, and resources to advance your career in the energy sector.' },
      { name: 'keywords', content: 'oil and gas careers, energy sector jobs, professional growth, career advancement, oil and gas industry, industry certifications, job opportunities, energy sector training, oil and gas career resources, professional development, oil and gas training, oil and gas certifications' },
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
