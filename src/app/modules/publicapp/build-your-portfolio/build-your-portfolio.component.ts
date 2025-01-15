


import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-build-your-portfolio',
  templateUrl: './build-your-portfolio.component.html',
  styleUrls: ['./build-your-portfolio.component.scss']
})
export class BuildYourPortfolioComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/build-your-portfolio');
         this.titleService.setTitle('build-your-portfolio - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Build your professional portfolio with oilandgasclub.com. Showcase your expertise, certifications, and skills in the oil and gas industry to attract opportunities and advance your career. Start building your portfolio today!' },
      { name: 'keywords', content: 'build your portfolio, professional portfolio, oil and gas certifications, career advancement, showcase expertise, oil and gas industry, skill development, certification showcase, portfolio building, industry professionals, digital portfolio, career growth, oil and gas skills, professional branding, portfolio creation' },
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
