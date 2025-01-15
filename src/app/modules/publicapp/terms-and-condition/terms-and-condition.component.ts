import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-terms-and-condition',
  templateUrl: './terms-and-condition.component.html',
  styleUrls: ['./terms-and-condition.component.scss']
})
export class TermsAndConditionComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/terms-and-conditions');
         this.titleService.setTitle('terms-and-conditions - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Read the terms and conditions of oilandgasclub.com to understand the rules, regulations, and policies governing the use of our platform, services, and offerings. Stay informed about your rights and responsibilities as a user.' },
      { name: 'keywords', content: 'terms and conditions, oilandgasclub, website terms, service agreement, user policies, platform regulations, oil and gas services, website usage, user rights, terms of service, legal policies, oil and gas platform rules.' },
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
