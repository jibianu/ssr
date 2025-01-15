
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-mission-and-vision',
  templateUrl: './mission-and-vision.component.html',
  styleUrls: ['./mission-and-vision.component.scss']
})
export class MissionAndVisionComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/mission-and-vision');
         this.titleService.setTitle('mission-and-vision - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Discover the mission and vision of Oil and Gas Club, a leading platform dedicated to empowering professionals in the oil and gas industry through self-learning courses, certifications, and career advancement opportunities.' },
      { name: 'keywords', content: 'oil and gas club mission, oil and gas industry vision, oil and gas self-learning, professional certifications, career advancement in oil and gas, oil and gas training, oil and gas platform, industry professionals, oil and gas empowerment, mission and vision, oil and gas education.' },
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
