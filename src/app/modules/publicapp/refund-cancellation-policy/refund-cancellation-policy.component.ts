
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
    selector: 'app-refund-cancellation-policy',
    templateUrl: './refund-cancellation-policy.component.html',
    styleUrls: ['./refund-cancellation-policy.component.scss'],
    standalone: false
})
export class RefundCancellationPolicyComponent implements OnInit {

  readonly highlights = [
    { title: 'Clarity first', description: 'Straightforward rules for every self-learning course so you always know what to expect.' },
    { title: 'Human support', description: 'Dedicated advisors respond within 24 hours to resolve technical or content concerns.' },
    { title: 'Flexible resolutions', description: 'Eligible cases include unused access, platform issues, or major content mismatches.' }
  ];

  readonly refundSteps = [
    {
      title: 'Contact support',
      detail: 'Email anush@oilandgasclub.com within 7–14 days of purchase with your order ID and reason.'
    },
    {
      title: 'Verification',
      detail: 'Our team reviews access logs, technical reports, or content feedback within 3–5 business days.'
    },
    {
      title: 'Resolution',
      detail: 'Approved refunds go back to the original payment method within 3–5 business days.'
    }
  ];

  readonly importantNotes = [
    'Once course material is consumed, refunds typically do not apply unless there is a verified issue.',
    'Partial refunds may be possible when minimal usage occurred before access was revoked.',
    'Payment gateway fees and currency conversion charges are non-refundable.',
    'We’re committed to a positive learning experience—reach out if you need help or clarification.'
  ];

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
