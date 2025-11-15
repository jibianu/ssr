import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, Renderer2, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
@Component({
    selector: 'app-become-our-trainer',
    templateUrl: './become-our-trainer.component.html',
    styleUrls: ['./become-our-trainer.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection for static page
})
export class BecomeOurTrainerComponent implements OnInit {
  
  dropdownTitle = 8;
  dropdownValue = 84000;
  submitted = false;
  dropdownValues = [
    {title: 2, value: 21000},
    {title: 4, value: 42000},
    {title: 8, value: 84000},
  ];

  readonly trainerChecklist = [
    'Design outcome-focused cohorts and micro-learning paths',
    'Get full instructional design + production support',
    'Earn reliable payouts for every learner you mentor'
  ];

  readonly trainerPerks = [
    {
      title: 'Dedicated producer pod',
      description: 'Storyboard writers, editors, and learner success partners help polish every cohort you launch.'
    },
    {
      title: 'Global distribution',
      description: 'Reach engineers across 30+ countries with built-in marketing, webinars, and partner newsletters.'
    },
    {
      title: 'Flexible formats',
      description: 'Teach live, async, or hybrid formats. Host AMAs, office hours, code reviews, or plant walk-throughs.'
    },
    {
      title: 'Lifetime royalties',
      description: 'Earn revenue on replays, on-demand packs, and enterprise licensing without additional work.'
    }
  ];

  readonly trainerDomains = [
    {
      title: 'Process & Simulation',
      items: ['HYSYS', 'HTRI', 'Aspen', 'Relief systems']
    },
    {
      title: 'Piping & Mechanical',
      items: ['PVElite', 'SP3D', 'Stress analysis', 'Layout']
    },
    {
      title: 'Inspection & QA',
      items: ['API 510/570/653', 'CSWIP', 'ASNT', 'Asset integrity']
    },
    {
      title: 'Controls & Electrical',
      items: ['PLC/DCS', 'SIS', 'Instrumentation', 'Functional safety']
    },
    {
      title: 'Operations & Safety',
      items: ['HAZOP', 'LOPA', 'Process safety', 'Digital twins']
    },
    {
      title: 'Software & Data',
      items: ['Python for engineers', 'AVEVA', 'AVEVA P&ID', 'Power BI']
    }
  ];

  readonly trainerSteps = [
    {
      step: '01',
      title: 'Share your expertise',
      detail: 'Submit your domain focus, teaching samples, or project portfolio so we understand your style.'
    },
    {
      step: '02',
      title: 'Co-design the experience',
      detail: 'Work with our curriculum squad to map outcomes, labs, assessments, and cohort cadence.'
    },
    {
      step: '03',
      title: 'Launch & iterate',
      detail: 'Deliver sessions, host feedback circles, and iterate with real-time learner analytics.'
    }
  ];

  readonly trainerTestimonials = [
    {
      quote: '“Oilandgasclub handled the heavy lifting—from marketing to learner success—so I focused purely on teaching.”',
      author: 'Priya Iyer · Lead Process Engineer'
    },
    {
      quote: '“My recorded labs continue to earn revenue every month, and I still mentor alumni in the community.”',
      author: 'Carlos Mendes · API Inspector'
    }
  ];

  readonly trainerFaqs = [
    {
      question: 'Do I need prior teaching experience?',
      answer: 'Not necessarily. We look for real-world experience, storytelling ability, and a willingness to co-create with our instructional designers.'
    },
    {
      question: 'How are payouts structured?',
      answer: 'You receive a baseline for every confirmed learner plus performance bonuses on course ratings, completion, and enterprise licenses.'
    },
    {
      question: 'Can I keep my current job?',
      answer: 'Yes. Most instructors teach 2–8 hours per week alongside their primary roles. We offer flexible scheduling across time zones.'
    }
  ];
  
  // ✅ SSR: Browser check for DOM operations
  private readonly isBrowser: boolean;
  constructor(
    private router: Router,
    private titleService: Title,
    private metaService: Meta,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef // ✅ PERFORMANCE: For manual change detection trigger with OnPush
  ) {
    // ✅ SSR: Browser check for DOM operations
    this.isBrowser = isPlatformBrowser(this.platformId);
  }
  ngOnInit(): void {
    // ✅ SEO: Set canonical URL
    this.setCanonicalURL('https://www.oilandgasclub.com/become-our-trainer');
    
    // ✅ SEO: Set page title
    this.titleService.setTitle('Become an Instructor | Teach Oil and Gas Courses Online - Oilandgasclub');
    
    // ✅ SEO: Set meta tags
    this.metaService.addTags([
      { name: 'description', content: 'Become a trainer with Oil and Gas Club and share your expertise in the oil and gas industry. Empower learners worldwide by delivering professional courses and certifications. Join our global team of industry leaders today!' },
      { name: 'keywords', content: 'become a trainer, oil and gas training, professional trainer opportunity industry experts, oil and gas industry training, teaching opportunities, professional certifications, career as a trainer, oil and gas courses, trainer application, global training team, share industry knowledge.' },
      { name: 'robots', content: 'index, follow' },
      
      // ✅ Open Graph Meta Tags
      { property: 'og:site_name', content: 'Oilandgasclub' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Become an Instructor | Teach Oil and Gas Courses - Oilandgasclub' },
      { property: 'og:description', content: 'Join Oilandgasclub as an instructor and empower learners in the oil and gas industry with your knowledge. Build and deliver online courses globally.' },
      { property: 'og:author', content: 'Oilandgasclub Team' },
      { property: 'og:image', content: 'https://www.oilandgasclub.com/assets/instructor-banner.jpg' },
      { property: 'og:image:width', content: '600' },
      { property: 'og:image:height', content: '500' },
      { property: 'og:url', content: 'https://www.oilandgasclub.com/become-instructor' },
      
      // ✅ Article Meta Tags
      { property: 'article:published_time', content: '2021-09-01T06:18:55.5419129' },
      { property: 'article:modified_time', content: '2023-07-08T06:43:07.881401' },
      { property: 'article:tag', content: 'Instructor, Teach Online, Oil and Gas Training, Oilandgasclub, Online Courses, Professional Development, Certification Programs' },
      { property: 'article:publisher', content: 'https://www.oilandgasclub.com' },
      
      // ✅ Twitter Meta Tags
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Become an Instructor | Oilandgasclub - Teach Oil and Gas Courses Online' },
      { name: 'twitter:description', content: 'Join Oilandgasclub as an instructor to share your expertise with global learners in the oil and gas industry. Build impactful courses today!' },
      { name: 'twitter:label1', content: 'Teach Oil & Gas Courses' },
      { name: 'twitter:data1', content: 'Empower professionals with your knowledge.' },
      { name: 'twitter:label2', content: 'Join Our Instructor Network' },
      { name: 'twitter:data2', content: 'Reach learners worldwide through Oilandgasclub.' },
      { name: 'twitter:site', content: '@oilandgasclub' },
      { name: 'twitter:creator', content: '@Oilandgasclub' },
      { name: 'twitter:url', content: 'https://www.oilandgasclub.com/become-instructor' },
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
  
  

  setDropdown(title: number, countTarget: number, event?: Event): void {
    // ✅ FIX: Prevent navigation when clicking dropdown items
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.dropdownTitle = title;
    if (this.dropdownValue < countTarget) {
      this.changeValuePositive(countTarget);
    } else {
      this.changeValueNagitive(countTarget);
    }
    
    // ✅ PERFORMANCE: Trigger change detection for OnPush
    this.cdr.markForCheck();
  }
  custommsg(): void {
    this.router.navigate(['home']);
  }

  changeValuePositive(countTarget: number): void {
    if (this.dropdownValue < countTarget) {
        this.dropdownValue += 500;
        setTimeout(() => {
          this.changeValuePositive(countTarget);
          // ✅ PERFORMANCE: Trigger change detection during animation
          this.cdr.markForCheck();
        }, 1);
      } else {
        this.dropdownValue = countTarget;
        this.cdr.markForCheck();
      }
  }
  changeValueNagitive(countTarget: number): void {
    if (this.dropdownValue > countTarget) {
      this.dropdownValue -= 500;
      setTimeout(() => {
        this.changeValueNagitive(countTarget);
        // ✅ PERFORMANCE: Trigger change detection during animation
        this.cdr.markForCheck();
      }, 1);
    } else {
      this.dropdownValue = countTarget;
      this.cdr.markForCheck();
    }
  }
  navigationHome = (): void => {
    if (this.submitted || false) {
      this.router.navigate(['home']);
    }
  }

  onFormSubmit(): void {
    this.submitted = true;
  }

  onIframeLoad(): void {
    if (this.submitted) {
      const confirmed = confirm('Thank you for completing this form!');
      if (confirmed) {
        this.router.navigate(['/']);
      }
    }
  }
}
