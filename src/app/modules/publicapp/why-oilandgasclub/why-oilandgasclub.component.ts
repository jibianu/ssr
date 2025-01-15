
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-why-oilandgasclub',
  templateUrl: './why-oilandgasclub.component.html',
  styleUrls: ['./why-oilandgasclub.component.scss']
})
export class WhyOilandgasclubComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/why-oilandgasclub');
         this.titleService.setTitle('Why Oilandgasclub.com - Your Path to Success in Oil and Gas Certifications');
     this.metaService.addTags([
      { name: 'description', content: 'Learn why Oilandgasclub.com is trusted by professionals for online learning in API, ASNT, and CSWIP certifications. Flexible, affordable, and career-focused courses.' },
      { name: 'keywords', content: 'Oil and Gas Club, industry certifications, self-learning courses, oil and gas training, API certifications, ASNT NDT, CSWIP training, HTRI courses, professional development, career advancement, oil and gas professionals' },
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
