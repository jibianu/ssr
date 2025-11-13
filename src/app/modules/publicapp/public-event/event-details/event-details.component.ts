import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { PublicAppService } from '../../publicapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { environment } from 'src/environments/environment';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';

interface EventDetail {
  section: string;
  id?: string;
  title?: string;
  amount?: number;
  description?: string;
  tag?: string;
  imageUrl?: string;
}

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  brand: string;
  brandAlt: string;
  quote: string;
}

@Component({
  selector: 'app-event-details',
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class EventDetailsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('viewMoreBtn', { static: false }) viewMoreBtn?: ElementRef<HTMLButtonElement>;
  @ViewChild('largeText', { static: false }) largeText?: ElementRef<HTMLParagraphElement>;
  @ViewChild('testimonialSlider', { static: false }) testimonialSlider?: ElementRef<HTMLDivElement>;

  event: any = null;
  events: any[] = [];
  eventId = '';
  bgImage =
    'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F935098893%2F2194700540003%2F1%2Foriginal.20250114-070250?crop=focalpoint&fit=crop&w=940&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.417955571955&fp-y=0.327681496879&s=ba16dfa89eb36e033ae72207acd91b33';

  eventUserForm!: FormGroup;
  modalRef: NgbModalRef | null = null;

  testimonials: Testimonial[] = [
    {
      name: 'Ekta',
      role: 'Placement at IBM',
      avatar: 'assets/avatars/ekta.jpg',
      brand: 'assets/logos/ibm.svg',
      brandAlt: 'IBM',
      quote:
        'The hands-on focus stood out for me. Live labs and constant feedback helped me master the tools quickly.'
    },
    {
      name: 'Rupall',
      role: 'Placement at Cognizant',
      avatar: 'assets/avatars/rupall.jpg',
      brand: 'assets/logos/cognizant.svg',
      brandAlt: 'Cognizant',
      quote:
        'Mentors were extremely approachable. They bridged theory with real projects, which gave me clarity and confidence.'
    },
    {
      name: 'Nishant',
      role: 'Placement at TCS',
      avatar: 'assets/avatars/nishant.jpg',
      brand: 'assets/logos/tcs.svg',
      brandAlt: 'TCS',
      quote:
        'Oilandgasclub helped me with resume building and mock interviews. I’m grateful for their assistance in launching my IT career.'
    },
    {
      name: 'Aparna',
      role: 'DevOps Engineer at Accenture',
      avatar: 'assets/avatars/aparna.jpg',
      brand: 'assets/logos/accenture.svg',
      brandAlt: 'Accenture',
      quote:
        'Loved the accountability pods and weekly checkpoints. It kept me on track, and I picked up best practices fast.'
    }
  ];

  canScrollLeft = false;
  canScrollRight = true;

  private readonly subscription = new Subscription();
  private readonly isBrowser: boolean;
  private expanded = false;
  private testimonialScrollTimeout: any = null;

  constructor(
    private readonly modalService: NgbModal,
    private readonly formBuilder: FormBuilder,
    private readonly publicAppService: PublicAppService,
    private readonly toasterService: ToasterService,
    private readonly route: ActivatedRoute,
    private readonly metadataService: MetadataService,
    private readonly canonicalService: CanonicalService,
    private readonly structuredDataService: StructuredDataService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.subscription.add(
      this.route.data.subscribe((data) => {
        const resolvedEvent = data?.['event'] ?? null;
        this.event = resolvedEvent;
        this.events = resolvedEvent?.upcomingEvents ?? [];
        this.eventId = resolvedEvent?.id ?? '';
        this.bgImage = this.resolveHeroImage(resolvedEvent);
        this.setEventMetadata();
        this.cdr.markForCheck();
      })
    );
  }

  ngOnInit(): void {
    this.eventUserForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      companyName: ['', Validators.required],
      designation: ['', Validators.required],
      department: ['', Validators.required],
      paymentRefNo: ['']
    });

    if (this.isBrowser) {
      setTimeout(() => this.updateTestimonialControls(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => this.updateTestimonialControls(), 0);
    }
  }

  ngOnDestroy(): void {
    if (this.testimonialScrollTimeout) {
      clearTimeout(this.testimonialScrollTimeout);
    }
    this.subscription.unsubscribe();
  }

  getInfo(section: string): EventDetail[] {
    return this.event?.eventDetails?.filter((detail: EventDetail) => detail.section === section) ?? [];
  }

  sumAmount(section: string): number {
    return this.getInfo(section).reduce((total, detail) => total + (detail.amount ?? 0), 0);
  }

  getRemaining(startDate: string | Date | null): { days: number; hours: number } {
    if (!startDate) {
      return { days: 0, hours: 0 };
    }
    const start = new Date(startDate);
    const now = new Date();
    if (start <= now) {
      return { days: 0, hours: 0 };
    }
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  }

  getValue(section: string, title: string, key: string): any {
    return this.event?.eventDetails?.find(
      (detail: EventDetail) => detail.section === section && detail.title === title
    )?.[key] ?? '';
  }

  getEventDt(event: any, section: string, index: number): EventDetail | undefined {
    return event?.eventDetails?.filter((detail: EventDetail) => detail.section === section)?.[index];
  }

  openRegisterModal(content: any): void {
    this.modalRef = this.modalService.open(content, { scrollable: true });
  }

  onViewMoreInfo(): void {
    this.expanded = !this.expanded;
    this.cdr.markForCheck();
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  trackByTagId(index: number, item: EventDetail): string {
    return item?.id ?? item?.tag ?? index.toString();
  }

  trackByCurriculumId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackByBonusId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackBySalaryId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackByOrganizerId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackBySocialId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackByQaId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  trackByEventId(index: number, related: any): string {
    return related?.id ?? index.toString();
  }

  trackByTestimonial(index: number, testimonial: Testimonial): string {
    return testimonial?.name ?? index.toString();
  }

  scrollTestimonials(direction: 1 | -1): void {
    if (!this.isBrowser || !this.testimonialSlider) {
      return;
    }

    const slider = this.testimonialSlider.nativeElement;
    const sampleCard = slider.querySelector<HTMLElement>('.testimonial-card');
    const cardWidth = sampleCard ? sampleCard.offsetWidth : slider.clientWidth;
    const gap = parseInt(getComputedStyle(slider).gap || '24', 10);
    const distance = cardWidth + gap;

    slider.scrollTo({
      left: slider.scrollLeft + direction * distance,
      behavior: 'smooth'
    });

    if (this.testimonialScrollTimeout) {
      clearTimeout(this.testimonialScrollTimeout);
    }

    this.testimonialScrollTimeout = setTimeout(() => this.updateTestimonialControls(), 320);
  }

  updateTestimonialControls(): void {
    if (!this.isBrowser || !this.testimonialSlider) {
      this.canScrollLeft = false;
      this.canScrollRight = false;
      return;
    }

    const slider = this.testimonialSlider.nativeElement;
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth - 1;
    this.canScrollLeft = slider.scrollLeft > 1;
    this.canScrollRight = slider.scrollLeft < maxScrollLeft;
    this.cdr.markForCheck();
  }

  paymentProcess(): void {
    if (this.eventUserForm.invalid || !this.eventId) {
      return;
    }

    this.subscription.add(
      this.publicAppService.createEventUser(this.eventId, this.eventUserForm.value).subscribe({
        next: (response) => {
          const redirectUrl = response?.paymentRefNo;
          this.toasterService.showSuccess('Event registration successful.');
          this.modalRef?.close();
          if (this.isBrowser && redirectUrl) {
            window.location.href = redirectUrl;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.toasterService.showError('Registration failed. Please try again.');
          this.cdr.markForCheck();
        }
      })
    );
  }

  private resolveHeroImage(resolvedEvent: any): string {
    const imageDetail = resolvedEvent?.eventDetails?.find(
      (detail: EventDetail) => detail.section === 'image'
    );
    return imageDetail?.imageUrl ?? this.bgImage;
  }

  private setEventMetadata(): void {
    if (!this.event) {
      return;
    }

    const canonicalSlug = this.event.canonicalUrl ?? '';
    const fullUrl = canonicalSlug
      ? `${environment.seoUrl}events/${canonicalSlug}`
      : `${environment.seoUrl}events`;

    const titleSection = this.event.eventDetails?.find(
      (detail: EventDetail) => detail.section === 'title'
    );
    const descriptionSection = this.event.eventDetails?.find(
      (detail: EventDetail) => detail.section === 'description'
    );
    const imageSection = this.event.eventDetails?.find(
      (detail: EventDetail) => detail.section === 'image'
    );

    const eventTitle = titleSection?.title ?? this.event.title ?? 'Event - Oilandgasclub';
    const eventDescription =
      descriptionSection?.description ??
      this.event.description ??
      'Join our upcoming oil and gas industry event';
    const eventImage = imageSection?.imageUrl ?? this.bgImage;

    this.metadataService.updateMetadata({
      title: `${eventTitle} - Oilandgasclub`,
      description: eventDescription,
      author: 'Oilandgasclub',
      type: 'event',
      image: eventImage,
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: fullUrl,
      time: this.event.startDate ?? this.event.createdOn,
      updatedTime: this.event.updatedOn,
      category: 'Oil and Gas Events, Professional Training, Industry Events',
      canonicalUrl: fullUrl
    });

    this.canonicalService.setCanonicalURL(fullUrl);

    this.structuredDataService.setEvent({
      name: eventTitle,
      description: eventDescription,
      url: fullUrl,
      image: eventImage,
      startDate: this.event.startDate ? new Date(this.event.startDate).toISOString() : '',
      endDate: this.event.endDate ? new Date(this.event.endDate).toISOString() : undefined,
      organizer: {
        name: 'Oilandgasclub',
        url: 'https://www.oilandgasclub.com'
      },
      ...(this.getEventPrice() && {
        offers: {
          price: this.getEventPrice(),
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
          url: fullUrl
        }
      })
    });

    const breadcrumbs = [
      { name: 'Home', url: environment.seoUrl },
      { name: 'Events', url: `${environment.seoUrl}events` },
      { name: eventTitle, url: fullUrl }
    ];
    this.structuredDataService.setBreadcrumbs(breadcrumbs);
  }

  private getEventPrice(): string | undefined {
    const pricingSection = this.event?.eventDetails?.find(
      (detail: EventDetail) => detail.section === 'pricing'
    );
    if (pricingSection?.amount) {
      return pricingSection.amount.toString();
    }
    return undefined;
  }
}

