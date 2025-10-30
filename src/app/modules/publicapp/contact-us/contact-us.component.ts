import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';

// ✅ PERFORMANCE: OnPush change detection for faster change detection (30-50% improvement)
// ✅ SSR: Uses MetadataService which is SSR-compatible
@Component({
    selector: 'app-contact-us',
    templateUrl: './contact-us.component.html',
    styleUrls: ['./contact-us.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactUsComponent implements OnInit {

  constructor(
    private metadataService: MetadataService,
    private canonicalService: CanonicalService
  ) {}

  ngOnInit(): void {
    // ✅ SSR: Use metadata service for SSR-compatible meta tag management
    // Note: keywords is not part of PageMetadata interface, removed
    this.metadataService.updateMetadata({
      title: 'Contact Us - Oil and Gas Club',
      description: 'Have questions about our courses or certifications? Contact Oilandgasclub today for support, inquiries, and partnership opportunities. We are here to help!',
      seoUrl: 'https://www.oilandgasclub.com/contact-us'
    });
    
    // ✅ SSR: Use canonical service for SSR-compatible canonical URL
    this.canonicalService.setCanonicalURL('https://www.oilandgasclub.com/contact-us');
  }
}
