import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnInit, Renderer2, ChangeDetectionStrategy, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';

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

  // Modal and form state
  showModal = false;
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  formData = {
    name: '',
    email: '',
    course: '',
    phone: '',
    linkedin: '',
    experience: ''
  };
  
  // Tracking data
  userSource = '';
  userCountry = '';

  // Google Apps Script URL
  // Deployment ID: AKfycbyVf0Px-oUZlB-GGQCVbdOwk3h9VTc_RxshKrKepW6jEv_lmfaKpgCaw-O6C2yCXKwu
  // Web App URL: https://script.google.com/macros/s/AKfycbyVf0Px-oUZlB-GGQCVbdOwk3h9VTc_RxshKrKepW6jEv_lmfaKpgCaw-O6C2yCXKwu/exec
  // NOTE: Form input names MUST match sheet headers EXACTLY (including spaces/case).
  // We keep internal field keys simple (name/email/course/phone/linkedin) and map them on submit.
  private readonly GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyVf0Px-oUZlB-GGQCVbdOwk3h9VTc_RxshKrKepW6jEv_lmfaKpgCaw-O6C2yCXKwu/exec';

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
      author: 'Priya Iyer · Lead Process Engineer',
      image: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/Priya_iyar.PNG'
    },
    {
      quote: '“My recorded labs continue to earn revenue every month, and I still mentor alumni in the community.”',
      author: 'Carlos Mendes · API Inspector',
      image: 'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/carol.PNG'
    }
  ];

  readonly trainerFaqs = [
    {
      question: 'How long does it take to get onboarded as a Trainer on OilAndGasClub?',
      answer: 'The onboarding process is simple and fast. You need to submit your trainer profile, course or event proposal, and (if required) a demo session or sample content. On average, trainers are approved within 5–7 working days.'
    },
    {
      question: 'What type of courses and trainings can I offer on OilAndGasClub?',
      answer: 'You can offer: Self-learning courses (recorded), Live trainer-hosted events / workshops, One-to-one personalized training. Topics include: Oil & Gas Engineering, Piping, Process, Mechanical, Electrical, Instrumentation, NDT, QA/QC, HSE, Design Software (PDMS, E3D, SP3D, CAESAR II, etc.), Industry standards, codes, and interview preparation.'
    },
    {
      question: 'How much can a Trainer earn on OilAndGasClub?',
      answer: 'Earnings depend on: Course pricing, Number of enrollments, Live event participation, One-to-one session bookings. Trainers typically earn ₹20,000 to ₹1,00,000+ per month, based on activity and content quality.'
    },
    {
      question: 'Can I host training at my own schedule?',
      answer: 'Yes. OilAndGasClub is fully flexible. You decide when to host live events, You control 1-to-1 availability, Self-learning courses generate income 24/7.'
    },
    {
      question: 'What are the basic requirements to conduct training?',
      answer: 'You need: Laptop or desktop (minimum 8 GB RAM recommended), Stable internet connection (minimum 4 Mbps), Microphone / headset, Camera (optional but recommended for live sessions). For recorded courses, screen recording software is sufficient.'
    },
    {
      question: 'Do I need prior teaching experience?',
      answer: 'Teaching experience is helpful but not mandatory. Strong industry knowledge and practical exposure in Oil & Gas is the key requirement.'
    },
    {
      question: 'Will OilAndGasClub provide any training or support to trainers?',
      answer: 'Yes. We provide: Trainer onboarding guidance, Course structuring support, Platform usage training, Marketing and visibility support for approved courses and events.'
    },
    {
      question: 'Will I get technical support during live events or sessions?',
      answer: 'Absolutely. Our Trainer Support & Tech Team assists with: Live session setup, Streaming issues, LMS and dashboard support.'
    },
    {
      question: 'How and when are payouts processed?',
      answer: 'How are payouts structured? You receive a baseline for every confirmed learner plus performance bonuses on course ratings, completion. Detailed earning reports are available in your dashboard.'
    },
    {
      question: 'Can I set my own course or session pricing?',
      answer: 'Yes. You have full control to: Set course prices, Price live events, Fix hourly rates for 1-to-1 training. You can update pricing anytime.'
    },
    {
      question: 'Is there any registration or listing fee to become a Trainer?',
      answer: 'No. There is no registration fee to join OilAndGasClub as a Trainer.'
    },
    {
      question: 'Do I need to sign a contract or bond?',
      answer: 'No long-term contracts or bonds. You are free to create, host, pause, or stop training anytime.'
    },
    {
      question: 'What are my responsibilities as a Trainer?',
      answer: 'As a trainer, you are expected to: Deliver accurate, industry-relevant content, Maintain professional quality standards, Engage learners and answer queries, Update content when required.'
    },
    {
      question: 'Can I use my existing training materials?',
      answer: 'Yes. You can upload: Your own presentations, Recorded videos, Practice problems and assessments. Our LMS supports structured content delivery.'
    },
    {
      question: 'How can I manage learners and content?',
      answer: 'OilAndGasClub provides an LMS dashboard where you can: Upload and manage courses, Track learner progress, Share assignments and resources, Communicate with learners.'
    },
    {
      question: 'Who are the learners on OilAndGasClub?',
      answer: 'Our learners include: Students and fresh graduates, Working professionals, Engineers preparing for interviews, Professionals upskilling for global projects. They come from India, the Middle East, and other Oil & Gas hubs.'
    },
    {
      question: 'Can I keep my current job?',
      answer: 'Yes. Most instructors teach 2–8 hours per week alongside their primary roles. We offer flexible scheduling across time zones.'
    }
  ];

  // Why Teach With Us carousel data
  readonly whyTeachCards = [
    [
      {
        icon: 'globe',
        title: 'Global Oil & Gas Learning Platform',
        description: 'Leverage a niche, industry-focused platform trusted by Oil & Gas professionals worldwide. Publish self-learning courses that reach engineers, graduates, and working professionals across global energy markets.'
      },
      {
        icon: 'book',
        title: 'Self-Learning, Scalable Teaching Model',
        description: 'Create once and teach at scale. Our self-learning model allows you to deliver structured, high-impact courses without live session constraints—perfect for busy industry professionals.'
      },
      {
        icon: 'money',
        title: 'Competitive Revenue & Incentives',
        description: 'Earn through course enrollments with transparent, performance-based payouts. High-quality courses get higher visibility, better reach, and increased earning potential.'
      }
    ],
    [
      {
        icon: 'support',
        title: 'Flexible Instructor Control',
        description: 'You decide the course format, pricing, and updates. Whether it\'s beginner, advanced, or certification-oriented content, you maintain full control over your course structure and delivery.'
      },
      {
        icon: 'network',
        title: 'Build Authority & Industry Credibility',
        description: 'Position yourself as a recognized Oil & Gas instructor. Teaching on OilAndGasClub strengthens your professional profile, improves visibility, and builds long-term industry credibility.'
      },
      {
        icon: 'experience',
        title: 'Seamless Teaching Experience',
        description: 'Our modern learning platform, secure payments, analytics dashboard, and dedicated technical support ensure a smooth experience—for both instructors and learners.'
      }
    ]
  ];

  currentCarouselSlide = 0;

  // The Process steps data
  readonly processSteps = [
    {
      number: '1',
      title: 'Apply as an Instructor',
      description: 'Submit your application by filling out a simple form on Oilandgasclub.'
    },
    {
      number: '2',
      title: 'Profile Screening',
      description: 'Our domain experts review and shortlist the most suitable profiles.'
    },
    {
      number: '3',
      title: 'Teaching Demo',
      description: 'Choose a topic from your expertise and deliver a teaching demo to our review panel.'
    },
    {
      number: '4',
      title: 'Instructor Onboarding',
      description: 'Once selected, complete documentation and profile setup, followed by an onboarding and induction webinar.'
    },
    {
      number: '5',
      title: 'Go Live on Oilandgasclub',
      description: 'After the webinar, you\'ll be listed as an instructor and can start delivering sessions or building self-learning courses.'
    }
  ];

  get processStepsLeft() {
    return this.processSteps.filter(step => step.number !== '5');
  }

  get processStepRight() {
    return this.processSteps.find(step => step.number === '5');
  }

  nextSlide(): void {
    this.currentCarouselSlide = (this.currentCarouselSlide + 1) % this.whyTeachCards.length;
    this.cdr.markForCheck();
  }

  prevSlide(): void {
    this.currentCarouselSlide = (this.currentCarouselSlide - 1 + this.whyTeachCards.length) % this.whyTeachCards.length;
    this.cdr.markForCheck();
  }

  goToSlide(index: number): void {
    this.currentCarouselSlide = index;
    this.cdr.markForCheck();
  }
  
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
  /**
   * Detect user source (referrer, UTM parameters, direct, etc.)
   */
  private detectUserSource(): void {
    if (!this.isBrowser) return;
    
    try {
      const urlParams = new URLSearchParams(this.document.defaultView?.location.search || '');
      const referrer = this.document.referrer || '';
      
      // Check UTM parameters first
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
      
      if (utmSource) {
        this.userSource = `UTM: ${utmSource}${utmMedium ? ` / ${utmMedium}` : ''}${utmCampaign ? ` / ${utmCampaign}` : ''}`;
        return;
      }
      
      // Check referrer
      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);
          const referrerHost = referrerUrl.hostname;
          
          // Check if it's from same domain
          const currentHost = this.document.defaultView?.location.hostname || '';
          if (referrerHost === currentHost) {
            this.userSource = 'Internal Navigation';
            return;
          }
          
          // Check common sources
          if (referrerHost.includes('google.com')) {
            this.userSource = 'Google Search';
          } else if (referrerHost.includes('bing.com')) {
            this.userSource = 'Bing Search';
          } else if (referrerHost.includes('facebook.com')) {
            this.userSource = 'Facebook';
          } else if (referrerHost.includes('linkedin.com')) {
            this.userSource = 'LinkedIn';
          } else if (referrerHost.includes('twitter.com') || referrerHost.includes('x.com')) {
            this.userSource = 'Twitter/X';
          } else if (referrerHost.includes('youtube.com')) {
            this.userSource = 'YouTube';
          } else {
            this.userSource = `Referrer: ${referrerHost}`;
          }
        } catch (e) {
          this.userSource = 'Referrer: Unknown';
        }
      } else {
        // No referrer means direct visit
        this.userSource = 'Direct';
      }
    } catch (error) {
      console.error('Error detecting user source:', error);
      this.userSource = 'Unknown';
    }
  }

  /**
   * Detect user source synchronously (for form submission)
   */
  private detectUserSourceSync(): string {
    if (!this.isBrowser) return 'Unknown';
    
    try {
      const urlParams = new URLSearchParams(this.document.defaultView?.location.search || '');
      const referrer = this.document.referrer || '';
      
      // Check UTM parameters
      const utmSource = urlParams.get('utm_source');
      const utmMedium = urlParams.get('utm_medium');
      const utmCampaign = urlParams.get('utm_campaign');
      
      if (utmSource) {
        return `UTM: ${utmSource}${utmMedium ? ` / ${utmMedium}` : ''}${utmCampaign ? ` / ${utmCampaign}` : ''}`;
      }
      
      // Check referrer
      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);
          const referrerHost = referrerUrl.hostname;
          const currentHost = this.document.defaultView?.location.hostname || '';
          
          if (referrerHost === currentHost) {
            return 'Internal Navigation';
          }
          
          if (referrerHost.includes('google.com')) return 'Google Search';
          if (referrerHost.includes('bing.com')) return 'Bing Search';
          if (referrerHost.includes('facebook.com')) return 'Facebook';
          if (referrerHost.includes('linkedin.com')) return 'LinkedIn';
          if (referrerHost.includes('twitter.com') || referrerHost.includes('x.com')) return 'Twitter/X';
          if (referrerHost.includes('youtube.com')) return 'YouTube';
          
          return `Referrer: ${referrerHost}`;
        } catch (e) {
          return 'Referrer: Unknown';
        }
      }
      
      return 'Direct';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Detect user country using IP geolocation API
   */
  private detectUserCountry(): void {
    if (!this.isBrowser) return;
    
    // Try multiple free IP geolocation APIs
    // Using ipapi.co (free tier: 1000 requests/day)
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        if (data.country_name) {
          this.userCountry = data.country_name;
          this.cdr.markForCheck();
        } else if (data.country_code) {
          this.userCountry = data.country_code;
          this.cdr.markForCheck();
        }
      })
      .catch(() => {
        // Fallback to ip-api.com (free tier: 45 requests/minute)
        fetch('http://ip-api.com/json/?fields=country,countryCode')
          .then(response => response.json())
          .then(data => {
            if (data.country) {
              this.userCountry = data.country;
              this.cdr.markForCheck();
            } else if (data.countryCode) {
              this.userCountry = data.countryCode;
              this.cdr.markForCheck();
            }
          })
          .catch(() => {
            // Final fallback: try to get from browser language/timezone
            this.userCountry = this.detectCountryFromBrowser();
            this.cdr.markForCheck();
          });
      });
  }

  /**
   * Fallback: Detect country from browser settings
   */
  private detectCountryFromBrowser(): string {
    if (!this.isBrowser) return 'Unknown';
    
    try {
      // Try to get from timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) {
        return timezone;
      }
      
      // Try to get from locale
      const locale = this.document.defaultView?.navigator.language || '';
      if (locale.includes('-')) {
        const countryCode = locale.split('-')[1];
        return countryCode;
      }
      
      return 'Unknown';
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Setup reusable popup modal for buttons with .open-popup class
   * Uses event delegation to handle clicks on any .open-popup element
   */
  private setupPopupModal(): void {
    if (!this.isBrowser) return;

    // Use event delegation to handle clicks on any .open-popup element
    this.document.addEventListener('click', (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if clicked element or its parent has .open-popup class
      const popupButton = target.closest('.open-popup');
      
      if (popupButton) {
        event.preventDefault();
        event.stopPropagation();
        this.openModal(event);
      }
    });
  }

  ngOnInit(): void {
    // Prevent image save/context menu and Pinterest buttons
    if (this.isBrowser) {
      this.preventImageContextMenu();
      this.blockPinterestButtons();
      // Track user source and country
      this.detectUserSource();
      this.detectUserCountry();
      // Setup reusable popup modal for .open-popup buttons
      this.setupPopupModal();
    }
    
    // ✅ SEO: Set canonical URL
    this.setCanonicalURL('https://oilandgasclub.com/become-our-trainer');
    
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
      { property: 'og:image', content: 'https://oilandgasclub.com/assets/instructor-banner.jpg' },
      { property: 'og:image:width', content: '600' },
      { property: 'og:image:height', content: '500' },
      { property: 'og:url', content: 'https://oilandgasclub.com/become-our-trainer' },
      
      // ✅ Article Meta Tags
      { property: 'article:published_time', content: '2021-09-01T06:18:55.5419129' },
      { property: 'article:modified_time', content: '2023-07-08T06:43:07.881401' },
      { property: 'article:tag', content: 'Instructor, Teach Online, Oil and Gas Training, Oilandgasclub, Online Courses, Professional Development, Certification Programs' },
      { property: 'article:publisher', content: 'https://oilandgasclub.com' },
      
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
      { name: 'twitter:url', content: 'https://oilandgasclub.com/become-our-trainer' },
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

  // Prevent image context menu (right-click save) and browser download buttons
  private preventImageContextMenu(): void {
    if (!this.isBrowser) return;
    
    const image = this.document.querySelector('.trainer-cta__image') as HTMLImageElement;
    const illustration = this.document.querySelector('.trainer-cta__illustration') as HTMLElement;
    
    if (image) {
      // Prevent right-click context menu
      image.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false });
      
      // Prevent drag and drop
      image.addEventListener('dragstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false });
      
      // Prevent browser download button on hover
      image.addEventListener('mouseenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, { passive: false });
      
      // Remove any browser-added download buttons and Pinterest buttons
      setTimeout(() => {
        const downloadButtons = this.document.querySelectorAll('a[download], button[download], [aria-label*="download" i], [aria-label*="save" i]');
        downloadButtons.forEach(btn => {
          if (illustration && illustration.contains(btn)) {
            (btn as HTMLElement).style.display = 'none';
            (btn as HTMLElement).remove();
          }
        });
        
        // Remove Pinterest save buttons
        const pinterestButtons = this.document.querySelectorAll(
          '[data-pin-href], [data-pin-id], [data-pin-url], ' +
          '[class*="pinterest" i], [class*="pin-save" i], [class*="PinButton" i], ' +
          '[id*="pinterest" i], [id*="pin" i], ' +
          'a[href*="pinterest.com"], iframe[src*="pinterest"]'
        );
        pinterestButtons.forEach(btn => {
          if (illustration && illustration.contains(btn)) {
            (btn as HTMLElement).style.display = 'none';
            (btn as HTMLElement).style.visibility = 'hidden';
            (btn as HTMLElement).style.opacity = '0';
            (btn as HTMLElement).style.pointerEvents = 'none';
            (btn as HTMLElement).remove();
          }
        });
      }, 100);
    }
    
    // Prevent browser UI on the illustration container
    if (illustration) {
      illustration.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }, { passive: false });
      
      // Continuously check and remove browser download buttons and Pinterest buttons
      const observer = new MutationObserver(() => {
        // Remove download buttons
        const downloadButtons = illustration.querySelectorAll(
          'a[download], button[download], ' +
          '[aria-label*="download" i], [aria-label*="save" i], ' +
          '[title*="download" i], [title*="save" i]'
        );
        downloadButtons.forEach(btn => {
          (btn as HTMLElement).style.display = 'none';
          (btn as HTMLElement).style.visibility = 'hidden';
          (btn as HTMLElement).style.opacity = '0';
          (btn as HTMLElement).style.pointerEvents = 'none';
          (btn as HTMLElement).remove();
        });
        
        // Remove Pinterest save buttons
        const pinterestButtons = illustration.querySelectorAll(
          '[data-pin-href], [data-pin-id], [data-pin-url], [data-pin-media], ' +
          '[class*="pinterest" i], [class*="pin-save" i], [class*="PinButton" i], ' +
          '[id*="pinterest" i], [id*="pin" i], ' +
          'a[href*="pinterest.com"], iframe[src*="pinterest"], ' +
          '[data-pin-log="button_pinit"], [data-pin-log="button_pinterest"]'
        );
        pinterestButtons.forEach(btn => {
          (btn as HTMLElement).style.display = 'none';
          (btn as HTMLElement).style.visibility = 'hidden';
          (btn as HTMLElement).style.opacity = '0';
          (btn as HTMLElement).style.pointerEvents = 'none';
          (btn as HTMLElement).remove();
        });
      });
      
      observer.observe(illustration, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-label', 'title', 'download', 'data-pin-href', 'data-pin-id', 'class', 'id']
      });
    }
  }

  // Specifically block Pinterest save buttons
  private blockPinterestButtons(): void {
    if (!this.isBrowser) return;
    
    const illustration = this.document.querySelector('.trainer-cta__illustration') as HTMLElement;
    const image = this.document.querySelector('.trainer-cta__image') as HTMLImageElement;
    
    if (!illustration || !image) return;
    
    // Function to remove Pinterest buttons
    const removePinterestButtons = () => {
      const selectors = [
        '[data-pin-href]',
        '[data-pin-id]',
        '[data-pin-url]',
        '[data-pin-media]',
        '[class*="pinterest" i]',
        '[class*="pin-save" i]',
        '[class*="PinButton" i]',
        '[id*="pinterest" i]',
        '[id*="pin" i]',
        'a[href*="pinterest.com"]',
        'iframe[src*="pinterest"]',
        '[data-pin-log]'
      ];
      
      selectors.forEach(selector => {
        try {
          const elements = illustration.querySelectorAll(selector);
          elements.forEach(el => {
            const htmlEl = el as HTMLElement;
            htmlEl.style.display = 'none';
            htmlEl.style.visibility = 'hidden';
            htmlEl.style.opacity = '0';
            htmlEl.style.pointerEvents = 'none';
            htmlEl.remove();
          });
        } catch (e) {
          // Ignore selector errors
        }
      });
    };
    
    // Remove immediately
    removePinterestButtons();
    
    // Remove on hover (when Pinterest extension might add button)
    illustration.addEventListener('mouseenter', removePinterestButtons, { passive: true });
    image.addEventListener('mouseenter', removePinterestButtons, { passive: true });
    
    // Remove periodically
    const interval = setInterval(removePinterestButtons, 200);
    
    // Clean up interval when component is destroyed (optional)
    setTimeout(() => clearInterval(interval), 60000); // Clear after 1 minute
    
    // Also prevent Pinterest from detecting the image
    if (image) {
      image.setAttribute('data-pin-nopin', 'true');
      image.setAttribute('data-pin-no-hover', 'true');
    }
  }

  /** Elearn trainer signup page URL (auth/register-trainer). Used for "Sign Up as Instructor" link. */
  getTrainerSignupUrl(): string {
    const elearnBase = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
    if (elearnBase.startsWith('http://') || elearnBase.startsWith('https://')) {
      return `${elearnBase}/register-trainer`;
    }
    return '/register-trainer';
  }

  /** Navigate to elearn trainer signup page so user can register as a trainer. */
  navigateToTrainerSignup(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!this.isBrowser) return;
    window.location.href = this.getTrainerSignupUrl();
  }

  // Modal methods - Reusable popup modal
  openModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    this.showModal = true;
    this.submitMessage = '';
    this.submitSuccess = false;
    
    // Prevent body scroll when modal is open - ensure no page scroll
    if (this.isBrowser) {
      // Store current scroll position
      const scrollY = window.scrollY;
      this.document.body.style.position = 'fixed';
      this.document.body.style.top = `-${scrollY}px`;
      this.document.body.style.width = '100%';
      this.document.body.style.overflow = 'hidden';
      this.document.body.classList.add('modal-open');
      
      // Add smooth animation trigger
      setTimeout(() => {
        const overlay = this.document.querySelector('.modal-overlay');
        if (overlay) {
          overlay.classList.add('show');
        }
      }, 10);
    }
    
    this.cdr.markForCheck();
  }

  closeModal(): void {
    // Remove show class for smooth exit animation
    if (this.isBrowser) {
      const overlay = this.document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.classList.remove('show');
      }
    }
    
    // Wait for animation to complete before hiding
    setTimeout(() => {
      this.showModal = false;
      
      // Restore body scroll and scroll position
      if (this.isBrowser) {
        const scrollY = this.document.body.style.top;
        this.document.body.style.position = '';
        this.document.body.style.top = '';
        this.document.body.style.width = '';
        this.document.body.style.overflow = '';
        this.document.body.classList.remove('modal-open');
        
        // Restore scroll position
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      }
      
      // Reset form after modal closes
      this.formData = {
        name: '',
        email: '',
        course: '',
        phone: '',
        linkedin: '',
        experience: ''
      };
      this.submitMessage = '';
      this.submitSuccess = false;
      this.cdr.markForCheck();
    }, 300); // Match animation duration
  }

  // Form submission - Using hidden iframe method for Google Apps Script
  onSubmitForm(): void {
    if (this.isSubmitting) return;

    // Force change detection to ensure formData is up to date
    this.cdr.detectChanges();

    // Get name value directly from DOM as fallback to ensure we have the latest value
    let nameValue = this.formData.name;
    if (this.isBrowser) {
      const nameInputElement = this.document.querySelector('input[name="name"]') as HTMLInputElement;
      if (nameInputElement && nameInputElement.value) {
        nameValue = nameInputElement.value;
        // Update formData to ensure consistency
        this.formData.name = nameValue;
      }
    }

    // Validate required fields before submission
    if (!nameValue || !nameValue.trim()) {
      this.submitMessage = 'Please enter your name.';
      this.submitSuccess = false;
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.cdr.markForCheck();

    if (!this.isBrowser) {
      this.isSubmitting = false;
      this.submitMessage = 'Form submission is only available in the browser.';
      this.cdr.markForCheck();
      return;
    }

    // Create a hidden form and submit via iframe (works better with Google Apps Script)
    const form = this.document.createElement('form');
    form.method = 'POST';
    form.action = this.GOOGLE_SCRIPT_URL;
    form.target = 'hidden_iframe_' + Date.now(); // Unique target name
    form.style.display = 'none';
    form.setAttribute('accept-charset', 'UTF-8');
    form.setAttribute('enctype', 'application/x-www-form-urlencoded'); // Ensure proper encoding

    // Get latest values from formData (ensure they're up to date)
    // Use the nameValue we already validated above, or fallback to formData
    // CRITICAL: Ensure Name value is not empty
    const finalNameValue = (nameValue || this.formData.name || '').trim();
    
    // Double-check Name is not empty before proceeding
    if (!finalNameValue) {
      console.error('[CRITICAL ERROR] Name value is empty after all checks!', {
        nameValue: nameValue,
        formDataName: this.formData.name,
        finalNameValue: finalNameValue
      });
      this.isSubmitting = false;
      this.submitSuccess = false;
      this.submitMessage = 'Name field is required. Please fill in your name.';
      this.cdr.markForCheck();
      return;
    }
    
    const emailValue = (this.formData.email || '').trim();
    const courseValue = (this.formData.course || '').trim();
    const experienceValue = (this.formData.experience || '').trim();
    const phoneValue = (this.formData.phone || '').trim();
    const linkedinValue = (this.formData.linkedin || '').trim();
    
    // Get source and country (detect if not already set)
    const sourceValue = this.userSource || this.detectUserSourceSync();
    const countryValue = this.userCountry || 'Unknown';

    // Add form fields - ensure values are properly encoded
    // Field names must match Google Sheet headers EXACTLY:
    // "Name", "Email", "Select Course", "Year of Experience", "Phone Number", "Linkedin URL", "Source", "Country"
    // Note: Script checks for lowercase 'source' and 'country' (p.source, p.country)
    // The script will save these values to capitalized column headers 'Source' and 'Country'
    const fields = [
      { name: 'Name', value: finalNameValue },
      { name: 'Email', value: emailValue },
      { name: 'Select Course', value: courseValue },
      { name: 'Year of Experience', value: experienceValue },
      { name: 'Phone Number', value: phoneValue },
      { name: 'Linkedin URL', value: linkedinValue },
      { name: 'source', value: sourceValue }, // Script checks p.source
      { name: 'country', value: countryValue } // Script checks p.country
    ];

    // Debug: Log form data before submission
    console.log('Form data being submitted:', {
      formData: this.formData,
      fields: fields
    });

    // Add fields in specific order - ensure Name is added correctly
    // IMPORTANT: Add Name field FIRST, then other fields
    fields.forEach((field, index) => {
      const input = this.document.createElement('input');
      input.type = 'hidden';
      input.name = field.name;
      input.value = field.value || '';
      
      // Ensure Name field is added first and has a value
      if (field.name === 'Name' || field.name === 'name') {
        if (!field.value || !field.value.trim()) {
          console.error('[ERROR] Name field is empty!', {
            formDataName: this.formData.name,
            nameValue: nameValue,
            finalNameValue: finalNameValue,
            fieldValue: field.value,
            fieldName: field.name
          });
          // Don't return here - continue to add other fields, but log the error
        }
        // Insert Name field at the beginning (before any existing children)
        if (form.firstChild) {
          form.insertBefore(input, form.firstChild);
        } else {
          form.appendChild(input);
        }
        console.log(`[SUBMIT] Name field added FIRST: name="${field.name}", value="${field.value}"`);
      } else {
        form.appendChild(input);
      }
      
      // Debug: Log each field being added
      console.log(`[SUBMIT] Field ${index + 1}: name="${field.name}", value="${field.value}"`);
    });

    // Verify Name field exists in form before submission
    const nameInput = form.querySelector('input[name="Name"]') as HTMLInputElement;
    if (!nameInput) {
      console.error('[ERROR] Name input element not found in form!');
      this.isSubmitting = false;
      this.submitSuccess = false;
      this.submitMessage = 'Name field is missing. Please try again.';
      this.document.body.removeChild(form);
      this.cdr.markForCheck();
      return;
    }
    
    if (!nameInput.value || !nameInput.value.trim()) {
      console.error('[ERROR] Name field value is empty!', {
        nameInputValue: nameInput.value,
        nameInputName: nameInput.name,
        formDataName: this.formData.name
      });
      this.isSubmitting = false;
      this.submitSuccess = false;
      this.submitMessage = 'Name field is required. Please fill in your name.';
      this.document.body.removeChild(form);
      this.cdr.markForCheck();
      return;
    }
    
    console.log('[SUBMIT] Name field verified:', {
      name: nameInput.name,
      value: nameInput.value,
      formHTML: form.innerHTML.substring(0, 500) // First 500 chars for debugging
    });

    // Final verification: Log all form data before submission
    console.log('[FINAL CHECK] About to submit form with these fields:');
    const allInputs = form.querySelectorAll('input[type="hidden"]');
    allInputs.forEach((input: HTMLInputElement) => {
      console.log(`  - Field "${input.name}": "${input.value}"`);
    });
    console.log('[FINAL CHECK] Form action:', form.action);
    console.log('[FINAL CHECK] Form method:', form.method);
    console.log('[FINAL CHECK] Form enctype:', form.enctype);

    // Create unique hidden iframe for this submission
    const iframeId = 'hidden_iframe_' + Date.now();
    const iframe = this.document.createElement('iframe');
    iframe.id = iframeId;
    iframe.name = form.target;
    iframe.style.display = 'none';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    // Add form and iframe to body
    this.document.body.appendChild(form);
    this.document.body.appendChild(iframe);
    
    let formSubmitted = false;
    let timeoutCleared = false;

    // Set timeout to handle response (fallback)
    const timeout = setTimeout(() => {
      if (!formSubmitted) {
        timeoutCleared = true;
        this.handleFormSuccess(form, iframe);
      }
    }, 3000);

    // Handle iframe load (success)
    iframe.onload = () => {
      if (!timeoutCleared) {
        clearTimeout(timeout);
        timeoutCleared = true;
      }
      formSubmitted = true;
      // Small delay to ensure data is processed
      setTimeout(() => {
        this.handleFormSuccess(form, iframe);
      }, 500);
    };

    // Handle errors
    iframe.onerror = () => {
      if (!timeoutCleared) {
        clearTimeout(timeout);
        timeoutCleared = true;
      }
      this.handleFormError(form, iframe);
    };

    // Submit form
    try {
      // Show success message immediately after submit click (don't wait for iframe load/timeout)
      // The request still completes in the hidden iframe; handleFormSuccess will clean up later.
      this.submitSuccess = true;
      this.submitMessage = 'Thank you for your interest in becoming an instructor. If your profile is shortlisted, our team will contact you within 5–7 working days';
      this.isSubmitting = false;
      this.cdr.markForCheck();

      form.submit();
    } catch (error) {
      console.error('Form submission error:', error);
      if (!timeoutCleared) {
        clearTimeout(timeout);
      }
      this.handleFormError(form, iframe);
    }
  }

  private handleFormSuccess(form: HTMLFormElement, iframe: HTMLIFrameElement): void {
    this.isSubmitting = false;
    this.submitSuccess = true;
    this.submitMessage = 'Thank you for your interest in becoming an instructor. If your profile is shortlisted, our team will contact you within 5–7 working days';
    
    // Reset form
    this.formData = {
      name: '',
      email: '',
      course: '',
      phone: '',
      linkedin: '',
      experience: ''
    };
    
    // Clean up
    try {
      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    
    this.cdr.markForCheck();
    
    // Close modal after 3 seconds
    setTimeout(() => {
      this.closeModal();
    }, 3000);
  }

  private handleFormError(form: HTMLFormElement, iframe: HTMLIFrameElement): void {
    this.isSubmitting = false;
    this.submitSuccess = false;
    this.submitMessage = 'There was an error submitting your application. Please try again or contact us directly at anush@oilandgasclub.com';
    
    // Clean up
    try {
      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    } catch (e) {
      console.error('Cleanup error:', e);
    }
    
    this.cdr.markForCheck();
  }
}
