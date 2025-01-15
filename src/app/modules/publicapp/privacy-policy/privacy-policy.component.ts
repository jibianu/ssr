
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss']
})
export class PrivacyPolicyComponent implements OnInit {


  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/privacy-policy');
         this.titleService.setTitle('privacy-policy - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Read the privacy policy of Oil and Gas Club, outlining how we collect, use, and protect your personal information. We are committed to safeguarding your privacy while providing excellent services in the oil and gas industry.' },
      { name: 'keywords', content: 'privacy policy, personal information protection, data privacy, oil and gas club, user privacy, online privacy policy, data collection, privacy protection, oil and gas services, secure data usage, personal data security, website privacy terms' },
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
