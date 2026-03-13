

import { Component, OnInit } from '@angular/core';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-about-us',
    templateUrl: './about-us.component.html',
    styleUrls: ['./about-us.component.scss'],
    standalone: false
})
export class AboutUsComponent implements OnInit {
  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly metadataService: MetadataService;
  private readonly canonicalService: CanonicalService;
  private readonly structuredDataService: StructuredDataService;

  constructor(
    metadataService: MetadataService,
    canonicalService: CanonicalService,
    structuredDataService: StructuredDataService
  ) {
    // ✅ FIX: Initialize injected services in constructor to ensure injector is available
    this.metadataService = metadataService;
    this.canonicalService = canonicalService;
    this.structuredDataService = structuredDataService;
  }

  ngOnInit(): void {
    const canonicalUrl = `${environment.seoUrl}about-us`;
    const fullUrl = `https://www.oilandgasclub.com/about-us`;
    
    // ✅ SSR: Use MetadataService for proper meta tag management
    this.metadataService.updateMetadata({
      title: 'About Us - Oilandgasclub | Online Training & Certification Platform',
      description: 'Oilandgasclub is a leading online learning platform offering certifications and training programs for the oil and gas industry. Upskill with API, NDT, CSWIP, ASNT, and HTRI courses. Learn anytime, anywhere!',
      author: 'Oilandgasclub Team',
      type: 'website',
      image: 'https://www.oilandgasclub.com/assets/images/about-us-banner.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: fullUrl,
      time: '2021-09-01T06:18:55.5419129',
      updatedTime: '2023-07-08T06:43:07.881401',
      category: 'About Oilandgasclub, Oil and Gas Training, Certifications',
      canonicalUrl: canonicalUrl
    });

    this.canonicalService.setCanonicalURL(canonicalUrl);

    // ✅ SEO: Add structured data
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
  }
}
