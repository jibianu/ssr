
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-refund-cancellation-policy',
  templateUrl: './refund-cancellation-policy.component.html',
  styleUrls: ['./refund-cancellation-policy.component.scss']
})
export class RefundCancellationPolicyComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/refund-cancellation-policy');
         this.titleService.setTitle('refund-cancellation-policy - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: "Read Oil and Gas Club's Refund and Cancellation Policy to understand the terms and conditions regarding cancellations, refunds, and support for our online courses and services. Ensure a smooth learning experience with clear policies for all users." },
      { name: 'keywords', content: 'refund policy, cancellation policy, oil and gas courses, online course refund, course cancellation, oil and gas services, customer support, learning platform policies, course refund terms, online training refund, course cancellation terms, oil and gas club policies' },
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
