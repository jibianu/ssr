import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-affiliate-program',
  templateUrl: './affiliate-program.component.html',
  styleUrls: ['./affiliate-program.component.scss']
})
export class AffiliateProgramComponent implements OnInit {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/affiliate-program');
         this.titleService.setTitle('Join the Oilandgasclub Affiliate Program - Earn Commissions on Online Courses');
     this.metaService.addTags([
      { name: 'description', content: "Promote Oilandgasclub's online courses and certifications. Join our affiliate program and earn commissions by referring learners in the oil and gas industry. Start today!" },
      { name: 'keywords', content: 'affiliate program, oil and gas training, affiliate marketing, API certification, ASNT NDT, CSWIP certification, HTRI training, oil and gas online courses, affiliate earnings, industry certifications, self-learning courses' },
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
