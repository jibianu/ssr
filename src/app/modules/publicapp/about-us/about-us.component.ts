

import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-about-us',
  templateUrl: './about-us.component.html',
  styleUrls: ['./about-us.component.scss']
})
export class AboutUsComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/about-us');
         this.titleService.setTitle('About Us - Oilandgasclub | Online Training and Certification Platform');
     this.metaService.addTags([
      { name: 'description', content: "Discover Oil and Gas Club's mission to provide world-class digital skills and certification programs for professionals in the oil and gas industry. Empowering learners to advance their careers with self-paced courses and expert-led training." },
      { name: 'keywords', content: 'oil and gas training, digital skills, professional certifications, career advancement, self-learning courses, oil and gas industry, industry certifications, expert-led courses, online learning, oil and gas professionals' },
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
