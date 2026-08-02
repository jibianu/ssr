
import { DOCUMENT } from '@angular/common';
import { Component, Inject, OnInit, Renderer2 } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-mission-and-vision',
  templateUrl: './mission-and-vision.component.html',
  styleUrls: ['./mission-and-vision.component.scss'],
  standalone: false,
})
export class MissionAndVisionComponent implements OnInit {
  readonly heroStats = [
    { value: '70+', label: 'Countries served' },
    { value: '120K+', label: 'Learners empowered' },
    { value: '450+', label: 'Academy partners' },
  ];

  readonly visionStatements = [
    {
      title: 'Elevate industry capability',
      description: 'Create a trusted ecosystem where every engineer accesses world-class knowledge instantly.',
    },
    {
      title: 'Champion equitable learning',
      description: 'Remove geographic, time, and device barriers so that anyone can reskill on demand.',
    },
    {
      title: 'Accelerate energy transition talent',
      description: 'Equip the workforce with digital, safety, and sustainability competencies to power the future.',
    },
  ];

  readonly missionPillars = [
    'Deliver rigorous, modular programs mapped to global codes and standards.',
    'Blend instructors, mentors, and analytics for measurable growth.',
    'Mobilize content in multiple formats—live, on-demand, and blended.',
    'Embed community support so professionals continuously expand networks.',
  ];

  readonly commitments = [
    {
      title: 'Learners first',
      description: 'We design every course to be mobile-first, inclusive, and scenario based.',
    },
    {
      title: 'Partners as co-creators',
      description: 'Enterprise clients influence roadmaps to align with their strategic priorities.',
    },
    {
      title: 'Evidence backed',
      description: 'Dashboards, assessments, and benchmarks keep progress transparent for all stakeholders.',
    },
  ];

  readonly impactHighlights = [
    {
      badge: 'Capability',
      title: 'Upskill pipelines',
      description: 'Structured academies ensure continuous reskilling across drilling, inspection, and automation.',
    },
    {
      badge: 'Trust',
      title: 'Compliance ready',
      description: 'Curricula mapped to API, ASNT, AWS, ASME, and IEC standards keep teams audit-ready.',
    },
    {
      badge: 'Community',
      title: 'Global cohorts',
      description: 'Peer forums and mentorship bridges unite professionals across 7+ time zones.',
    },
  ];

  constructor(
    private readonly titleService: Title,
    private readonly metaService: Meta,
    private readonly renderer: Renderer2,
    @Inject(DOCUMENT) private readonly document: Document
  ) {}

  ngOnInit(): void {
    this.setCanonicalURL('https://oilandgasclub.com/mission-and-vision');
    this.titleService.setTitle('Mission & Vision - Oilandgasclub');
    this.metaService.addTags([
      {
        name: 'description',
        content:
          'Explore how Oilandgasclub empowers energy professionals with a mission rooted in accessibility, excellence, and global impact.',
      },
      {
        name: 'keywords',
        content:
          'oilandgasclub mission, oil and gas learning vision, energy workforce strategy, professional development in oil and gas',
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
