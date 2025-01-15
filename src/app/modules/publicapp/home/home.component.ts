// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-home',
//   templateUrl: './home.component.html',
//   styleUrls: ['./home.component.scss']
// })
// export class HomeComponent implements OnInit {

//   constructor() { }

//   ngOnInit(): void {
//   }

// }


import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent  implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com');
         this.titleService.setTitle('Oilandgasclub - Self-Learning Courses for Oil and Gas Industry Professionals');
     this.metaService.addTags([
      { name: 'description', content: 'Oilandgasclub.com – Empowering careers in the oil and gas industry with self-paced online courses 🚀 Advance your skills with expert-designed training programs, certification prep, and career-focused resources. Start learning today! 🌟' },
      { name: 'keywords', content: 'Corporate Training, Oil and Gas Training, API Courses, ASNT NDT, CSWIP Certification, HTRI Training, Industry Certifications, Online Learning, Self-Learning Programs, Digital Skills, Workforce Development, Professional Growth, API 570, API 653, API 650, ASNT Level III, CSWIP 3.1, NDT Training, Energy Sector Learning, Oil and Gas Professionals, Career Advancement, Exam Preparation course '},   
      { charset: 'UTF-8' }

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
