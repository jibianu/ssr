import { DOCUMENT } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { AfterViewInit, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { NgForm } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { StructuredDataService } from '../../../shared/service/structured-data.service';
import { environment } from '../../../../environments/environment';

interface CorpIconCard {
  title: string;
  description?: string;
  icon: string;
}

interface CorpFeature extends CorpIconCard {
  description: string;
}

interface CorpFaq {
  question: string;
  answer: string;
}

interface CorpLearningPanel {
  title: string;
  description: string;
  icon: 'portal' | 'tracking' | 'webinar' | 'knowledge';
}

interface CorpPlatformCapability {
  title: string;
  descriptionHtml: string;
  icon:
    | 'deploy'
    | 'author'
    | 'brand'
    | 'automate'
    | 'access'
    | 'analytics'
    | 'library'
    | 'enterprise'
    | 'social';
}

@Component({
  selector: 'app-corporate-training',
  templateUrl: './corporate-training.component.html',
  styleUrls: ['./corporate-training.component.scss'],
  standalone: false
})
export class CorporateTrainingComponent implements OnInit, AfterViewInit, OnDestroy {
  private industriesRevealObserver?: IntersectionObserver;
  showModal = false;
  isSubmitting = false;
  submitMessage = '';
  submitSuccess = false;
  showThankYouInModal = false;
  thankYouMessage = 'Thank you for your interest! Our team will contact you within 48 hours to schedule your demo.';

  formData = {
    firstName: '',
    lastName: '',
    workEmail: '',
    whatsappNumber: '',
    company: ''
  };

  private lastSubmitFingerprint = '';
  private lastSubmitAtMs = 0;

  readonly GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbwuHfSYlGmhVQMjBsfWOnNO9o0lOya608WJich55T-RsnZ_lGpM22uzSMDSnsTfrwL5ug/exec';

  readonly brandName = 'Oilandgasclub';

  readonly contactUrl = '/contact-us';
  readonly teamImageSrc = 'assets/img/corporate-training-team.png?v=2';
  readonly heroDashboardSrc = 'assets/img/corporate-training-dashboard.png?v=2';
  readonly explorePlatformUrl = '/list';
  readonly demoCtaImageSrc = 'assets/img/corporate-training-cta-team.png';

  readonly heroCopy = {
    eyebrow: 'Enterprise LMS Platform',
    title: 'Upskill Your Oil & Gas Workforce With Smart Learning',
    lead:
      'Empower your workforce with private learning access, webinar management, progress tracking, and industry-focused skill development in one centralized digital ecosystem.',
    socialProof: 'Trusted by engineers and energy companies worldwide'
  };

  readonly heroFeatures = [
    { label: 'SSO & Role Management', icon: 'sso' as const },
    { label: 'Live Webinars & Assessments', icon: 'webinar' as const },
    { label: 'Employee Progress Tracking', icon: 'tracking' as const },
    { label: 'SCORM & Video Training Support', icon: 'scorm' as const }
  ];

  readonly heroFloatingStats = [
    { value: '10,000+', label: 'Learners trained' },
    { value: '94%', label: 'Completion rate' },
    { value: '70+', label: 'Industry courses' }
  ];

  readonly heroTrustedLogos = [
    { name: 'Shell', src: 'assets/img/shell.svg' },
    { name: 'ADNOC', src: 'assets/img/adnoc.svg' },
    { name: 'Petronas', src: 'assets/img/petronas-2.svg' },
    { name: 'Fluor', src: 'assets/img/fluor.svg' }
  ];

  readonly trustedCompanies = {
    title: 'Top Companies Trust Us',
    lead: 'Get your team access to top 70+ courses'
  };

  readonly trustedCompanyLogos = [
    { name: 'Shell', src: 'assets/img/shell.svg' },
    { name: 'ADNOC', src: 'assets/img/adnoc.svg' },
    { name: 'Petronas', src: 'assets/img/petronas-2.svg' },
    { name: 'Fluor', src: 'assets/img/fluor.svg' },
    { name: 'TechnipFMC', src: 'assets/img/technipfm.svg' },
    { name: 'SWECO', src: 'assets/img/sweco.svg' }
  ];

  readonly demoCta = {
    eyebrow: 'Get started',
    titleLine1: 'Ready To Upskill Your Employees',
    titleLine2: 'With Our Secure LMS Training Platform?',
    lead:
      'Let\u2019s connect to explore the right oil & gas learning solutions for onboarding, HSE, technical training, and multi-location teams.',
    support:
      'Book a free demo and see how your company can launch a private portal with SSO access, internal courses, live webinars, and employee progress tracking.'
  };

  readonly platformCapabilities: CorpPlatformCapability[] = [
    {
      title: 'Quick deployment and SSO integration',
      descriptionHtml:
        'Launch your private corporate portal fast with secure <strong>SSO login</strong>, so EPC, refinery, and project teams start training without complex IT setup.',
      icon: 'deploy'
    },
    {
      title: 'Built-in course and SOP authoring',
      descriptionHtml:
        'Create and update onboarding, HSE, technical, and <strong>department-wise courses</strong> directly inside your company portal—no external tools required.',
      icon: 'author'
    },
    {
      title: 'Custom branding and admin dashboards',
      descriptionHtml:
        'Deliver a <strong>white-labeled</strong> learning experience with company-branded portals and management dashboards for HR and L&amp;D leaders.',
      icon: 'brand'
    },
    {
      title: 'Automated tracking and compliance alerts',
      descriptionHtml:
        'Automate <strong>certification reminders</strong>, completion tracking, and workforce readiness updates across multiple sites and countries.',
      icon: 'automate'
    },
    {
      title: 'Access for remote and offshore teams',
      descriptionHtml:
        'Employees at <strong>offshore platforms</strong>, project sites, and remote locations access training securely from any device with employee-only login.',
      icon: 'access'
    },
    {
      title: 'Robust reporting and analytics',
      descriptionHtml:
        'Monitor progress, <strong>HSE compliance</strong>, skill gaps, and certification status with enterprise reports built for training managers.',
      icon: 'analytics'
    },
    {
      title: '70+ oil & gas industry courses',
      descriptionHtml:
        'Leverage a specialized content library with <strong>70+ oil &amp; gas</strong> programs covering piping, mechanical, electrical, instrumentation, process, QA/QC, and HSE.',
      icon: 'library'
    },
    {
      title: 'Enterprise-ready corporate licensing',
      descriptionHtml:
        'Scale training across departments and locations with <strong>centralized seat management</strong> designed for large industrial organizations.',
      icon: 'enterprise'
    },
    {
      title: 'Webinars and internal knowledge sharing',
      descriptionHtml:
        'Run <strong>live technical workshops</strong> and store project lessons, procedures, and company knowledge in one secure internal hub.',
      icon: 'social'
    }
  ];

  readonly learningCopy = {
    eyebrow: 'Enterprise learning platform',
    title: 'Build a Smarter Corporate Learning Ecosystem',
    lead:
      'Empower your workforce with a secure enterprise learning platform designed for oil & gas, EPC, industrial, and engineering organizations. Create, manage, and deliver internal training programs across teams, departments, and global locations — all from one centralized platform.'
  };

  readonly learningCta = {
    primary: 'Book Free Demo',
    support:
      'See how your organization can centralize employee learning, compliance, and technical workforce development.'
  };

  readonly learningVisual = {
    overlayTitle: 'Enterprise Workforce Learning',
    badge: 'Secure Internal Training Platform'
  };

  readonly learningFloatingTags = [
    'SOP Training',
    'Technical Courses',
    'HSE Compliance',
    'Webinar Sessions',
    'Employee Analytics',
    'Knowledge Hub'
  ];

  readonly learningStats = [
    { value: '5000+', label: 'Professionals trained' },
    { value: '100+', label: 'Enterprise learning modules' },
    { value: 'Multi-Location', label: 'Training support' },
    { value: 'Secure', label: 'Employee-only access' }
  ];

  readonly learningIndustryTags = [
    'Oil & Gas Companies',
    'EPC Contractors',
    'Refineries',
    'Industrial Plants',
    'Construction Companies',
    'Engineering Teams',
    'QA/QC & HSE Departments',
    'Corporate L&D Teams'
  ];

  readonly learningPanels: CorpLearningPanel[] = [
    {
      title: 'Private Company Training Portal',
      description:
        'Create a fully secure digital learning environment exclusively for your organization. Manage employee access, internal training programs, SOPs, onboarding materials, and technical documentation within your own private corporate portal.',
      icon: 'portal'
    },
    {
      title: 'Employee Learning & Progress Tracking',
      description:
        'Monitor employee training performance with real-time progress tracking, course completion analytics, certifications, and department-wise learning insights to ensure workforce compliance and continuous development.',
      icon: 'tracking'
    },
    {
      title: 'Live Webinars & Technical Training',
      description:
        'Conduct live online training sessions, webinars, safety workshops, and technical knowledge-sharing programs for employees working across offices, plants, offshore sites, and remote locations.',
      icon: 'webinar'
    },
    {
      title: 'Industry-Focused Knowledge Management',
      description:
        'Securely store and distribute internal company knowledge, engineering procedures, project lessons learned, HSE documentation, and technical resources built specifically for industrial and oil & gas operations.',
      icon: 'knowledge'
    }
  ];

  readonly platformStats = [
    { value: '70+', label: 'Industry Courses' },
    { value: 'Global', label: 'Learning Support' },
    { value: 'Enterprise', label: 'Ready Infrastructure' },
    { value: 'Secure', label: 'Enterprise Access' }
  ];

  readonly industryStats = [
    { value: '10,000+', label: 'Engineers trained' },
    { value: '95%', label: 'Completion rate' },
    { value: 'Global', label: 'Industrial teams' }
  ];

  readonly industryAudience: CorpIconCard[] = [
    {
      title: 'Oil & Gas Companies',
      description: 'Enterprise workforce development',
      icon: 'rig'
    },
    {
      title: 'EPC Contractors',
      description: 'Project-based technical onboarding',
      icon: 'blueprint'
    },
    {
      title: 'Refineries',
      description: 'HSE and compliance training',
      icon: 'refinery'
    },
    {
      title: 'Offshore Teams',
      description: 'Remote workforce learning',
      icon: 'offshore'
    },
    {
      title: 'Industrial Plants',
      description: 'Operational skill enhancement',
      icon: 'plant'
    },
    {
      title: 'Training Institutes',
      description: 'Certification delivery platform',
      icon: 'academy'
    }
  ];

  readonly features: CorpFeature[] = [
    {
      title: 'Private Company Training Portal',
      description: 'Dedicated secure learning environment for each company.',
      icon: 'portal'
    },
    {
      title: 'Employee-Only Access',
      description: 'SSO login and restricted access for internal employees only.',
      icon: 'sso'
    },
    {
      title: 'Course Creation & Management',
      description: 'Create onboarding, technical, SOP, HSE, QA/QC, and department-wise training.',
      icon: 'courses'
    },
    {
      title: 'Webinar & Live Training',
      description: 'Conduct live technical sessions and workshops across locations.',
      icon: 'webinar'
    },
    {
      title: 'Knowledge Management',
      description: 'Store procedures, project lessons, and company knowledge securely.',
      icon: 'knowledge'
    },
    {
      title: 'Progress Tracking',
      description: 'Monitor employee progress, certifications, and learning performance.',
      icon: 'tracking'
    },
    {
      title: 'Multi-Location Training Support',
      description: 'Support employees across offshore sites, projects, countries, and remote teams.',
      icon: 'locations'
    },
    {
      title: 'Industry-Specific Learning',
      description: 'Specially designed for oil & gas and industrial sectors.',
      icon: 'industry'
    }
  ];

  readonly howItWorks = [
    {
      step: '01',
      title: 'Private portal provisioned',
      detail: 'Your company receives a dedicated, branded corporate training portal.'
    },
    {
      step: '02',
      title: 'Admin uploads content',
      detail: 'Upload courses, SOPs, webinars, and internal training materials.'
    },
    {
      step: '03',
      title: 'Employees access via SSO',
      detail: 'Teams log in securely with enterprise SSO from any location.'
    },
    {
      step: '04',
      title: 'Management tracks outcomes',
      detail: 'Track learning progress, certifications, and workforce readiness.'
    }
  ];

  readonly useCases = [
    'Employee Onboarding',
    'Safety & HSE Training',
    'SOP Training',
    'Technical Skill Development',
    'Internal Knowledge Sharing',
    'Certification Programs',
    'Remote Workforce Training',
    'Multi-country Employee Learning'
  ];

  readonly specializations = [
    'Piping',
    'Mechanical',
    'Electrical',
    'Instrumentation',
    'Process',
    'QA/QC',
    'HSE',
    'EPC',
    'Construction',
    'Offshore Operations'
  ];

  readonly benefits: CorpIconCard[] = [
    { title: 'Secure Internal Learning', icon: 'shield', description: 'Keep proprietary training inside your organization.' },
    { title: 'Reduce Physical Training Costs', icon: 'cost', description: 'Scale digital delivery without repeated travel spend.' },
    { title: 'Standardize Employee Training', icon: 'standard', description: 'One consistent curriculum across departments.' },
    { title: 'Train Teams Across Locations', icon: 'globe', description: 'Reach offshore, site, and remote teams equally.' },
    { title: 'Faster Knowledge Transfer', icon: 'speed', description: 'Accelerate onboarding and competency development.' },
    { title: 'Centralized Corporate Learning', icon: 'hub', description: 'Unify courses, webinars, and knowledge in one hub.' },
    { title: 'Easy Employee Tracking', icon: 'chart', description: 'Dashboards for progress, completion, and certifications.' },
    { title: 'Enterprise Ready Solution', icon: 'enterprise', description: 'Built for large industrial and energy organizations.' }
  ];

  readonly faqs: CorpFaq[] = [
    {
      question: 'Can employees access training outside the company?',
      answer:
        'Training is delivered through your private company portal with employee-only access controls. Access policies are configured per your security requirements.'
    },
    {
      question: 'Does the platform support SSO login?',
      answer:
        'Yes. The platform supports secure SSO integration so employees can sign in with your corporate identity provider.'
    },
    {
      question: 'Can we create our own internal courses?',
      answer:
        'Yes. Administrators can create and manage internal courses including onboarding, technical, SOP, HSE, and department-specific programs.'
    },
    {
      question: 'Can we conduct live webinars?',
      answer:
        'Yes. You can schedule and deliver live webinars and technical workshops for distributed teams.'
    },
    {
      question: 'Can multiple company locations use the platform?',
      answer:
        'Yes. The platform supports multi-location, multi-country, and remote workforce training from a single corporate hub.'
    },
    {
      question: 'Is the platform customized for oil & gas companies?',
      answer:
        `Yes. ${this.brandName} specializes in oil & gas, EPC, refinery, and industrial training workflows with discipline-specific content support.`
    }
  ];

  activeFaqIndex: number | null = 0;
  activeLearningIndex = 0;

  private affiliateRefCode: string | null = null;
  private readonly affiliateSub = new Subscription();
  private static readonly AFFILIATE_REF_KEY = 'affiliate_ref';
  private static readonly AFFILIATE_REF_DAYS = 30;
  private static readonly PORTAL_PAGE_SLUG = 'corporate-training';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    private http: HttpClient,
    private route: ActivatedRoute,
    private renderer: Renderer2,
    private structuredData: StructuredDataService,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.affiliateSub.add(
      this.route.queryParamMap.subscribe((q) => {
        const ref = (q.get('ref') || '').trim();
        if (ref) {
          this.affiliateRefCode = ref;
          if (isPlatformBrowser(this.platformId)) {
            this.trackAffiliateClick(ref);
          }
        }
      })
    );

    const pageUrl = 'https://www.oilandgasclub.com/corporate-training';
    this.setCanonicalURL(pageUrl);
    this.titleService.setTitle(
      'Oilandgasclub — Enterprise LMS for Oil & Gas Workforce Training'
    );
    this.metaService.updateTag({
      name: 'description',
      content:
        `Upskill your oil & gas workforce with ${this.brandName}. Secure corporate LMS with SSO, live webinars, progress tracking, and SCORM support. Schedule a demo.`
    });
    this.metaService.updateTag({
      name: 'keywords',
      content:
        'LMS training platform, secure corporate LMS, oil and gas training, enterprise LMS, SSO training portal, HSE training, industrial learning, employee onboarding'
    });
    this.injectPageSchema(pageUrl);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const section = this.document.querySelector('.corp-industries');
    if (!section) return;

    if (typeof IntersectionObserver === 'undefined') {
      section.classList.add('is-visible');
      return;
    }

    this.industriesRevealObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('is-visible');
          this.industriesRevealObserver?.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    this.industriesRevealObserver.observe(section);
  }

  private setAffiliateRef(code: string): void {
    try {
      localStorage.setItem(CorporateTrainingComponent.AFFILIATE_REF_KEY, code);
      const expires = new Date();
      expires.setDate(expires.getDate() + CorporateTrainingComponent.AFFILIATE_REF_DAYS);
      localStorage.setItem(CorporateTrainingComponent.AFFILIATE_REF_KEY + '_exp', expires.toISOString());
      document.cookie = `${CorporateTrainingComponent.AFFILIATE_REF_KEY}=${encodeURIComponent(code)}; path=/; max-age=${CorporateTrainingComponent.AFFILIATE_REF_DAYS * 24 * 60 * 60}; SameSite=Lax`;
    } catch (_) {}
  }

  private trackAffiliateClick(code: string): void {
    const apiBase = ((environment as { apiUrl?: string }).apiUrl || '').toString().replace(/\/$/, '');
    if (!apiBase) return;
    this.http
      .post<{ tracked?: boolean }>(`${apiBase}/api/affiliate/track-click`, {
        affiliateCode: code,
        courseSlug: CorporateTrainingComponent.PORTAL_PAGE_SLUG,
      })
      .subscribe({
        next: (res) => {
          if (res?.tracked) {
            this.setAffiliateRef(code);
          }
        },
        error: () => {},
      });
  }

  ngOnDestroy(): void {
    this.affiliateSub.unsubscribe();
    this.industriesRevealObserver?.disconnect();
    ['structured-data-corp-service', 'structured-data-corp-software', 'structured-data-corp-faq'].forEach(id => {
      const el = this.document.getElementById(id);
      el?.remove();
    });
  }

  onIndustryCardHover(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement | null;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -12;
    card.style.setProperty('--tilt-x', `${y}deg`);
    card.style.setProperty('--tilt-y', `${x}deg`);
  }

  onIndustryCardLeave(event: MouseEvent): void {
    const card = event.currentTarget as HTMLElement | null;
    if (!card) return;

    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  }

  toggleFaq(index: number): void {
    this.activeFaqIndex = this.activeFaqIndex === index ? null : index;
  }

  isFaqOpen(index: number): boolean {
    return this.activeFaqIndex === index;
  }

  toggleLearningPanel(index: number): void {
    this.activeLearningIndex = index;
  }

  isLearningPanelOpen(index: number): boolean {
    return this.activeLearningIndex === index;
  }

  setCanonicalURL(url: string): void {
    const existingLink: HTMLLinkElement | null = this.document.querySelector('link[rel="canonical"]');
    if (existingLink) {
      existingLink.setAttribute('href', url);
    } else {
      const link: HTMLLinkElement = this.renderer.createElement('link');
      link.setAttribute('rel', 'canonical');
      link.setAttribute('href', url);
      this.renderer.appendChild(this.document.head, link);
    }
  }

  private injectPageSchema(pageUrl: string): void {
    this.structuredData.setOrganization({
      name: this.brandName,
      url: 'https://www.oilandgasclub.com',
      logo: 'https://www.oilandgasclub.com/assets/s3/oilandgas_club.svg',
      description:
        'Secure LMS training platform for oil & gas, EPC, refinery, and industrial organizations.'
    });

    const serviceSchema = {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: 'Secure LMS Training Platform',
      description:
        'Secure LMS for oil & gas companies with private portals, SSO, course management, webinars, and progress tracking.',
      url: pageUrl,
      provider: {
        '@type': 'Organization',
        name: this.brandName,
        url: 'https://www.oilandgasclub.com'
      },
      areaServed: 'Worldwide',
      audience: {
        '@type': 'BusinessAudience',
        audienceType: 'Oil & Gas and Industrial Enterprises'
      },
      serviceType: 'LMS Training Software'
    };

    const softwareSchema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `${this.brandName} Secure LMS Training Platform`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Book a free demo'
      },
      description:
        'Secure LMS training platform for oil & gas companies with private portals, SSO, and internal knowledge management.',
      url: pageUrl,
      provider: {
        '@type': 'Organization',
        name: this.brandName,
        url: 'https://www.oilandgasclub.com'
      }
    };

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: this.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    };

    this.injectJsonLd('structured-data-corp-service', serviceSchema);
    this.injectJsonLd('structured-data-corp-software', softwareSchema);
    this.injectJsonLd('structured-data-corp-faq', faqSchema);
  }

  private injectJsonLd(id: string, data: object): void {
    const existing = this.document.getElementById(id);
    if (existing) {
      existing.remove();
    }
    const script = this.renderer.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    this.renderer.appendChild(this.document.head, script);
  }

  openModal(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!isPlatformBrowser(this.platformId)) return;

    this.showModal = true;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;
    this.document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.isSubmitting = false;
    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }

  onFormSubmit(form: NgForm): void {
    if (this.isSubmitting) return;

    this.submitMessage = '';
    this.submitSuccess = false;
    this.showThankYouInModal = false;

    if (!form.valid) {
      this.submitMessage = 'Please fill all required fields.';
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }

    const fingerprint = this.getFingerprint();
    const now = Date.now();
    if (fingerprint && fingerprint === this.lastSubmitFingerprint && now - this.lastSubmitAtMs < 8000) {
      this.submitMessage = 'You already submitted this form. Please wait a moment before submitting again.';
      this.isSubmitting = false;
      return;
    }
    this.lastSubmitFingerprint = fingerprint;
    this.lastSubmitAtMs = now;

    this.isSubmitting = true;

    const params = new HttpParams()
      .set('First Name', (this.formData.firstName || '').trim())
      .set('Last Name', (this.formData.lastName || '').trim())
      .set('Work Email', (this.formData.workEmail || '').trim())
      .set('whatsapp number', (this.formData.whatsappNumber || '').trim())
      .set('Company', (this.formData.company || '').trim());

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });

    const requestBody = params.toString();

    this.http
      .post(this.GOOGLE_SCRIPT_URL, requestBody, { headers, responseType: 'text' })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (textResponse) => {
          let parsed: { success?: boolean; error?: string; message?: string } | null = null;
          try {
            parsed = JSON.parse(textResponse || '{}');
          } catch {
            if (textResponse && textResponse.trim().length > 0) {
              const lowerResponse = textResponse.toLowerCase();
              if (
                lowerResponse.includes('success') ||
                lowerResponse.includes('thank') ||
                lowerResponse.includes('submitted')
              ) {
                parsed = { success: true };
              } else if (lowerResponse.includes('error') || lowerResponse.includes('fail')) {
                parsed = { success: false, error: textResponse };
              } else {
                parsed = { success: true };
              }
            }
          }

          if (parsed?.success) {
            this.submitSuccess = true;
            this.showThankYouInModal = true;
            form.resetForm();
            this.formData = {
              firstName: '',
              lastName: '',
              workEmail: '',
              whatsappNumber: '',
              company: ''
            };
            setTimeout(() => this.closeModal(), 1800);
            return;
          }

          this.submitSuccess = false;
          const errorMessage = parsed?.error || parsed?.message || '';
          const lowerErrorMessage = errorMessage.toLowerCase();
          const isDuplicate =
            lowerErrorMessage.includes('duplicate') ||
            lowerErrorMessage.includes('already exists') ||
            lowerErrorMessage.includes('already submitted') ||
            lowerErrorMessage.includes('already registered');

          this.submitMessage = isDuplicate
            ? 'This submission already exists. You have already submitted this form with the same email and phone number.'
            : errorMessage || 'Submission failed. Please try again.';
        },
        error: (err: HttpErrorResponse) => {
          this.submitSuccess = false;
          const errorText = err?.error?.toString() || err?.message || '';
          const lowerErrorText = errorText.toLowerCase();
          const isDuplicate =
            lowerErrorText.includes('duplicate') ||
            lowerErrorText.includes('already exists') ||
            lowerErrorText.includes('already submitted');

          if (isDuplicate) {
            this.submitMessage =
              'This submission already exists. You have already submitted this form with the same email and phone number.';
          } else if (err.status === 0) {
            this.submitMessage =
              'Network error: Unable to connect to server. Please check your internet connection or try again later.';
          } else if (err.status >= 400 && err.status < 500) {
            this.submitMessage = `Request error (${err.status}): ${err.statusText || 'Please check your input and try again.'}`;
          } else if (err.status >= 500) {
            this.submitMessage = 'Server error: Please try again later.';
          } else {
            this.submitMessage = err?.message || 'Network error while submitting. Please try again.';
          }
        }
      });
  }

  private getFingerprint(): string {
    const email = (this.formData.workEmail || '').trim().toLowerCase();
    const phone = (this.formData.whatsappNumber || '').trim();
    return `${email}|${phone}`;
  }
}
