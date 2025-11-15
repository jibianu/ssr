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
    styleUrls: ['./corporate-training.component.scss'],
    standalone: false
})
export class CorporateTrainingComponent implements OnInit {

  readonly heroStats = [
    { label: 'Corporates', value: '30+' },
    { label: 'Courses', value: '40+' },
    { label: 'Countries', value: '7+' }
  ];

  readonly solutions = [
    {
      title: 'Process & Simulation Labs',
      description: 'HYSYS, HTRI, Aspen, OLGA, and flare system design with scenario-based assessments.'
    },
    {
      title: 'Mechanical & Piping Programs',
      description: 'PV Elite, Caesar II, API 650/653/579, rotating equipment reliability, RBI.'
    },
    {
      title: 'Inspection & Integrity',
      description: 'API 510/570, ASNT Level II/III, corrosion monitoring, fitness-for-service workshops.'
    },
    {
      title: 'Digital & Analytics',
      description: 'PI System, Power BI, Python for engineers, digital twin PoCs, cloud dashboards.'
    }
  ];

  readonly deliveryModes = [
    {
      mode: 'Cohort-based',
      detail: 'Live instructor sessions, collaborative labs, and capstones tailored for 15–30 learners.'
    },
    {
      mode: 'Hybrid On-demand',
      detail: 'Self-paced modules combined with weekly coaching clinics and project audits.'
    },
    {
      mode: 'On-site Intensives',
      detail: 'Bootcamps hosted at your facility with equipment walk-throughs and safety drills.'
    }
  ];

  readonly trainingSteps = [
    {
      step: '01',
      title: 'Discovery workshop',
      detail: 'We map skills, competency gaps, and KPI targets with your learning and ops leaders.'
    },
    {
      step: '02',
      title: 'Program blueprint',
      detail: 'Co-create curriculum, labs, and certification pathways aligned to your tool stack.'
    },
    {
      step: '03',
      title: 'Launch & optimize',
      detail: 'Deliver, measure outcomes, and iterate using dashboards + quarterly design reviews.'
    }
  ];

  readonly testimonials = [
    {
      quote: '“Oilandgasclub helped us reskill 120 process engineers across 4 sites in just 10 weeks.”',
      author: 'Learning Director – Global Operator'
    },
    {
      quote: '“Their hybrid format meant zero downtime for our rotating equipment team.”',
      author: 'Maintenance Leader – LNG Major'
    }
  ];

  readonly logos = [
    'assets/logos/company1.svg',
    'assets/logos/company2.svg',
    'assets/logos/company3.svg',
    'assets/logos/company4.svg'
  ];

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



