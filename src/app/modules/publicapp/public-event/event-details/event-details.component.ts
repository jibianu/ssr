import { Component, DestroyRef, ElementRef, HostListener, inject, INJECTOR, OnDestroy, OnInit, PLATFORM_ID, Renderer2, ViewChild, afterNextRender, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { OwlOptions } from 'ngx-owl-carousel-o';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PublicAppService } from '../../publicapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { isPlatformBrowser } from '@angular/common';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from 'src/environments/environment';

@Component({
    selector: 'app-event-details',
    templateUrl: './event-details.component.html',
    styleUrls: ['./event-details.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
})
export class EventDetailsComponent implements OnInit, OnDestroy {

  private subscription = new Subscription();
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly metadataService = inject(MetadataService);
  private readonly canonicalService = inject(CanonicalService);
  private readonly structuredDataService = inject(StructuredDataService);
  private readonly router = inject(Router);

  constructor(
    private elRef: ElementRef, 
    private renderer: Renderer2, 
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private formBuilder: FormBuilder,
    private publicAppService: PublicAppService,
    private toasterService: ToasterService,
    private cdr: ChangeDetectorRef, // ✅ PERFORMANCE: For manual change detection trigger with OnPush
  ) {
    // FIXED: Add route.data subscription to cleanup on destroy
    this.subscription.add(
      activatedRoute.data.subscribe((data) => {
        this.event = data.event;
        this.eventId = this.event?.['id'];
        if (this.event?.eventDetails) {
          const imageItem = this.event.eventDetails.find((item: any) => item.section === 'image');
          if (imageItem?.imageUrl) {
            this.bgImage = imageItem.imageUrl;
          }
        }
        // ✅ SEO: Set metadata for SSR
        this.setEventMetadata();
        this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
      })
    );
    
    // ✅ HYDRATION: Initialize window width safely after render
    if (this.isBrowser) {
      afterNextRender(() => {
        this.windowWidth.set(window.innerWidth);
        
        // ✅ Listen for window resize events
        const resizeListener = () => {
          if (this.isBrowser) {
            this.windowWidth.set(window.innerWidth);
          }
        };
        window.addEventListener('resize', resizeListener);
        this.subscription.add(new Subscription(() => {
          window.removeEventListener('resize', resizeListener);
        }));
        
        // ✅ Defer non-critical data loading
        this.loadUpcomingEvents();
      });
    }
  }

  @ViewChild('stickySection', {static: false}) public stickySection!: ElementRef;
  @ViewChild('coursesSection', {static: false}) public coursesSection?: ElementRef;
  @ViewChild('largeText', {static: false}) public largeText?: ElementRef<HTMLElement>;
  @ViewChild('viewMoreBtn', {static: false}) public viewMoreBtn?: ElementRef<HTMLElement>;
  
  stickyTop = 0;
  
  // ✅ HYDRATION: Use signal instead of direct window access to prevent hydration mismatches
  private windowWidth = signal<number>(0);
  
  // ✅ HYDRATION: Signal for expanded state to prevent hydration issues
  isExpanded = signal(false);

  event:any;
  events:any=[];
  bgImage = 'https://img.evbuc.com/https%3A%2F%2Fcdn.evbuc.com%2Fimages%2F935098893%2F2194700540003%2F1%2Foriginal.20250114-070250?crop=focalpoint&fit=crop&w=940&auto=format%2Ccompress&q=75&sharp=10&fp-x=0.417955571955&fp-y=0.327681496879&s=ba16dfa89eb36e033ae72207acd91b33';
  desigantion = null;
  department = null;
  dropdownSettings: IDropdownSettings = {
    singleSelection: true,
    idField: 'item_id',
    textField: 'item_text',
    selectAllText: 'Select All',
    unSelectAllText: 'UnSelect All',
    itemsShowLimit: 3,
    allowSearchFilter: true
  };

  items: any[] = [];
  categories: any[] = [];
  eventId: string = '';
  modalRef: NgbModalRef | null = null;
  eventUserForm: FormGroup;
  customOptions: OwlOptions = {
    loop: false,
    mouseDrag: true,
    touchDrag: true,
    pullDrag: false,
    dots: false,
    navSpeed: 700,
    margin: 5,
    navText: ['<i class="fa fa-chevron-left fa-3x"></i>', '<i class="fa fa-chevron-right fa-3x"></i>'],
    nav: true,
    responsive: {
      0: {
        items: 1
      },
      400: {
        items: 2
      },
      740: {
        items: 3
      },
      940: {
        items: 3
      }
    },
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.isBrowser)
      return;

    // ✅ HYDRATION: Use signal instead of direct window access
    if (this.windowWidth() > 935) {
      const stickyDiv = this.stickySection.nativeElement;
      const stickySec = stickyDiv?.querySelector('.sticky-sec');
      const scrollPosition = stickyDiv?.getBoundingClientRect();
      
      // ✅ HYDRATION: Use ViewChild instead of document.getElementById
      const coursesCarousel = this.coursesSection?.nativeElement;
      if (coursesCarousel && stickySec) {
        const cPos = coursesCarousel.getBoundingClientRect().top;
        if (cPos >= this.stickyTop && cPos <= stickySec.offsetHeight) {
          this.renderer.removeClass(stickySec, 'fixed-section');
        } else {
          if ((scrollPosition?.top || 0) <= this.stickyTop) {
            this.renderer.addClass(stickySec, 'fixed-section');
          } else {
            this.renderer.removeClass(stickySec, 'fixed-section');
          }
        }
      }
    }
  }

  ngOnInit(): void {
    this.eventUserForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', Validators.required],
      mobile: ['', Validators.required],
      companyName: ['', Validators.required],
      designation: ['', Validators.required],
      department: ['', Validators.required],
      paymentRefNo: [''],
    });
    // ✅ HYDRATION: Non-critical data loading moved to afterNextRender (in constructor)
  }
  
  // ✅ HYDRATION: Deferred loading for non-critical data
  private loadUpcomingEvents(): void {
    if (!this.eventId) return;
    
    this.subscription.add(
      this.publicAppService.getUpcomingEvents(this.eventId).subscribe(res => {
        this.events = res || [];
        this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
      })
    );
  }
  getInfo(section:string):any[]{
    return this.event.eventDetails.filter((item)=>item.section===section);
  }
  sumAmount(section: string): number {
    return this.event.eventDetails.filter((item) => item.section === section)
        .reduce((acc, item) => acc + item.amount, 0);
}
getRemaining(dt: string): any {
  const eventDate = new Date(dt);
  const currentDate = new Date();
  var days = 0;
  var hours = 0;

  if (eventDate > currentDate) {
      var diff = eventDate.getTime() - currentDate.getTime();
      days = Math.floor(diff / (1000 * 60 * 60 * 24));
      hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  }
  return { days, hours };
}
getValue(section: string, title: string, key: string): any {
  return this.event.eventDetails.find((item) => item.section === section && item.title === title)?.[key] || '';
}

  openRegisterModal(longContent: any) {
    this.modalRef= this.modalService.open(longContent, { scrollable: true });
  }

  // ✅ HYDRATION: Use signal for state - template binding handles DOM updates automatically
  onViewMoreInfo() {
    if (!this.isBrowser) return;
    // ✅ Signal update automatically triggers template binding updates
    this.isExpanded.update(v => !v);
  }
  getEventDt(event:any,section:string,ix:number):any{
    return event.eventDetails.filter((item) => item.section === section)[ix];
}
  paymentProcess(): void {
    if (this.eventUserForm.invalid) {
      return;
    }
  
    // FIXED: Already using subscription.add() - good!
    this.subscription.add(this.publicAppService.createEventUser(this.eventId, this.eventUserForm.value).subscribe({
      next: (x) => {
        const url = x.paymentRefNo;
        this.toasterService.showSuccess('Event registration successfully');
        this.modalRef?.close();
        if (this.isBrowser && url) {
          window.location.href = url;
        }
        this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
      },
      error: () => {
        this.toasterService.showError('Registration failed. Please try again.');
        this.cdr.markForCheck(); // ✅ PERFORMANCE: Manual change detection trigger for OnPush
      }
    }));
  }

  /**
   * ✅ SEO: Set metadata for event details page (SSR-compatible)
   */
  private setEventMetadata(): void {
    if (!this.event) return;

    const eventUrl = this.event.canonicalUrl || '';
    const fullUrl = eventUrl ? `${environment.seoUrl}events/${eventUrl}` : `${environment.seoUrl}events`;
    const canonicalUrl = fullUrl;

    // Get event details
    const titleSection = this.event.eventDetails?.find((item: any) => item.section === 'title');
    const descriptionSection = this.event.eventDetails?.find((item: any) => item.section === 'description');
    const imageSection = this.event.eventDetails?.find((item: any) => item.section === 'image');
    
    const eventTitle = titleSection?.title || this.event.title || 'Event - Oilandgasclub';
    const eventDescription = descriptionSection?.description || this.event.description || 'Join our upcoming oil and gas industry event';
    const eventImage = imageSection?.imageUrl || this.bgImage || 'https://www.oilandgasclub.com/assets/images/og-image.jpg';

    // Set meta tags
    this.metadataService.updateMetadata({
      title: `${eventTitle} - Oilandgasclub`,
      description: eventDescription,
      author: 'Oilandgasclub',
      type: 'event',
      image: eventImage,
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: fullUrl,
      time: this.event.startDate || this.event.createdOn,
      updatedTime: this.event.updatedOn,
      category: 'Oil and Gas Events, Professional Training, Industry Events',
      canonicalUrl: canonicalUrl
    });

    this.canonicalService.setCanonicalURL(canonicalUrl);

    // ✅ SEO: Add Event structured data (JSON-LD)
    const startDate = this.event.startDate ? new Date(this.event.startDate).toISOString() : '';
    const endDate = this.event.endDate ? new Date(this.event.endDate).toISOString() : undefined;

    this.structuredDataService.setEvent({
      name: eventTitle,
      description: eventDescription,
      url: fullUrl,
      image: eventImage,
      startDate: startDate,
      endDate: endDate,
      organizer: {
        name: 'Oilandgasclub',
        url: 'https://www.oilandgasclub.com'
      },
      // Add offers if pricing information is available
      ...(this.getEventPrice() && {
        offers: {
          price: this.getEventPrice(),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: fullUrl
        }
      })
    });
  }

  /**
   * Get event price from event details
   */
  private getEventPrice(): string | undefined {
    if (!this.event?.eventDetails) return undefined;
    
    const pricingSection = this.event.eventDetails.find((item: any) => item.section === 'pricing');
    if (pricingSection?.amount) {
      return pricingSection.amount.toString();
    }
    return undefined;
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}


