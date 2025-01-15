
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-partner-us',
  templateUrl: './partner-us.component.html',
  styleUrls: ['./partner-us.component.scss']
})
export class PartnerUsComponent implements OnInit {

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
}
