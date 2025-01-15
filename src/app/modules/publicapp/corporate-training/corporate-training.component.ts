//  import { Component, OnInit } from '@angular/core';

//  @Component({
//    selector: 'app-corporate-training',
//   templateUrl: './corporate-training.component.html',
//   styleUrls: ['./corporate-training.component.scss']
// })
//  export class CorporateTrainingComponent implements OnInit {

//   constructor() { }

//    ngOnInit(): void {
//    }

//  }




// import { Component, OnInit } from '@angular/core';
// import { Meta, Title } from '@angular/platform-browser';

// @Component({
//   selector: 'app-corporate-training',
//   templateUrl: './corporate-training.component.html',
//   styleUrls: ['./corporate-training.component.scss']
// })
// export class CorporateTrainingComponent implements OnInit {
//   constructor(private metaService: Meta, private titleService: Title) {}

//   setCanonicalURL() {
//     const link: HTMLLinkElement = document.createElement('link');
//     link.setAttribute('rel', 'canonical');
//     link.setAttribute('href', 'https://www.oilandgasclub.com/corporate-training');
//     document.head.appendChild(link);
//   }

//   ngOnInit() {
//     this.titleService.setTitle('Corporate Training - Oil and Gas Club');
//     this.metaService.addTags([
//       { name: 'description', content: 'Corporate training programs tailored for professionals in the oil and gas industry.' },
//       { name: 'keywords', content: 'Corporate training, oil and gas, professional development' },
//     ]);
//     this.setCanonicalURL();
//   }
// }

import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
@Component({
  selector: 'app-corporate-training',
  templateUrl: './corporate-training.component.html',
  styleUrls: ['./corporate-training.component.scss']
})
export class CorporateTrainingComponent implements OnInit {

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/corporate-training');
         this.titleService.setTitle('Corporate Training - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Corporate training programs tailored for professionals in the oil and gas industry.' },
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



