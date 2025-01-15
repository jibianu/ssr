
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-in-house-solutions',
  templateUrl: './in-house-solutions.component.html',
  styleUrls: ['./in-house-solutions.component.scss']
})
export class InHouseSolutionsComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/in-house-solutions');
         this.titleService.setTitle('in-house-solutions - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: "Explore flexible in-house training solutions tailored to your organization's needs. Oil and Gas Club offers customized courses that can be delivered on-site, saving you time and travel costs, with global availability" },
      { name: 'keywords', content: 'in-house training, oil and gas courses, corporate training, customized training solutions, on-site courses, oil and gas industry training, flexible learning, professional certifications, tailored courses' },
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
