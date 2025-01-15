// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-guest-blogging',
//   templateUrl: './guest-blogging.component.html',
//   styleUrls: ['./guest-blogging.component.scss']
// })
// export class GuestBloggingComponent implements OnInit {

//   constructor() { }

//   ngOnInit(): void {
//   }

// }



import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-guest-blogging',
  templateUrl: './guest-blogging.component.html',
  styleUrls: ['./guest-blogging.component.scss']
})
export class GuestBloggingComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/guest-blogging');
         this.titleService.setTitle('Guest Blog: Mastering Oil and Gas Certifications | Oilandgasclub');
     this.metaService.addTags([
      { name: 'description', content: 'Explore expert insights, tips, and strategies for mastering API, ASNT, CSWIP, and HTRI certifications in the oil and gas industry.' },
      { name: 'keywords', content: 'guest blogging, oil and gas industry, content marketing, industry insights, guest post submission, oil and gas professionals' },
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
