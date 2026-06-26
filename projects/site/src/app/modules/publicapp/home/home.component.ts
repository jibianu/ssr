
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { PublicAppService } from '../publicapp.service';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';
import { resolveMediaCdnUrl } from 'src/app/core/helpers/assets-cdn.helper';
import { environment } from 'src/environments/environment';

// ✅ HYDRATION: Interface definitions for type safety in @for loops
interface CourseCard {
  url: string;
  image: string;
  alt: string;
  title: string;
  badge?: string;
  tags?: string[];
  instructor?: string;
  students?: string;
  rating?: string;
  ratingCount?: string;
  discount?: string;
  originalPrice?: string;
  features: string[];
  price: string;
  ctaLabel?: string;
}

interface EventCard {
  url: string;
  image: string;
  alt: string;
  title: string;
  subtitle: string;
  tags?: string[];
  description: string;
  price: string;
  seats?: string;
  mode?: string;
  schedule?: string;
  discount?: string;
  originalPrice?: string;
  ctaLabel?: string;
}

interface CategoryLink {
  url: string;
  title: string;
  description: string;
  class: string;
}

interface QuickLink {
  url: string;
  title: string;
}

/** Hero icon row: label + asset + route segment for `/category/:name` (matches backend category slugs). */
interface HeroCategoryIcon {
  readonly label: string;
  readonly src: string;
  readonly categorySegment: string;
}

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
    // ✅ HYDRATION: Removed ngSkipHydration to enable proper SSR hydration
    // Only browser-specific parts should skip hydration, not the entire component
})
export class HomeComponent implements OnInit, OnDestroy {
  /** Refresh top-course URL/price data periodically (ms). */
  private static readonly HOME_TOP_COURSES_REFRESH_MS = 120000;
  private topCoursesRefreshTimer: ReturnType<typeof setInterval> | null = null;
  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly metadataService: MetadataService;
  private readonly canonicalService: CanonicalService;
  private readonly structuredDataService: StructuredDataService;

  constructor(
    metadataService: MetadataService,
    canonicalService: CanonicalService,
    structuredDataService: StructuredDataService,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {
    // ✅ FIX: Initialize injected services in constructor to ensure injector is available
    this.metadataService = metadataService;
    this.canonicalService = canonicalService;
    this.structuredDataService = structuredDataService;
  }

  /** Elearn register: same-origin → `/register`; separate dev server → full origin + `/register`. */
  get registerUrl(): string {
    const base = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim();
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base.replace(/\/$/, '')}/register`;
    }
    return '/register';
  }

  // ✅ HYDRATION: Data arrays for @for loops - prevents SSR mismatches
  readonly topCourses: CourseCard[] = [
    {
      url: '/mastering-pipenet-self-learning-training-materials-for-piping-design-and-simulation',
      image: 'assets/home_courseimage/cd.jpeg',
      alt: 'PIPENET training materials',
      title: 'PIPENET training materials, Self Learning',
      badge: 'Best Seller',
      tags: ['Fundamentals'],
      instructor: 'Anush',
      students: '18,450 learners',
      rating: '4.7',
      ratingCount: '1.2K reviews',
      discount: '90% Disc.',
      originalPrice: '₹3,999.00',
      features: [
        'Steady-state flow analysis',
        'Self-paced simulation practice',
        'Transient dynamic flow walkthroughs'
      ],
      price: '₹399.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/api-570-closed-book-mock-exam-comprehensive-preparation',
      image: 'assets/home_courseimage/Api_570.jpeg',
      alt: 'API 570 Mock Exam',
      title: 'API 570 Closed-Book Mock Exam Q&A Practice',
      badge: 'Best Seller',
      tags: ['Exam Ready'],
      instructor: 'Jaya Kumar',
      students: '26,300 learners',
      rating: '4.9',
      ratingCount: '2.4K reviews',
      discount: '95% Disc.',
      originalPrice: '₹1,999.00',
      features: [
        'Mock exam question banks',
        'Timed practice simulations',
        'Answer keys with expert insights'
      ],
      price: '₹99.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/cswip-three-point-one-question-paper-part-two',
      image: 'assets/home_courseimage/Cswip_3.1_Exam.png',
      alt: 'CSWIP 3.1 Exam',
      title: 'CSWIP 3.1 Exam Preparation with Q&A Practice',
      badge: 'Best Seller',
      tags: ['Certification'],
      instructor: 'Ragavan Iyer',
      students: '12,980 learners',
      rating: '4.8',
      ratingCount: '980 reviews',
      discount: '88% Disc.',
      originalPrice: '₹1,699.00',
      features: [
        'Practice exam simulations',
        'Topic-wise revision decks',
        'Live doubt-solving recordings'
      ],
      price: '₹198.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/welding-and-ndt-service',
      image: 'assets/home_courseimage/Welding_NDT.png',
      alt: 'Welding & NDT Training',
      title: 'Welding & NDT Self-Paced Training for Professionals',
      badge: 'Best Seller',
      tags: ['Hands-on'],
      instructor: 'Mahesh Varma',
      students: '9,640 learners',
      rating: '4.6',
      ratingCount: '760 reviews',
      discount: '94% Disc.',
      originalPrice: '₹1,299.00',
      features: [
        'Welding procedure walk-throughs',
        'NDT technique video library',
        'Case-based inspection drills'
      ],
      price: '₹79.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/coating-and-painting-techniques-cbt-part-one-training-for-excellence',
      image: 'assets/home_courseimage/coating-and-painting.jpeg',
      alt: 'Coating & Painting Course',
      title: 'Coating & Painting Exam Preparation Course',
      badge: 'Best Seller',
      tags: ['Skill Boost'],
      instructor: 'Nisha Varadarajan',
      students: '7,420 learners',
      rating: '4.7',
      ratingCount: '640 reviews',
      discount: '90% Disc.',
      originalPrice: '₹1,999.00',
      features: [
        'Surface prep best practices',
        'Application troubleshooting demos',
        'Mock certification exercises'
      ],
      price: '₹198.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/bgas-painting-questions',
      image: 'assets/home_courseimage/bgas-painting.jpeg',
      alt: 'BGAS Painting Inspector',
      title: 'BGAS Painting Inspector Q&A Practice Course',
      badge: 'Best Seller',
      tags: ['Mock Tests'],
      instructor: 'Sarayu Megh',
      students: '11,560 learners',
      rating: '4.8',
      ratingCount: '1.1K reviews',
      discount: '92% Disc.',
      originalPrice: '₹2,499.00',
      features: [
        'Timed BGAS mock exams',
        'Topic-wise revision notes',
        'Exam-day strategy planner'
      ],
      price: '₹199.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/cswip-three-point-one-question-paper-part-two',
      image: 'assets/home_courseimage/CSWIP_3.1_QA.jpeg',
      alt: 'CSWIP 3.1 Q&A',
      title: 'CSWIP 3.1 Q&A Self-Practice Course',
      badge: 'Best Seller',
      tags: ['Popular'],
      instructor: 'Gayathri Devi',
      students: '14,220 learners',
      rating: '4.9',
      ratingCount: '1.4K reviews',
      discount: '88% Disc.',
      originalPrice: '₹1,699.00',
      features: [
        'Real exam style question sets',
        'Self-evaluation scorecards',
        'Peer discussion recordings'
      ],
      price: '₹198.00',
      ctaLabel: 'Buy'
    },
    {
      url: '/bgas-question-and-answers',
      image: 'assets/home_courseimage/BAGS_Certification.jpeg',
      alt: 'BGAS Certification',
      title: 'BGAS Certification Q&A Practice Course',
      badge: 'Best Seller',
      tags: ['Fast Track'],
      instructor: 'Kishore Menon',
      students: '8,010 learners',
      rating: '4.7',
      ratingCount: '890 reviews',
      discount: '89% Disc.',
      originalPrice: '₹2,799.00',
      features: [
        'Q&A vault with explanations',
        'Scenario-based practice labs',
        'Exam readiness checklist'
      ],
      price: '₹299.00',
      ctaLabel: 'Buy'
    }
  ];

  topEvents: EventCard[] = [
    {
      url: '',
      image: 'assets/home_courseimage/Pipenet_Event.jpeg',
      alt: 'PIPENET Transient Module Event',
      title: 'PIPENET Transient Module for Fire Protection Systems',
      subtitle: 'A Event by Anush',
      tags: ['Live', 'Hands-on'],
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹797.00',
      seats: '40 seats left',
      mode: 'Virtual',
      schedule: 'Sat, 10 AM IST',
      discount: 'Save ₹1,200',
      originalPrice: '₹1,999.00',
      ctaLabel: 'Check back soon'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Static_equipment.png',
      alt: 'Static Equipment Design',
      title: 'Static Equipment Design: Mastering Pressure Vessels, Heat Exchangers, and Tall Towers',
      subtitle: 'A Event by Anush',
      tags: ['Live', 'Design'],
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹899.00',
      seats: '25 seats left',
      mode: 'Virtual',
      schedule: 'Sun, 3 PM IST',
      discount: 'Save ₹1,500',
      originalPrice: '₹2,399.00',
      ctaLabel: 'Check back soon'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Pv.png',
      alt: 'Pressure Vessel Design',
      title: 'Masterclass on Pressure Vessel Design – ASME Codes & PVElite Training',
      subtitle: 'A Event by Anush',
      tags: ['Masterclass'],
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹799.00',
      seats: 'Sold out soon',
      mode: 'Hybrid',
      schedule: 'Fri, 6 PM IST',
      discount: 'Save ₹900',
      originalPrice: '₹1,699.00',
      ctaLabel: 'Check back soon'
    },
    {
      url: '',
      image: 'assets/home_courseimage/Heat_Exchanger.png',
      alt: 'Mastering Heat Exchangers',
      title: 'Mastering Heat Exchangers with HTRI Software',
      subtitle: 'A Event by Anush',
      tags: ['Software Lab'],
      description: 'Online Workshop<br>Oilandgasclub Team, India<br>Streaming Virtually Through Microsoft Teams',
      price: '₹899.00',
      seats: '30 seats left',
      mode: 'Virtual',
      schedule: 'Wed, 7 PM IST',
      discount: 'Save ₹1,300',
      originalPrice: '₹2,199.00',
      ctaLabel: 'Check back soon'
    }
  ];

  readonly categoryLinks: CategoryLink[] = [
    { url: '/category/Process', title: 'Specialized Process Design Courses', description: 'Over 11 + course', class: 'cour-item1' },
    { url: '/category/Piping', title: 'Software-Based Piping Design Courses', description: 'Over 15+ course', class: 'cour-item2' },
    { url: '/category/NDT', title: 'NDT Method-Specific Courses', description: 'Over 20+ course', class: 'cour-item3' },
    { url: '/category/Instrumentation', title: 'Industry-Specific Instrumentation Courses', description: 'Over 20+ course', class: 'cour-item4' },
    { url: '/category/API%20Self%20Learning%20Courses', title: 'API Self Learning Courses', description: 'Over 20+ course', class: 'cour-item5' }
  ];

  /** Same categories as the lower “Browse by category” row where applicable (Welding → NDT). */
  readonly heroCategoryIcons: ReadonlyArray<HeroCategoryIcon> = [
    { label: 'Welding', src: 'assets/welding-oilandgasclub.svg', categorySegment: 'NDT' },
    { label: 'Process', src: 'assets/process-oilandgasclub.svg', categorySegment: 'Process' },
    { label: 'Piping', src: 'assets/piping-oilandgasclub.svg', categorySegment: 'Piping' },
    { label: 'Instrumentation', src: 'assets/instrumentation-oilandgasclub.svg', categorySegment: 'Instrumentation' },
    { label: 'Structural', src: 'assets/structural-oilandgasclub.svg', categorySegment: 'Structural' }
  ];

  readonly heroStats: ReadonlyArray<string> = [
    '70+ Courses',
    '250k+ Learners',
    '30+ Countries'
  ];

  readonly quickLinks: QuickLink[] = [
    { url: '/Intools-Training/', title: 'Smart Plant Instrumentation Design' },
    { url: '/Aspen-HYSYS-Training', title: 'Process Simulation' },
    { url: '/PDMS-Training/', title: 'Plant Design Management System' },
    { url: '/SP3D-Training/', title: 'Smart Plant 3D' },
    { url: '/E3d-Training', title: 'E3D' },
    { url: '/HTRI-Software/', title: 'Heat Exchanger Design' },
    { url: '/pipenet-training/', title: 'Fluid Flow Analysis' },
    { url: '/Primavera-Training/', title: 'Primavera P6' },
    { url: '/Tekla-Software-Training/', title: 'Structures Modelling' },
    { url: '/Piping-Stress-Analysis-Course/', title: 'Stress Analysis' }
  ];

  ngOnInit(): void {
    const canonicalUrl = environment.seoUrl;
    const fullUrl = 'https://www.oilandgasclub.com';

    // ✅ SEO: Use MetadataService for proper meta tag management (SSR-compatible)
    this.metadataService.updateMetadata({
      title: 'Oilandgasclub - Self-Learning Courses for Oil and Gas Industry Professionals',
      description: 'Oilandgasclub.com – Empowering careers in the oil and gas industry with self-paced online courses. Advance your skills with expert-designed training programs, certification prep, and career-focused resources. Start learning today!',
      author: 'Oilandgasclub',
      type: 'website',
      image: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: fullUrl,
      canonicalUrl: canonicalUrl
    });

    this.canonicalService.setCanonicalURL(canonicalUrl);

    // ✅ SEO: Add Organization structured data (should be on homepage)
    this.structuredDataService.setOrganization({
      name: 'Oilandgasclub',
      url: 'https://www.oilandgasclub.com',
      logo: 'https://www.oilandgasclub.com/assets/images/og-image.jpg',
      description: 'Leading online learning platform offering certifications and training programs for the oil and gas industry',
      sameAs: [
        'https://www.facebook.com/oilandgasclub',
        'https://www.twitter.com/oilandgasclub',
        'https://www.linkedin.com/company/oilandgasclub'
      ]
    });

    // ✅ SEO: Add WebSite schema with search action
    this.structuredDataService.setWebSite(
      'Oilandgasclub',
      'https://www.oilandgasclub.com',
      'https://www.oilandgasclub.com/search?q={search_term_string}'
    );

    // Keep homepage design/images static, but bind each card URL to an actual published course slug.
    this.syncTopCourseUrls();
    this.syncTopEventUrls();
    this.startTopCourseAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.topCoursesRefreshTimer) {
      clearInterval(this.topCoursesRefreshTimer);
      this.topCoursesRefreshTimer = null;
    }
  }

  private syncTopCourseUrls(): void {
    this.publicAppService
      .getCourseCatalog()
      .pipe(catchError(() => of({ results: [] })))
      .subscribe((res: any) => {
        const rows: any[] = Array.isArray(res?.results) ? res.results : [];
        if (!rows.length) return;

        const slugToRoute = new Map<string, string>();
        const slugToAmount = new Map<string, number>();
        const titleRows: Array<{ title: string; route: string }> = [];

        for (const row of rows) {
          const route = this.toCourseRoute(row?.canonicalUrl || row?.slug || row?.url || '');
          if (!route) continue;
          const slug = this.normalizeSlug(route);
          if (slug) {
            slugToRoute.set(slug, route);
            const amount = this.getRowAmount(row);
            if (amount !== null) slugToAmount.set(slug, amount);
          }
          titleRows.push({ title: this.normalizeTitle(row?.title || ''), route });
        }

        let changed = false;
        const used = new Set<string>();
        for (const card of this.topCourses) {
          const currentSlug = this.normalizeSlug(card.url);
          const bySlug = currentSlug ? slugToRoute.get(currentSlug) : undefined;
          const resolved = bySlug || this.findBestRouteByTitle(card.title, titleRows);
          if (resolved && resolved !== card.url) {
            card.url = resolved;
            changed = true;
          }
          const activeSlug = this.normalizeSlug(card.url);
          const liveAmount = slugToAmount.get(activeSlug);
          if (liveAmount !== undefined) {
            const livePrice = this.formatHomePrice(liveAmount);
            if (livePrice !== card.price) {
              card.price = livePrice;
              changed = true;
            }
          }
          if (card.url) used.add(card.url);
        }

        // Final fallback: ensure every card has a working real course route.
        if (this.topCourses.some(c => !slugToRoute.has(this.normalizeSlug(c.url)))) {
          const candidates = titleRows.map(r => r.route).filter(Boolean);
          let idx = 0;
          for (const card of this.topCourses) {
            if (slugToRoute.has(this.normalizeSlug(card.url))) continue;
            while (idx < candidates.length && used.has(candidates[idx])) idx++;
            if (idx < candidates.length) {
              card.url = candidates[idx];
              const mappedAmount = slugToAmount.get(this.normalizeSlug(card.url));
              if (mappedAmount !== undefined) {
                card.price = this.formatHomePrice(mappedAmount);
              }
              used.add(candidates[idx]);
              changed = true;
              idx++;
            }
          }
        }

        // Also sync quick links to live course slugs (no UI/design change).
        changed = this.syncQuickLinksToLiveCourses(titleRows, slugToRoute) || changed;

        if (changed) this.cdr.markForCheck();
      });
  }

  private startTopCourseAutoRefresh(): void {
    // Browser-only: avoid timers during SSR render.
    if (typeof window === 'undefined') return;
    if (this.topCoursesRefreshTimer) return;
    this.topCoursesRefreshTimer = setInterval(() => {
      this.syncTopCourseUrls();
    }, HomeComponent.HOME_TOP_COURSES_REFRESH_MS);
  }

  private toCourseRoute(raw: string): string {
    const s = (raw || '').toString().trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) {
      try {
        const u = new URL(s);
        return this.toCourseRoute(u.pathname);
      } catch {
        return '';
      }
    }
    const normalized = s
      .replace(/^\/+/, '')
      .replace(/^courses?\//i, '')
      .replace(/^course\/course\//i, '')
      .replace(/^course\//i, '')
      .replace(/\/+$/, '');
    return normalized ? `/${normalized}` : '';
  }

  private normalizeSlug(route: string): string {
    return (route || '').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase();
  }

  private normalizeTitle(text: string): string {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private findBestRouteByTitle(cardTitle: string, rows: Array<{ title: string; route: string }>): string {
    const needle = this.normalizeTitle(cardTitle);
    if (!needle) return '';
    const exact = rows.find(r => r.title === needle);
    if (exact) return exact.route;
    const contains = rows.find(r => r.title.includes(needle) || needle.includes(r.title));
    return contains?.route || '';
  }

  private syncQuickLinksToLiveCourses(
    rows: Array<{ title: string; route: string }>,
    slugToRoute: Map<string, string>
  ): boolean {
    const hintByTitle: Record<string, string> = {
      'Smart Plant Instrumentation Design': 'intools',
      'Process Simulation': 'hysys',
      'Plant Design Management System': 'pdms',
      'Smart Plant 3D': 'sp3d',
      'E3D': 'e3d',
      'Heat Exchanger Design': 'htri',
      'Fluid Flow Analysis': 'pipenet',
      'Primavera P6': 'primavera',
      'Structures Modelling': 'tekla',
      'Stress Analysis': 'piping stress'
    };

    let changed = false;
    for (const link of this.quickLinks) {
      const currentSlug = this.normalizeSlug(link.url);
      if (slugToRoute.has(currentSlug)) continue; // already valid

      const hint = hintByTitle[link.title] || this.normalizeTitle(link.title);
      const normalizedHint = this.normalizeTitle(hint);
      if (!normalizedHint) continue;

      const match = rows.find(r =>
        r.title.includes(normalizedHint) || this.normalizeSlug(r.route).includes(normalizedHint.replace(/\s+/g, '-'))
      );
      if (match && match.route !== link.url) {
        link.url = match.route;
        changed = true;
      }
    }
    return changed;
  }

  private getRowAmount(row: any): number | null {
    const raw = row?.amount ?? row?.Amount ?? row?.finalPrice ?? row?.price;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  private formatHomePrice(amount: number): string {
    return `₹${amount.toFixed(2)}`;
  }

  /** Bind homepage event cards to live dashboard events (URLs, titles, prices). Keeps static images as fallback. */
  private syncTopEventUrls(): void {
    this.publicAppService
      .getDashboardEvents()
      .pipe(catchError(() => of([])))
      .subscribe((events: any[]) => {
        if (!Array.isArray(events) || events.length === 0) {
          return;
        }

        const live = events.slice(0, this.topEvents.length);
        let changed = false;

        live.forEach((evt, index) => {
          const card = this.topEvents[index];
          if (!card) {
            return;
          }

          const slug = normalizeEventCanonicalSlug(evt?.canonicalUrl ?? evt?.CanonicalUrl);
          if (slug) {
            const route = `/${slug}`;
            if (card.url !== route) {
              card.url = route;
              changed = true;
            }
            if (card.ctaLabel === 'Check back soon') {
              card.ctaLabel = 'Register Now';
              changed = true;
            }
          }

          const title = (evt?.title ?? evt?.Title ?? '').toString().trim();
          if (title && card.title !== title) {
            card.title = title;
            changed = true;
          }

          const amount = Number(evt?.amount ?? evt?.Amount);
          if (Number.isFinite(amount) && amount >= 0) {
            const price = this.formatHomePrice(amount);
            if (card.price !== price) {
              card.price = price;
              changed = true;
            }
          }

          const imageUrl = this.resolveHomeEventImage(evt);
          if (imageUrl && card.image !== imageUrl) {
            card.image = imageUrl;
            changed = true;
          }
        });

        if (changed) {
          this.cdr.markForCheck();
        }
      });
  }

  private resolveHomeEventImage(evt: any): string {
    const fromDetails = Array.isArray(evt?.eventDetails)
      ? evt.eventDetails.find((d: any) => d?.section === 'image')?.imageUrl
      : '';
    const eventInfo = (evt?.eventInfo ?? '').toString();
    const titleImageMatch = eventInfo.match(/\[TitleImage:(.+?)\]/);
    const raw = (fromDetails || titleImageMatch?.[1] || evt?.bannerImage || evt?.imageUrl || '').toString().trim();
    if (!raw) {
      return '';
    }
    if (raw.startsWith('assets/')) {
      return raw.startsWith('/') ? raw : `/${raw}`;
    }
    return resolveMediaCdnUrl(this.publicAppService.resolveCourseImageUrl(raw));
  }
}
