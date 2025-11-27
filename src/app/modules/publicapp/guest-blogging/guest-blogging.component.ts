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
    styleUrls: ['./guest-blogging.component.scss'],
    standalone: false
})
export class GuestBloggingComponent implements OnInit {

  readonly heroChecklist = [
    'Showcase your expertise to 250K+ monthly readers',
    'Earn payouts for every published feature',
    'Collaborate with our editorial and design squad'
  ];

  readonly benefitCards = [
    {
      title: 'Global reach',
      description: 'We syndicate every article across newsletters, LinkedIn, and partner communities so your ideas travel farther.'
    },
    {
      title: 'Editorial polish',
      description: 'Our editors refine structure, visuals, and SEO so you can focus on insights, not formatting.'
    },
    {
      title: 'Author recognition',
      description: 'Every post credits you with bio, social links, and portfolio callouts to attract consulting or hiring opportunities.'
    },
    {
      title: 'Flexible formats',
      description: 'Submit walkthroughs, checklists, case studies, or videos—anything that helps peers level up faster.'
    }
  ];

  readonly processSteps = [
    {
      step: '01',
      title: 'Pitch your idea',
      detail: 'Send 2–3 bullet points outlining the problem, target audience, and key takeaways.'
    },
    {
      step: '02',
      title: 'Write with us',
      detail: 'Collaborate with our editors to structure the draft, add diagrams, and ensure clarity.'
    },
    {
      step: '03',
      title: 'Publish & get paid',
      detail: 'Once approved, your article goes live within 7 days and you receive payment plus promotion assets.'
    }
  ];

  readonly contributionIdeas = [
    'Field-tested guides on API, ASNT, CSWIP, HTRI, or digital oilfield workflows',
    'Stories about project pitfalls, safety learnings, or commissioning lessons',
    'Checklists, dashboards, calculation templates, or troubleshooting trees',
    'Career advice: interview prep, portfolio building, remote collaboration tips'
  ];

  readonly faqList = [
    {
      question: 'Who can contribute?',
      answer: 'Engineers, inspectors, designers, managers, data scientists, or students with practical experience in energy, petrochemical, pharma, or infrastructure projects.'
    },
    {
      question: 'Do you accept previously published work?',
      answer: 'We prefer original pieces but can consider refreshed versions if you have the rights and the content is significantly updated.'
    },
    {
      question: 'What is the compensation?',
      answer: 'Payments depend on depth, visuals, and originality. Typical range is $2–$20 USD per article, plus spotlight features.'
    }
  ];

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
