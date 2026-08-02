// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-courses-offered',
//   templateUrl: './courses-offered.component.html',
//   styleUrls: ['./courses-offered.component.scss']
// })
// export class CoursesOfferedComponent implements OnInit {

//   constructor() { }

//   ngOnInit(): void {
//   }

// }




import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
 import { Meta, Title } from '@angular/platform-browser';
 @Component({
    selector: 'app-courses-offered',
    templateUrl: './courses-offered.component.html',
    styleUrls: ['./courses-offered.component.scss'],
    standalone: false
})
export class CoursesOfferedComponent implements OnInit {

  readonly heroHighlights = [
    { label: 'Courses', value: '70+' },
    { label: 'Industries', value: '12' },
    { label: 'Learners', value: '250K+' }
  ];

  readonly trainingTracks = [
    {
      title: 'Design & Engineering',
      items: ['Industrial Piping Design', 'Static Equipment', 'Heat Exchangers', 'Stress Analysis']
    },
    {
      title: 'Planning & Primavera',
      items: ['Primavera P6', 'Risk Analysis', 'Progress Dashboards', 'Field Coordination']
    },
    {
      title: 'Codes & Standards',
      items: ['ASME', 'API 510/570', 'RBI & FFS', 'Tank Design']
    },
    {
      title: 'Inspection & NDT',
      items: ['CSWIP', 'ASNT Level II/III', 'Coating & Painting', 'Corrosion Monitoring']
    },
    {
      title: 'MEP & Building Systems',
      items: ['HVAC', 'Plumbing', 'Fire Fighting', 'Electrical']
    },
    {
      title: 'Safety & Compliance',
      items: ['IOSH', 'NEBOSH', 'Process Safety', 'Digital Permits']
    }
  ];

  readonly deliveryOptions = [
    {
      title: 'Online self-paced',
      description: '24/7 access to recorded modules, simulator walkthroughs, quizzes, and downloadable templates.'
    },
    {
      title: 'Live cohort sessions',
      description: 'Virtual classrooms with breakout labs, instructor feedback, and capstone project reviews.'
    },
    {
      title: 'On-site intensives',
      description: 'Bootcamps tailored to your facility, equipment, and compliance goals.'
    }
  ];

  readonly spotlightCourses = [
    {
      title: 'Design of Industrial Piping Systems',
      tag: 'Specialization',
      description: 'Multi-week journey covering layout, hydraulics, stress, and constructability.',
      link: '/piping-design'
    },
    {
      title: 'PIPENET Suite (Transient + Spray)',
      tag: 'Simulation',
      description: 'Scenario-based labs with firefighting networks, relief loads, and emergency shutdowns.',
      link: '/pipenet'
    },
    {
      title: 'API 653 Storage Tank Inspection',
      tag: 'Inspection',
      description: 'Certification prep with field checklists, corrosion case studies, and reporting templates.',
      link: '/api-653'
    },
    {
      title: 'Process Safety Fundamentals',
      tag: 'Safety',
      description: 'HAZOP + LOPA workshops, digital permit demos, and incident response simulations.',
      link: '/process-safety'
    }
  ];

  readonly testimonials = [
    {
      quote: '“The hybrid track let our engineers balance project work and certification prep effortlessly.”',
      author: 'Learning Lead – EPC Major'
    },
    {
      quote: '“Labs and calculators were so practical that our team applied them the next day in the field.”',
      author: 'Maintenance Manager – Refinery'
    }
  ];

  readonly categories = [
    'Process & Simulation',
    'Mechanical & Piping',
    'Inspection & Integrity',
    'Planning & PMO',
    'MEP & Infrastructure',
    'Safety & Compliance'
  ];

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://oilandgasclub.com/courses-offered');
         this.titleService.setTitle('courses-offered - Oil and Gas Club');
     this.metaService.addTags([
      { name: 'description', content: 'Have questions about our courses or certifications? Contact Oilandgasclub today for support, inquiries, and partnership opportunities. We are here to help!' },
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