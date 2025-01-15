
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-policies',
  templateUrl: './policies.component.html',
  styleUrls: ['./policies.component.scss']
})
export class PoliciesComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/policies');
         this.titleService.setTitle('policies - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Explore the comprehensive policies of Oil and Gas Club, outlining the terms of use, privacy policy, and guidelines for a secure and professional learning experience.' },
      { name: 'keywords', content: 'policies, terms of use, privacy policy, oil and gas training, oil and gas platform policies, user guidelines, oil and gas self-learning, terms and conditions, website privacy, oil and gas professional courses' },
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
