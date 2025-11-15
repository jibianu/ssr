
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-in-house-solutions',
  templateUrl: './in-house-solutions.component.html',
  styleUrls: ['./in-house-solutions.component.scss'],
  standalone: false,
})
export class InHouseSolutionsComponent implements OnInit {
  readonly heroStats = [
    { value: '140+', label: 'In-house rollouts annually' },
    { value: '30%', label: 'Avg. travel cost saved' },
    { value: '7', label: 'Delivery modes supported' },
  ];

  readonly solutionHighlights = [
    {
      title: 'Asset-specific academies',
      description: 'Customize programs for upstream, midstream, downstream, LNG, or renewables portfolios.',
    },
    {
      title: 'Compliance bootcamps',
      description: 'Align teams with API, ASNT, AWS, IEC, and local regulatory mandates using real scenarios.',
    },
    {
      title: 'Leadership labs',
      description: 'Coach supervisors on safety culture, digital adoption, and people leadership in hybrid crews.',
    },
    {
      title: 'Technology enablement',
      description: 'Accelerate adoption of SCADA, digital twins, and asset performance platforms via hands-on clinics.',
    },
  ];

  readonly deliveryModels = [
    'On-site instructor residencies',
    'Regional hub classrooms',
    'Live virtual studios with dual instructors',
    'Blended playlists with self-paced modules',
    'White-labeled LMS deployments',
  ];

  readonly capabilityPillars = [
    {
      title: 'Secure content rooms',
      description: 'NDA-backed development, asset anonymization, and governed access for sensitive material.',
    },
    {
      title: 'Global facilitator bench',
      description: 'Subject matter experts across drilling, integrity, process safety, instrumentation, and OT.',
    },
    {
      title: 'Analytics & reporting',
      description: 'Shareable dashboards for attendance, competency, and ROI metrics tailored to leadership.',
    },
  ];

  readonly processSteps = [
    {
      step: '01',
      title: 'Discovery sprint',
      description: 'Assess goals, standards, and talent personas; review existing SOPs and LMS assets.',
    },
    {
      step: '02',
      title: 'Co-design',
      description: 'Prototype curriculum, labs, and assessments alongside your technical authorities.',
    },
    {
      step: '03',
      title: 'Pilot & iterate',
      description: 'Facilitate a rapid pilot, capture feedback, and refine logistics before full deployment.',
    },
    {
      step: '04',
      title: 'Scale & support',
      description: 'Roll out globally with concierge coordination, multilingual facilitators, and success reviews.',
    },
  ];

  readonly differentiators = [
    {
      badge: 'Speed',
      title: 'Launch in weeks',
      description: 'Modular templates plus SMEs ready on standby compress timelines dramatically.',
    },
    {
      badge: 'Precision',
      title: 'Role-based pathways',
      description: 'Mapped to engineers, inspectors, operators, and leadership for maximum relevance.',
    },
    {
      badge: 'Care',
      title: 'White-glove logistics',
      description: 'Travel, visas, simulators, and safety documentation coordinated end-to-end by our team.',
    },
  ];

  constructor(
    private readonly titleService: Title,
    private readonly metaService: Meta,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://www.oilandgasclub.com/in-house-solutions');
    this.titleService.setTitle('In-house Solutions - Oilandgasclub');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Co-create private academies with Oilandgasclub. Tailor on-site, hybrid, or virtual training for oil & gas teams worldwide.',
      },
      {
        name: 'keywords',
        content:
          'in-house oil and gas training, private corporate academy, customized technical courses, onsite oil gas learning',
      },
    ]);
  }

  private setCanonicalURL(url: string): void {
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
}
