

import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-worlds-largest-refineries',
  templateUrl: './worlds-largest-refineries.component.html',
  styleUrls: ['./worlds-largest-refineries.component.scss']
})
export class WorldsLargestRefineriesComponent implements OnInit {


  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/worlds-largest-refineries');
         this.titleService.setTitle('worlds-largest-refineries - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: "Explore the world's largest refineries, their impact on the oil and gas industry, technological advancements, and their crucial role in global energy production. Learn about the top refineries that shape the future of the sector" },
      { name: 'keywords', content: "world's largest refineries, oil and gas refineries, refinery technologies, global refineries, oil refining process, top refineries, energy production, oil industry advancements, refinery capacity, largest oil refineries, oil refining innovations, oil and gas industry impact, refinery operations" },
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
