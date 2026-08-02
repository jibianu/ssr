import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';

@Component({
  selector: 'app-contact-us',
  templateUrl: './contact-us.component.html',
  styleUrls: ['./contact-us.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUsComponent implements OnInit {
  readonly heroStats = [
    { value: '24h', label: 'Average response time' },
    { value: '7+', label: 'Global support zones' },
    { value: '100%', label: 'Human-first assistance' },
  ];

  readonly contactCards = [
    {
      title: 'Corporate training',
      description: 'Custom academies, compliance rollouts, and hybrid delivery models for enterprises.',
      link: '/corporate-training',
    },
    {
      title: 'Become a trainer',
      description: 'Share your expertise with global cohorts and shape next-gen curriculum.',
      link: '/become-our-trainer',
    },
    {
      title: 'Partnerships',
      description: 'Co-create programs, joint events, or recruitment pipelines with us.',
      link: '/partner-us',
    },
  ];

  readonly offices = [{ region: 'India & APAC', phone: '+91 98402 87919', email: 'anush@oilandgasclub.com' }];

  readonly supportChannels = [
    'Live helpdesk (Mon–Fri, 9 AM – 6 PM IST)',
    'Dedicated enterprise success managers',
    'Slack / Teams shared channels on request',
    'Email support with 24h SLA',
  ];

  constructor(
    private readonly metadataService: MetadataService,
    private readonly canonicalService: CanonicalService
  ) {}

  ngOnInit(): void {
    this.metadataService.updateMetadata({
      title: 'Contact Us - Oil and Gas Club',
      description:
        'Have questions about our courses or certifications? Contact Oilandgasclub today for support, inquiries, and partnership opportunities. We are here to help!',
      seoUrl: 'https://oilandgasclub.com/contact-us',
    });

    this.canonicalService.setCanonicalURL('https://oilandgasclub.com/contact-us');
  }
}
