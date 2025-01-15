
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-contact-us',
 templateUrl: './contact-us.component.html',
   styleUrls: ['./contact-us.component.scss']
  })
 export class ContactUsComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/contact-us');
         this.titleService.setTitle('Contact Us - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Have questions about our courses or certifications? Contact Oilandgasclub today for support, inquiries, and partnership opportunities. We are here to help!' },
      { name: 'keywords', content: 'Corporate training, oil and gas, professional development' },
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
