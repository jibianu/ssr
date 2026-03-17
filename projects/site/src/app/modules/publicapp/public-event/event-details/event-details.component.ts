import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Inject,
  Input,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import { AuthenticationService } from '../../../auth/auth.service';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';

import { PublicAppService } from '../../publicapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { environment } from 'src/environments/environment';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { PaymentCardComponent } from '../payments/payment-card.component';

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
  @ViewChild('salarySlider', { static: false }) salarySlider?: ElementRef<HTMLDivElement>;
  @ViewChild('hostSlider', { static: false }) hostSlider?: ElementRef<HTMLDivElement>;

  /** When set (e.g. from slug-resolver), use this instead of route resolver data. */
  @Input() set resolvedEventInput(value: any) {
    if (value != null) this.applyResolvedEvent(value);
  }

  event: any = null;
  events: any[] = [];
  eventId = '';

  /** Set when user is logged in and we've called check-registration API. */
  isRegisteredForEvent = false;
  registrationCheckDone = false;

  eventUserForm!: FormGroup;
  modalRef: NgbModalRef | null = null;
  isSubmitting = false;

  // ✅ Sticky sidebar positioning state
  isSidebarFixed = true; // ✅ Start as fixed, switch to constrained when near Certificate section
  isSidebarVisible = false; // ✅ Only visible when "About this event" section is in view

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
  canScrollSalaryLeft = false;
  canScrollSalaryRight = true;
  canScrollHostLeft = false;
  canScrollHostRight = true;

  private readonly subscription = new Subscription();
  private readonly isBrowser: boolean;
  private expanded = false;
  learningExpanded = false; // ✅ Public for template access
  private testimonialScrollTimeout: any = null;
  private countdownInterval: any = null;

  openTermsAndConditions(event: Event): void {
    event.preventDefault();
    if (this.isBrowser) {
      window.open('/terms-and-conditions', '_blank');
    }
  }

  constructor(
    private readonly modalService: NgbModal,
    private readonly formBuilder: FormBuilder,
    private readonly publicAppService: PublicAppService,
    private readonly toasterService: ToasterService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    @Inject(AuthenticationService) private readonly authenticationService: AuthenticationService,
    private readonly metadataService: MetadataService,
    private readonly canonicalService: CanonicalService,
    private readonly structuredDataService: StructuredDataService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // ✅ Subscribe to route data (from resolver); skip when resolvedEventInput was set (slug-resolver)
    this.subscription.add(
      this.route.data.subscribe((data) => {
        const resolvedEvent = data?.['event'] ?? null;
        if (resolvedEvent) this.applyResolvedEvent(resolvedEvent);
      })
    );
  }

  private applyResolvedEvent(resolvedEvent: any): void {
        // ✅ FIX: Create new object reference to trigger change detection
        this.event = resolvedEvent ? { ...resolvedEvent } : null;
        this.events = resolvedEvent?.upcomingEvents ? [...(resolvedEvent.upcomingEvents)] : [];
        this.eventId = resolvedEvent?.id ?? '';
        this.isRegisteredForEvent = false;
        this.registrationCheckDone = false;
        if (this.eventId && this.isBrowser && this.authenticationService.hasValidAccessToken()) {
          this.subscription.add(
            this.publicAppService.checkEventRegistration(this.eventId).subscribe({
              next: (r) => {
                this.isRegisteredForEvent = !!r?.registered;
                this.registrationCheckDone = true;
                this.cdr.markForCheck();
              },
              error: () => {
                this.registrationCheckDone = true;
                this.cdr.markForCheck();
              }
            })
          );
        } else {
          this.registrationCheckDone = true;
        }
        
        // ✅ DEBUG: Log metaDescription to verify it's being received
        console.log('[EventDetailsComponent] Event loaded:', {
          id: resolvedEvent?.id,
          title: resolvedEvent?.title,
          metaDescription: resolvedEvent?.metaDescription,
          hasMetaDescription: !!resolvedEvent?.metaDescription,
          allEventKeys: resolvedEvent ? Object.keys(resolvedEvent) : []
        });
        
        // ✅ DEBUG: Log organizer data specifically
        if (this.isBrowser && resolvedEvent?.eventDetails) {
          const organizers = resolvedEvent.eventDetails.filter((d: EventDetail) => d.section === 'organized');
          console.log('[EventDetailsComponent] Organizers data loaded:', {
            organizerCount: organizers.length,
            organizers: organizers.map((org: EventDetail) => ({
              id: org.id,
              title: org.title,
              tag: org.tag,
              description: org.description?.substring(0, 50) + '...',
              imageUrl: org.imageUrl ? 'Has image' : 'No image',
              section: org.section
            })),
            allEventDetailsSections: resolvedEvent.eventDetails.map((d: EventDetail) => d.section),
            eventDetailsTotalCount: resolvedEvent.eventDetails.length,
            timestamp: new Date().toISOString(),
            // ✅ DEBUG: Show full eventDetails structure
            eventDetails: resolvedEvent.eventDetails.filter((d: EventDetail) => d.section === 'organized')
          });
        }
        
        this.setEventMetadata();
        this.startCountdownTimer();
        // ✅ FIX: Mark for check to trigger OnPush change detection
        // Use setTimeout to ensure this runs after Angular's change detection cycle
        if (this.isBrowser) {
          setTimeout(() => {
            this.cdr.markForCheck();
          }, 0);
        } else {
          this.cdr.markForCheck();
        }
  }

  ngOnInit(): void {
    this.eventUserForm = this.formBuilder.group({
      firstName: ['', Validators.required],
      surname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      companyName: ['', Validators.required],
      designation: ['', Validators.required],
      department: ['', Validators.required],
      newsletterUpdates: [true],
      nearbyEvents: [false],
      paymentRefNo: ['']
    }, {
      validators: this.emailMatchValidator
    });

    // ✅ FIX: Subscribe to form status changes to trigger change detection for OnPush
    this.subscription.add(
      this.eventUserForm.statusChanges.subscribe(() => {
        this.cdr.markForCheck();
      })
    );

    this.subscription.add(
      this.eventUserForm.valueChanges.subscribe(() => {
        // Trigger email match validation when email or confirmEmail changes
        if (this.eventUserForm.get('email')?.value && this.eventUserForm.get('confirmEmail')?.value) {
          this.eventUserForm.updateValueAndValidity({ emitEvent: false });
        }
        this.cdr.markForCheck();
      })
    );

    if (this.isBrowser) {
      setTimeout(() => this.updateTestimonialControls(), 0);
    }
  }

  ngAfterViewInit(): void {
    // ✅ Initial check for sidebar visibility
    if (this.isBrowser) {
      setTimeout(() => {
        this.onWindowScroll();
      }, 100);
    }
    if (this.isBrowser) {
      setTimeout(() => {
        this.updateTestimonialControls();
        this.updateHostControls();
        // #region agent log
        // Delay to ensure DOM is fully rendered
        setTimeout(() => this.debugStickyPositioning(), 100);
        // #endregion
      }, 0);
    }
  }

  // #region agent log
  private debugStickyPositioning(): void {
    const stickyEl = document.querySelector('.event-aside__sticky') as HTMLElement;
    const asideEl = document.querySelector('.event-aside') as HTMLElement;
    const bodyEl = document.querySelector('.event-body') as HTMLElement;
    const detailsEl = document.querySelector('.event-details') as HTMLElement;
    
    const logData = (msg: string, data: any, hypothesisId: string) => {
      const logEntry = {location:'event-details.component.ts',message:msg,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
      console.log(`[DEBUG ${hypothesisId}]`, msg, data);
      fetch('http://127.0.0.1:7242/ingest/8c21d979-1bc5-4e5b-9b90-47d7e4f5fcd7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logEntry)}).catch(()=>{});
    };
    
    if (stickyEl) {
      const stickyStyles = window.getComputedStyle(stickyEl);
      const asideStyles = asideEl ? window.getComputedStyle(asideEl) : null;
      const bodyStyles = bodyEl ? window.getComputedStyle(bodyEl) : null;
      const detailsStyles = detailsEl ? window.getComputedStyle(detailsEl) : null;
      
      logData('Sticky element computed styles',{position:stickyStyles.position,top:stickyStyles.top,display:stickyStyles.display,visibility:stickyStyles.visibility,overflow:stickyStyles.overflow,height:stickyStyles.height,width:stickyStyles.width,zIndex:stickyStyles.zIndex,classes:stickyEl.className,inlineStyle:stickyEl.style.cssText,windowWidth:window.innerWidth},'A');
      
      if (asideEl) {
        logData('Aside parent computed styles',{overflow:asideStyles?.overflow,position:asideStyles?.position,height:asideStyles?.height,display:asideStyles?.display},'B');
      }
      
      if (bodyEl) {
        logData('Event-body parent computed styles',{overflow:bodyStyles?.overflow,position:bodyStyles?.position,height:bodyStyles?.height,display:bodyStyles?.display,gridTemplateColumns:bodyStyles?.gridTemplateColumns},'C');
      }
      
      if (detailsEl) {
        logData('Event-details root computed styles',{overflow:detailsStyles?.overflow,position:detailsStyles?.position,height:detailsStyles?.height},'D');
      }
      
      const rect = stickyEl.getBoundingClientRect();
      logData('Sticky element bounding rect',{top:rect.top,left:rect.left,width:rect.width,height:rect.height,windowScrollY:window.scrollY,windowInnerHeight:window.innerHeight},'E');
      
      const isVisible = stickyEl.offsetParent !== null && stickyStyles.display !== 'none' && stickyStyles.visibility !== 'hidden';
      logData('Sticky element visibility check',{isVisible,offsetParent:stickyEl.offsetParent !== null,display:stickyStyles.display,visibility:stickyStyles.visibility,hasDNone:stickyEl.classList.contains('d-none'),hasDLgBlock:stickyEl.classList.contains('d-lg-block'),windowWidth:window.innerWidth},'F');
    } else {
      logData('Sticky element not found',{},'G');
    }
    
    let scrollCheckCount = 0;
    const scrollCheck = () => {
      if (scrollCheckCount++ < 5 && stickyEl) {
        const rect = stickyEl.getBoundingClientRect();
        const styles = window.getComputedStyle(stickyEl);
        logData('Scroll check',{scrollY:window.scrollY,stickyTop:rect.top,computedPosition:styles.position,computedTop:styles.top,checkNumber:scrollCheckCount},'H');
      }
    };
    window.addEventListener('scroll', scrollCheck, { once: false, passive: true });
    setTimeout(() => window.removeEventListener('scroll', scrollCheck), 10000);
  }
  // #endregion

  ngOnDestroy(): void {
    if (this.testimonialScrollTimeout) {
      clearTimeout(this.testimonialScrollTimeout);
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.subscription.unsubscribe();
  }

  // ✅ FIX: Start countdown timer to update countdown every second
  startCountdownTimer(): void {
    // Clear existing interval if any
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // Only start timer if event has a start date and we're in browser
    if (!this.isBrowser || !this.event?.startDate) {
      return;
    }

    // Update countdown every second (1000ms) for real-time updates
    this.countdownInterval = setInterval(() => {
      // Check if event has passed
      const startDate = new Date(this.event.startDate);
      const now = new Date();
      
      // Stop timer if event has started
      if (startDate <= now) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }
      
      // Trigger change detection to update countdown display
      this.cdr.markForCheck();
    }, 1000); // Update every 1 second for real-time countdown

    // Also update immediately for first render
    this.cdr.markForCheck();
  }

  getInfo(section: string): EventDetail[] {
    const result = this.event?.eventDetails?.filter((detail: EventDetail) => detail.section === section) ?? [];
    // ✅ DEBUG: Log social links specifically
    if (section === 'organized_soc' && this.isBrowser) {
      console.log('[EventDetailsComponent] Social links debug:', {
        section,
        eventDetailsLength: this.event?.eventDetails?.length || 0,
        allSections: this.event?.eventDetails?.map((d: EventDetail) => d.section) || [],
        organizedSocItems: result,
        resultLength: result.length,
        eventId: this.event?.id,
        // Show all eventDetails for debugging
        allEventDetails: this.event?.eventDetails?.filter((d: EventDetail) => 
          d.section?.toLowerCase().includes('soc') || 
          d.section?.toLowerCase().includes('social') ||
          d.section?.toLowerCase().includes('organiz')
        ) || []
      });
    }
    // ✅ DEBUG: Log organizers specifically
    if (section === 'organized' && this.isBrowser) {
      console.log('[EventDetailsComponent] Organizers debug:', {
        section,
        eventDetailsLength: this.event?.eventDetails?.length || 0,
        allSections: this.event?.eventDetails?.map((d: EventDetail) => d.section) || [],
        organizerItems: result,
        resultLength: result.length,
        eventId: this.event?.id,
        organizerDetails: result.map((org: EventDetail) => ({
          id: org.id,
          title: org.title,
          tag: org.tag,
          description: org.description?.substring(0, 50) + '...',
          imageUrl: org.imageUrl ? 'Has image' : 'No image'
        }))
      });
    }
    // ✅ FIX: Filter out empty social links (where both title and tag are empty)
    if (section === 'organized_soc' || section?.startsWith('organized_soc_')) {
      return result.filter((detail: EventDetail) => 
        detail.title && detail.title.trim() !== '' && 
        detail.tag && detail.tag.trim() !== ''
      );
    }
    return result;
  }

  // ✅ NEW: Get social links for a specific organizer by index
  getOrganizerSocialLinks(organizerIndex: number): EventDetail[] {
    // Try new format first: organized_soc_0, organized_soc_1, etc.
    const newFormatSection = `organized_soc_${organizerIndex}`;
    const newFormatLinks = this.getInfo(newFormatSection);
    
    if (newFormatLinks.length > 0) {
      return newFormatLinks;
    }
    
    // Fallback to old format: organized_soc (shared across all organizers)
    // Only return for first organizer to avoid duplication
    if (organizerIndex === 0) {
      return this.getInfo('organized_soc');
    }
    
    return [];
  }

  // ✅ Get learning items - limit to 3 initially, show all when expanded
  getLearningItems(): EventDetail[] {
    const items = this.getInfo('curriculum');
    if (items.length <= 3 || this.learningExpanded) {
      return items;
    }
    return items.slice(0, 3);
  }

  // ✅ Check if there are more than 3 learning items
  hasMoreLearningItems(): boolean {
    return this.getInfo('curriculum').length > 3;
  }

  // ✅ Toggle learning items expansion
  toggleLearningExpansion(): void {
    this.learningExpanded = !this.learningExpanded;
    this.cdr.markForCheck();
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

  getTimeRemaining(startDate: string | Date | null): string {
    if (!startDate) {
      return '00:00';
    }
    const start = new Date(startDate);
    const now = new Date();
    if (start <= now) {
      return '00:00';
    }
    const diff = start.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  emailMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const email = group.get('email')?.value;
    const confirmEmail = group.get('confirmEmail')?.value;
    if (email && confirmEmail && email !== confirmEmail) {
      const confirmEmailControl = group.get('confirmEmail');
      if (confirmEmailControl) {
        confirmEmailControl.setErrors({ emailMismatch: true });
      }
      return { emailMismatch: true };
    } else if (email && confirmEmail && email === confirmEmail) {
      const confirmEmailControl = group.get('confirmEmail');
      if (confirmEmailControl && confirmEmailControl.hasError('emailMismatch')) {
        confirmEmailControl.setErrors(null);
        confirmEmailControl.updateValueAndValidity({ emitEvent: false });
      }
    }
    return null;
  }

  getValue(section: string, title: string, key: string): any {
    return this.event?.eventDetails?.find(
      (detail: EventDetail) => detail.section === section && detail.title === title
    )?.[key] ?? '';
  }

  getEventDt(event: any, section: string, index: number): EventDetail | undefined {
    return event?.eventDetails?.filter((detail: EventDetail) => detail.section === section)?.[index];
  }

  /** Price text for sidebar: "₹200 onwards" or "Free". */
  getEventPriceText(): string {
    const amount = this.event?.amount ?? this.event?.Amount ?? 0;
    if (amount == null || amount === 0) return 'Free';
    const num = Number(amount);
    const discount = this.event?.discount ?? this.event?.Discount ?? 0;
    const final = num - Number(discount);
    const display = final > 0 ? final : num;
    return '₹' + display.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' onwards';
  }

  /** Redirect to elearn event checkout. If not logged in on elearn, user will see login then checkout. */
  goToEventCheckout(): void {
    if (this.event?.isEnded) return;
    const id = this.event?.id ?? this.eventId;
    if (!id) return;
    const base = (environment as { elearnAppUrl?: string }).elearnAppUrl || '';
    const url = (base.replace(/\/$/, '') + '/checkout/event/' + id);
    if (this.isBrowser && typeof window !== 'undefined') {
      window.location.href = url;
    }
  }

  openRegisterModal(content: any): void {
    if (!this.authenticationService.hasValidAccessToken()) {
      // Pass full URL so elearn login can redirect back to this site page (avoids 404 on elearn's /events/...)
      const returnUrl = this.isBrowser && typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin + this.router.url
        : this.router.url;
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    if (this.isRegisteredForEvent) {
      this.toasterService.showSuccess('You are already registered for this event.');
      return;
    }
    console.log('Opening registration modal...', { content, event: this.event });
    
    // Reset form when opening modal - but don't disable it
    this.eventUserForm.reset({
      firstName: '',
      surname: '',
      email: '',
      confirmEmail: '',
      mobile: '',
      companyName: '',
      designation: '',
      department: '',
      newsletterUpdates: true,
      nearbyEvents: false,
      paymentRefNo: ''
    });
    this.isSubmitting = false;
    
    // Enable all form controls to ensure they're interactive
    Object.keys(this.eventUserForm.controls).forEach(key => {
      const control = this.eventUserForm.get(key);
      if (control) {
        control.enable(); // Ensure control is enabled
        control.updateValueAndValidity();
      }
    });
    
    // ✅ FIX: Trigger change detection after form reset for OnPush
    this.cdr.markForCheck();
    
    // Open modal with proper configuration
    try {
      this.modalRef = this.modalService.open(content, { 
        scrollable: true,
        backdrop: 'static',
        keyboard: true, // Allow ESC key to close
        size: 'lg', // Large modal size
        windowClass: 'event-registration-modal', // Custom class for styling
        centered: true, // Center the modal
        animation: true // Enable animations
      });
      
      console.log('Modal opened:', this.modalRef);
      
      // Ensure form is interactive after modal opens
      // Use longer timeout to ensure ng-bootstrap has finished setting inline styles
      setTimeout(() => {
        // ✅ FIX: Remove inline z-index: 1055 that blocks Register functionality
        // ng-bootstrap sets this inline style which interferes with form interactions
        if (this.isBrowser) {
          // Find the modal element by class name
          const modalElement = document.querySelector('.event-registration-modal.show') as HTMLElement;
          if (modalElement) {
            // Remove the inline z-index style that blocks interactions
            const currentZIndex = modalElement.style.zIndex || window.getComputedStyle(modalElement).zIndex;
            if (currentZIndex === '1055' || modalElement.getAttribute('style')?.includes('z-index: 1055')) {
              modalElement.style.removeProperty('z-index');
              console.log('✅ Removed blocking z-index: 1055 from modal element');
            }
            
            // Ensure modal content is accessible
            const modalContent = modalElement.querySelector('.modal-content') as HTMLElement;
            if (modalContent) {
              modalContent.style.pointerEvents = 'auto';
              modalContent.style.overflow = 'visible';
              modalContent.style.position = 'relative';
            }
            
            // Ensure modal body can scroll properly
            const modalBody = modalElement.querySelector('.modal-body') as HTMLElement;
            if (modalBody) {
              modalBody.style.overflowY = 'auto';
              modalBody.style.overflowX = 'hidden';
              modalBody.style.pointerEvents = 'auto';
              modalBody.style.zIndex = '2';
              modalBody.style.position = 'relative';
              modalBody.style.touchAction = 'auto';
              // Use setProperty for webkit prefix
              modalBody.style.setProperty('-webkit-overflow-scrolling', 'touch');
              modalBody.style.maxHeight = 'calc(90vh - 200px)';
              modalBody.style.flex = '1 1 auto';
              modalBody.style.minHeight = '0';
              console.log('✅ Configured modal body for scrolling');
            }
            
            // Ensure form elements are accessible
            const formElements = modalElement.querySelectorAll('input, select, textarea, button');
            formElements.forEach((el: any) => {
              el.style.pointerEvents = 'auto';
              el.style.zIndex = '11';
              el.style.position = 'relative';
            });
            
            // Also check and remove from modal-dialog if present
            const modalDialog = modalElement.querySelector('.modal-dialog') as HTMLElement;
            if (modalDialog) {
              if (modalDialog.style.zIndex === '1055' || modalDialog.getAttribute('style')?.includes('z-index: 1055')) {
                modalDialog.style.removeProperty('z-index');
                console.log('✅ Removed blocking z-index from modal-dialog');
              }
              // Ensure dialog allows scrolling
              modalDialog.style.overflow = 'hidden';
              modalDialog.style.display = 'flex';
              modalDialog.style.flexDirection = 'column';
              modalDialog.style.maxHeight = '90vh';
            }
            
            // Ensure backdrop is below modal (z-index 1040)
            const backdrop = document.querySelector('.modal-backdrop.show') as HTMLElement;
            if (backdrop) {
              backdrop.style.zIndex = '1040';
              backdrop.style.pointerEvents = 'auto'; // Allow backdrop clicks
            }
          }
        }
        
        this.cdr.markForCheck();
        // Verify form controls are enabled
        console.log('Form controls state:', {
          firstName: this.eventUserForm.get('firstName')?.enabled,
          surname: this.eventUserForm.get('surname')?.enabled,
          email: this.eventUserForm.get('email')?.enabled,
          confirmEmail: this.eventUserForm.get('confirmEmail')?.enabled,
          mobile: this.eventUserForm.get('mobile')?.enabled
        });
      }, 200); // Increased timeout to ensure ng-bootstrap finishes setting styles // Increased timeout to ensure modal is fully rendered
      
      // Reset form when modal is dismissed
      this.modalRef.result.finally(() => {
        this.eventUserForm.reset();
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }).catch(() => {
        // Handle dismissal (user clicked outside or ESC)
        this.eventUserForm.reset();
        this.isSubmitting = false;
        this.cdr.markForCheck();
      });
    } catch (error) {
      console.error('Error opening modal:', error);
      this.toasterService.showError('Unable to open registration form. Please try again.');
    }
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

  // ✅ Helper method for tracking organizers (same as trackByOrganizerId but clearer name)
  trackByHostId(index: number, host: EventDetail): string {
    return host?.id ?? index.toString();
  }

  trackBySocialId(index: number, item: EventDetail): string {
    return item?.id ?? index.toString();
  }

  // ✅ Helper method to get social media icon class
  getSocialIcon(platform: string): string {
    const platformLower = platform?.toLowerCase() || '';
    if (platformLower.includes('linkedin')) {
      return 'fa-linkedin';
    } else if (platformLower.includes('twitter') || platformLower.includes('x')) {
      return 'fa-twitter';
    } else if (platformLower.includes('facebook')) {
      return 'fa-facebook';
    } else if (platformLower.includes('instagram')) {
      return 'fa-instagram';
    } else if (platformLower.includes('youtube')) {
      return 'fa-youtube';
    } else if (platformLower.includes('github')) {
      return 'fa-github';
    }
    return 'fa-link'; // Default icon
  }

  // ✅ Helper method to format social link URL
  getSocialUrl(social: EventDetail): string {
    // Check multiple fields: title (URL field in admin form), description (fallback), or tag (if URL was mistakenly saved there)
    const url = social?.title || social?.description || '';
    if (!url || url.trim() === '') {
      console.warn('[EventDetailsComponent] Social link URL is empty:', social);
      return '#';
    }
    const trimmedUrl = url.trim();
    // If URL doesn't start with http:// or https://, add https://
    if (!trimmedUrl.match(/^https?:\/\//i)) {
      return `https://${trimmedUrl}`;
    }
    return trimmedUrl;
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

  scrollSalary(direction: 1 | -1): void {
    if (!this.isBrowser || !this.salarySlider) {
      return;
    }

    const slider = this.salarySlider.nativeElement;
    const sampleCard = slider.querySelector<HTMLElement>('.salary-card');
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

    this.testimonialScrollTimeout = setTimeout(() => this.updateSalaryControls(), 320);
  }

  updateSalaryControls(): void {
    if (!this.isBrowser || !this.salarySlider) {
      this.canScrollSalaryLeft = false;
      this.canScrollSalaryRight = false;
      return;
    }

    const slider = this.salarySlider.nativeElement;
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth - 1;
    this.canScrollSalaryLeft = slider.scrollLeft > 1;
    this.canScrollSalaryRight = slider.scrollLeft < maxScrollLeft;
    this.cdr.markForCheck();
  }

  // ✅ Host Slider Methods - Full width cards
  scrollHost(direction: 1 | -1): void {
    if (!this.isBrowser || !this.hostSlider) {
      return;
    }

    const slider = this.hostSlider.nativeElement;
    // For full-width cards, scroll by the full container width
    const distance = slider.clientWidth;

    slider.scrollTo({
      left: slider.scrollLeft + direction * distance,
      behavior: 'smooth'
    });

    if (this.testimonialScrollTimeout) {
      clearTimeout(this.testimonialScrollTimeout);
    }

    this.testimonialScrollTimeout = setTimeout(() => this.updateHostControls(), 320);
  }

  updateHostControls(): void {
    if (!this.isBrowser || !this.hostSlider) {
      this.canScrollHostLeft = false;
      this.canScrollHostRight = false;
      return;
    }

    const slider = this.hostSlider.nativeElement;
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth - 1;
    this.canScrollHostLeft = slider.scrollLeft > 1;
    this.canScrollHostRight = slider.scrollLeft < maxScrollLeft;
    this.cdr.markForCheck();
  }

  paymentProcess(): void {
    // Prevent multiple submissions
    if (this.isSubmitting) {
      return;
    }

    // Mark all fields as touched to show validation errors
    if (this.eventUserForm.invalid) {
      Object.keys(this.eventUserForm.controls).forEach(key => {
        const control = this.eventUserForm.get(key);
        if (control) {
          control.markAsTouched();
          control.updateValueAndValidity();
        }
      });
      this.toasterService.showError('Please fill in all required fields correctly.');
      this.cdr.markForCheck();
      return;
    }

    if (!this.eventId || this.eventId.trim() === '') {
      console.error('Event ID is missing or empty:', this.eventId);
      this.toasterService.showError('Event information is missing. Please refresh the page.');
      this.cdr.markForCheck();
      return;
    }

    const firstName = this.eventUserForm.get('firstName')?.value?.trim() || '';
    const surname = this.eventUserForm.get('surname')?.value?.trim() || '';
    const email = this.eventUserForm.get('email')?.value?.trim() || '';
    const mobile = this.eventUserForm.get('mobile')?.value?.trim() || '';
    const companyName = this.eventUserForm.get('companyName')?.value?.trim() || '';
    const designation = this.eventUserForm.get('designation')?.value?.trim() || '';
    const department = this.eventUserForm.get('department')?.value?.trim() || '';
    const name = `${firstName} ${surname}`.trim();

    // Validate required fields
    if (!name || !email || !mobile || !companyName || !designation || !department) {
      this.toasterService.showError('Please fill in all required fields correctly.');
      this.cdr.markForCheck();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.eventUserForm.get('email')?.setErrors({ 'email': true });
      this.eventUserForm.get('email')?.markAsTouched();
      this.toasterService.showError('Please enter a valid email address.');
      this.cdr.markForCheck();
      return;
    }

    // New auth flow: logged-in user → register API then free enroll or Stripe checkout
    if (this.authenticationService.hasValidAccessToken()) {
      this.isSubmitting = true;
      this.cdr.markForCheck();
      const body = { name, email, mobile, companyName, designation, department };
      this.subscription.add(
        this.publicAppService.registerForEvent(this.eventId, body).subscribe({
          next: (res) => {
            if (res.enrolled) {
              this.isRegisteredForEvent = true;
              if (this.modalRef) {
                this.modalRef.close();
                this.modalRef = null;
              }
              this.toasterService.showSuccess(res.message || 'Registration completed.');
              this.isSubmitting = false;
              this.cdr.markForCheck();
              return;
            }
            if (res.needPayment) {
              this.subscription.add(
                this.publicAppService.createEventCheckoutSession(this.eventId).subscribe({
                  next: (checkout) => {
                    const url = checkout?.paymentUrl;
                    if (url && this.isBrowser) {
                      if (this.modalRef) {
                        this.modalRef.close();
                        this.modalRef = null;
                      }
                      window.location.href = url;
                    } else {
                      this.toasterService.showError('Payment link not available.');
                      this.isSubmitting = false;
                      this.cdr.markForCheck();
                    }
                  },
                  error: (err) => {
                    this.toasterService.showError(err?.error?.message || 'Could not create checkout.');
                    this.isSubmitting = false;
                    this.cdr.markForCheck();
                  }
                })
              );
              return;
            }
            this.isSubmitting = false;
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.toasterService.showError(err?.error?.message || 'Registration failed.');
            this.isSubmitting = false;
            this.cdr.markForCheck();
          }
        })
      );
      return;
    }

    // Legacy PhonePe flow (unauthenticated or fallback): createEventUser
    const formData = {
      Name: name,
      Email: email,
      Mobile: mobile,
      CompanyName: companyName,
      Designation: designation,
      Department: department,
      PaymentRefNo: ''
    };
    this.isSubmitting = true;
    this.cdr.markForCheck();
    console.log('Submitting registration (legacy):', { eventId: this.eventId, formData });

    this.subscription.add(
      this.publicAppService.createEventUser(this.eventId, formData).subscribe({
        next: (response) => {
          // ✅ REGISTRATION SUCCESS: Data is saved to backend
          console.log('✅ Registration response received:', response);
          console.log('✅ Registration saved successfully - ID:', response?.id || response?.Id);
          console.log('✅ Full response object:', JSON.stringify(response, null, 2));
          console.log('✅ Response type:', typeof response);
          console.log('✅ Response keys:', response ? Object.keys(response) : 'null');
          
          // Check for paymentRefNo property existence
          const hasPaymentRefNoProperty = response && ('paymentRefNo' in response || 'PaymentRefNo' in response);
          const paymentRefNoValue = response?.paymentRefNo ?? response?.PaymentRefNo;
          
          console.log('✅ Response has paymentRefNo property?', hasPaymentRefNoProperty);
          console.log('✅ paymentRefNo value:', paymentRefNoValue);
          console.log('✅ PaymentRefNo value:', response?.PaymentRefNo);
          
          // Log registration details for debugging
          if (response) {
            console.log('✅ Registration details:', {
              id: response.id || response.Id,
              name: response.name || response.Name,
              email: response.email || response.Email,
              mobile: response.mobile || response.Mobile,
              hasPaymentRefNo: hasPaymentRefNoProperty,
              paymentRefNoValue: paymentRefNoValue
            });
          }
          
          // Backend returns EventUserResponse with paymentRefNo property (camelCase in JSON)
          // Backend code: x.PaymentRefNo = payUrl; (PascalCase in C#, camelCase in JSON)
          // If PhonePe API fails, payUrl is null and PaymentRefNo might be null or missing from JSON
          // Check multiple possible response structures with explicit validation
          let redirectUrl: string | null = null;
          
          // Try camelCase first (standard JSON from .NET)
          if (response?.paymentRefNo && typeof response.paymentRefNo === 'string' && response.paymentRefNo.trim() !== '' && response.paymentRefNo !== 'null') {
            redirectUrl = response.paymentRefNo.trim();
            console.log('✅ Found paymentRefNo (camelCase):', redirectUrl);
          }
          // Try PascalCase (if backend doesn't convert)
          else if (response?.PaymentRefNo && typeof response.PaymentRefNo === 'string' && response.PaymentRefNo.trim() !== '' && response.PaymentRefNo !== 'null') {
            redirectUrl = response.PaymentRefNo.trim();
            console.log('✅ Found PaymentRefNo (PascalCase):', redirectUrl);
          }
          // Try nested data structure
          else if (response?.data?.paymentRefNo && typeof response.data.paymentRefNo === 'string' && response.data.paymentRefNo.trim() !== '' && response.data.paymentRefNo !== 'null') {
            redirectUrl = response.data.paymentRefNo.trim();
            console.log('✅ Found data.paymentRefNo:', redirectUrl);
          }
          else if (response?.data?.PaymentRefNo && typeof response.data.PaymentRefNo === 'string' && response.data.PaymentRefNo.trim() !== '' && response.data.PaymentRefNo !== 'null') {
            redirectUrl = response.data.PaymentRefNo.trim();
            console.log('✅ Found data.PaymentRefNo:', redirectUrl);
          }
          // Try alternative property names
          else if (response?.paymentUrl && typeof response.paymentUrl === 'string' && response.paymentUrl.trim() !== '' && response.paymentUrl !== 'null') {
            redirectUrl = response.paymentUrl.trim();
            console.log('✅ Found paymentUrl:', redirectUrl);
          }
          else if (response?.paymentRefNoUrl && typeof response.paymentRefNoUrl === 'string' && response.paymentRefNoUrl.trim() !== '' && response.paymentRefNoUrl !== 'null') {
            redirectUrl = response.paymentRefNoUrl.trim();
            console.log('✅ Found paymentRefNoUrl:', redirectUrl);
          }
          
          // Check if PhonePe API failed
          // Case 1: paymentRefNo property exists but is null/undefined
          // Case 2: paymentRefNo property doesn't exist at all (backend didn't set it)
          const phonePeFailed = hasPaymentRefNoProperty && (
            paymentRefNoValue === null || 
            paymentRefNoValue === undefined ||
            paymentRefNoValue === 'null' ||
            paymentRefNoValue === ''
          );
          
          if (!redirectUrl) {
            if (phonePeFailed) {
              // PhonePe API failed - log as warning (not error) since we handle it gracefully
              if (!hasPaymentRefNoProperty) {
                console.warn('⚠️ PhonePe API failure: paymentRefNo property is missing from response');
                console.info('ℹ️ Registration was saved successfully, but payment gateway initialization failed');
              } else {
                console.warn('⚠️ PhonePe API failure: paymentRefNo is null/undefined/empty');
                console.info('ℹ️ Registration was saved successfully, but payment gateway initialization failed');
              }
            } else {
              console.warn('⚠️ No payment URL found in any expected property');
              console.warn('⚠️ This may indicate PhonePe API failure or backend error');
            }
          }
          
          this.isSubmitting = false;
          
          console.log('🔍 Payment redirect URL extracted:', redirectUrl);
          console.log('🔍 Response paymentRefNo (camelCase):', response?.paymentRefNo);
          console.log('🔍 Response PaymentRefNo (PascalCase):', response?.PaymentRefNo);
          console.log('🔍 Response data:', response?.data);
          console.log('🔍 Is browser:', this.isBrowser);
          console.log('🔍 Redirect URL type:', typeof redirectUrl);
          console.log('🔍 Redirect URL value:', redirectUrl);
          console.log('🔍 Redirect URL length:', redirectUrl ? redirectUrl.length : 0);
          console.log('🔍 Is redirect URL empty string?', redirectUrl === '');
          console.log('🔍 Is redirect URL null?', redirectUrl === null);
          console.log('🔍 Is redirect URL undefined?', redirectUrl === undefined);
          
          // Always redirect to payment page if URL is available - AUTOMATIC OPENING
          // Check for valid URL string (not null, not undefined, not empty, not 'null' string)
          const isValidRedirectUrl = redirectUrl && 
                                    typeof redirectUrl === 'string' && 
                                    redirectUrl.trim() !== '' && 
                                    redirectUrl.trim().toLowerCase() !== 'null' &&
                                    redirectUrl.trim().toLowerCase() !== 'undefined';
          
          console.log('🔍 Is valid redirect URL?', isValidRedirectUrl);
          console.log('🔍 Redirect URL validation details:', {
            exists: !!redirectUrl,
            isString: typeof redirectUrl === 'string',
            notEmpty: redirectUrl ? redirectUrl.trim() !== '' : false,
            notNullString: redirectUrl ? redirectUrl.trim().toLowerCase() !== 'null' : false,
            notUndefinedString: redirectUrl ? redirectUrl.trim().toLowerCase() !== 'undefined' : false
          });
          
          if (isValidRedirectUrl) {
            console.log('✅ Valid payment URL found, opening payment page automatically...');
            console.log('✅ Payment URL:', redirectUrl);
            
            this.toasterService.showSuccess('Registration successful! Opening payment page...');
            
            // Validate URL format first
            let isValidUrl = false;
            try {
              new URL(redirectUrl);
              isValidUrl = true;
              console.log('✅ URL format is valid');
            } catch (urlError) {
              console.error('❌ Invalid URL format:', redirectUrl);
              this.toasterService.showError('Invalid payment URL format. Please contact support.');
              return;
            }
            
            // Close registration modal first
            if (this.modalRef) {
              console.log('✅ Closing registration modal...');
              this.modalRef.close();
              this.modalRef = null;
            }
            
            // Reset form
            this.eventUserForm.reset({
              firstName: '',
              surname: '',
              email: '',
              confirmEmail: '',
              mobile: '',
              companyName: '',
              designation: '',
              department: '',
              newsletterUpdates: true,
              nearbyEvents: false,
              paymentRefNo: ''
            });
            
            // Get registration ID (entityId) for payment callback
            const registrationId = response?.id || response?.Id || '';
            
            // Store registration info for payment callback verification
            if (registrationId && this.isBrowser) {
              // Store in sessionStorage for payment verification
              sessionStorage.setItem('lastRegistrationId', registrationId);
              sessionStorage.setItem('lastEventId', this.eventId);
            }
            
            // Redirect directly to PhonePe payment gateway
            // PhonePe will handle the payment UI and redirect back to success/error pages
            // Backend sets redirectUrl to: /events/payment/success?entityId={registrationId}
            if (isValidUrl && this.isBrowser) {
              console.log('🚀 Redirecting to PhonePe payment gateway...');
              console.log('🚀 Payment URL:', redirectUrl);
              console.log('🚀 Registration ID:', registrationId);
              console.log('🚀 Event ID:', this.eventId);
              
              // Close registration modal first
            if (this.modalRef) {
              this.modalRef.close();
              this.modalRef = null;
            }
              
              // Small delay to ensure modal closes before redirect
              setTimeout(() => {
                // Redirect to PhonePe payment gateway
                // PhonePe will redirect back to /events/payment/success?entityId={registrationId} on success
                // or /events/payment/error?entityId={registrationId} on failure
                try {
                  // Use window.location.href for full page redirect (PhonePe requirement)
                  window.location.href = redirectUrl;
                } catch (redirectError) {
                  console.error('❌ Redirect error:', redirectError);
                  // Fallback methods
                  try {
                    window.location.assign(redirectUrl);
                  } catch (e1) {
                    try {
                      window.location.replace(redirectUrl);
                    } catch (e2) {
                      // Last resort: open in new window
                      const paymentWindow = window.open(redirectUrl, '_blank');
                      if (!paymentWindow) {
                        this.toasterService.showError('Please allow popups to complete payment, or visit: ' + redirectUrl);
                      }
                    }
                  }
                }
              }, 200);
            } else if (!this.isBrowser) {
              console.warn('⚠️ Not in browser environment, cannot redirect to payment gateway');
              this.toasterService.showError('Payment gateway is not available in this environment.');
            }
          } else {
            // No valid payment URL - log as warning (not error) since we handle it gracefully
            console.warn('⚠️ No valid payment URL received from backend');
            console.info('ℹ️ Response structure:', {
              paymentRefNo: response?.paymentRefNo,
              PaymentRefNo: response?.PaymentRefNo,
              hasId: 'id' in (response || {}),
              hasEmail: 'email' in (response || {}),
              hasName: 'name' in (response || {}),
              responseKeys: response ? Object.keys(response) : [],
              responseType: typeof response
            });
            
            // Check if backend returned null/missing payment URL (PhonePe API might have failed)
            // Property might be missing (undefined) or explicitly null
            const hasPaymentRefNoProperty = response && ('paymentRefNo' in response || 'PaymentRefNo' in response);
            const paymentRefNoValue = response?.paymentRefNo ?? response?.PaymentRefNo;
            
            // PhonePe failure if:
            // 1. Property exists but is null/undefined/empty
            // 2. Property doesn't exist at all (backend didn't set it due to PhonePe failure)
            const isPhonePeFailure = (hasPaymentRefNoProperty && (
              paymentRefNoValue === null || 
              paymentRefNoValue === undefined ||
              paymentRefNoValue === 'null' ||
              paymentRefNoValue === ''
            )) || (!hasPaymentRefNoProperty && response); // Response exists but paymentRefNo property is missing
            
            if (isPhonePeFailure) {
              // PhonePe API failed during registration - try to initiate payment separately
              const registrationId = response?.id || response?.Id || '';
              
              console.warn('⚠️ PhonePe API failed during registration - attempting separate payment initiation');
              console.info('ℹ️ Registration ID:', registrationId);
              console.info('ℹ️ Event ID:', this.eventId);
              
              if (registrationId && this.eventId) {
                // Try to initiate payment separately using the new endpoint
                console.log('🔄 Attempting to initiate payment separately...');
                this.toasterService.showSuccess('Registration saved! Initiating payment...');
                
                this.subscription.add(
                  this.publicAppService.initiatePayment(this.eventId, registrationId).subscribe({
                    next: (paymentResponse) => {
                      console.log('🔄 Payment initiation response received:', paymentResponse);
                      
                      const retryPaymentUrl = paymentResponse?.paymentUrl || paymentResponse?.paymentRefNo;
                      
                      if (retryPaymentUrl && retryPaymentUrl !== null && retryPaymentUrl !== 'null' && retryPaymentUrl.trim() !== '') {
                        console.log('✅ Payment URL obtained from separate initiation:', retryPaymentUrl);
                        // Use the payment URL from separate initiation
                        this.openPaymentCard(retryPaymentUrl, registrationId);
                      } else {
                        console.warn('⚠️ Separate payment initiation also failed - no payment URL in response');
                        console.warn('⚠️ Payment response:', paymentResponse);
                        this.handlePaymentFailure(response, registrationId, 'Payment gateway initialization failed - PhonePe API returned null');
                      }
                    },
                    error: (paymentError) => {
                      console.error('❌ Error initiating payment separately:', paymentError);
                      console.error('❌ Error details:', {
                        status: paymentError?.status,
                        message: paymentError?.error?.message,
                        errorType: paymentError?.error?.errorType,
                        errorBody: paymentError?.error
                      });
                      
                      // Extract error message from backend
                      const errorMessage = paymentError?.error?.message || paymentError?.message || 'Payment gateway initialization failed';
                      this.handlePaymentFailure(response, registrationId, errorMessage);
                    }
                  })
                );
              } else {
                console.error('❌ Cannot initiate payment separately - missing registration ID or event ID');
                this.handlePaymentFailure(response, registrationId);
              }
              
            } else {
              // Unknown error - payment URL not found
              console.error('❌ Unknown error - payment URL not found in response');
              const registrationId = response?.id || response?.Id || '';
              this.handlePaymentFailure(response, registrationId);
            }
          }
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Registration error details:', {
            error: error,
            status: error?.status,
            statusText: error?.statusText,
            message: error?.error?.message || error?.message,
            errorBody: error?.error,
            eventId: this.eventId,
            formData: formData
          });
          
          let errorMessage = 'Registration failed. Please try again.';
          
          if (error?.error) {
            // Try to get error message from different possible locations
            if (typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.error?.error) {
              errorMessage = error.error.error;
            }
          } else if (error?.message) {
            errorMessage = error.message;
          }
          
          // Handle specific HTTP status codes
          if (error?.status === 0) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (error?.status === 400) {
            errorMessage = errorMessage || 'Invalid data provided. Please check your information.';
          } else if (error?.status === 404) {
            errorMessage = 'Event not found. Please refresh the page.';
          } else if (error?.status === 500) {
            errorMessage = errorMessage || 'Server error. Please try again later.';
          }
          
          // Don't close modal on error - let user retry
          this.toasterService.showError(errorMessage);
          this.cdr.markForCheck();
        }
      })
    );
  }

  /**
   * Get logo URL - tries multiple S3 paths, falls back to local asset
   */
  getLogoUrl(): string {
    // Try S3 URL paths (multiple possible locations)
    const s3Paths = [
      'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg',
      'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/Logo/oilandgas_club.svg',
      'https://course-oilandgas.s3.ap-northeast-1.amazonaws.com/oilandgas_club.svg',
      'https://courseoilandgasbucket.s3.ap-northeast-1.amazonaws.com/logo/oilandgas_club.svg'
    ];
    
    // Return first S3 path (browser will handle fallback via onLogoError)
    return s3Paths[0];
  }

  /**
   * Handle logo loading errors - fallback to local asset
   */
  onLogoError(event: any): void {
    const target = event.target as HTMLImageElement;
    const currentSrc = target.src;
    
    // If S3 URL failed, try local asset
    if (currentSrc && currentSrc.includes('s3.ap-northeast-1.amazonaws.com')) {
      target.src = 'assets/s3/oilandgas_club.svg';
    }
  }

  /**
   * Get event image URL from eventDetails array or fallback to event properties
   * Event images are stored in eventDetails array with section === 'image'
   * Same logic as events.component for consistency - no static fallback
   */
  getEventImage(event?: any): string {
    const eventToCheck = event || this.event;
    if (!eventToCheck) {
      return ''; // Return empty string if no event - no static fallback
    }

    // Check eventDetails array for image section
    if (eventToCheck.eventDetails && Array.isArray(eventToCheck.eventDetails)) {
      const imageDetail = eventToCheck.eventDetails.find(
        (detail: EventDetail) => detail.section === 'image'
      );
      if (imageDetail?.imageUrl) {
        return imageDetail.imageUrl;
      }
    }

    const fromEventInfo = this.getTitleImageFromEventInfo(eventToCheck?.eventInfo ?? eventToCheck?.EventInfo);
    if (fromEventInfo) return fromEventInfo;
    return eventToCheck.bannerImage || eventToCheck.imageUrl || eventToCheck.image || eventToCheck.titleImageUrl || eventToCheck.titleImage || '';
  }

  private getTitleImageFromEventInfo(eventInfo: string | undefined): string {
    if (!eventInfo || typeof eventInfo !== 'string') return '';
    const m = eventInfo.match(/\[TitleImage:(.+?)\]/);
    return m ? m[1].trim() : '';
  }

  getVideoUrl(): string {
    const raw = this.event?.eventInfo ?? this.event?.EventInfo ?? '';
    if (!raw || typeof raw !== 'string') return '';
    const m = raw.match(/\[VideoUrl:(.+?)\]/);
    return m ? m[1].trim() : '';
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

    const eventTitle = titleSection?.title ?? this.event.title ?? 'Event - Oilandgasclub';
    // ✅ FIX: Use metaDescription first (from admin form), then fallback to description section or default
    // Check both camelCase and PascalCase for metaDescription (backend might return either)
    const metaDesc = this.event.metaDescription ?? this.event.MetaDescription;
    const eventDescription =
      metaDesc ??
      descriptionSection?.description ??
      this.event.description ??
      'Join our upcoming oil and gas industry event';
    
    // ✅ DEBUG: Log which description source is being used
    console.log('[EventDetailsComponent] Meta description source:', {
      metaDescription: metaDesc,
      descriptionSection: descriptionSection?.description,
      eventDescription: this.event.description,
      finalDescription: eventDescription.substring(0, 100) + '...'
    });
    // Use the same getEventImage method for consistency
    const eventImage = this.getEventImage();

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

  /**
   * Opens the payment card modal with the provided payment URL
   */
  openPaymentCard(paymentUrl: string, registrationId: string): void {
    console.log('💳 Opening payment card modal:', { paymentUrl, registrationId });
    
    if (!paymentUrl || paymentUrl.trim() === '' || paymentUrl === 'null') {
      console.error('❌ Invalid payment URL provided to openPaymentCard');
      this.handlePaymentFailure(null, registrationId);
      return;
    }

    // Close registration modal first
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }

    // Reset form
    this.eventUserForm.reset({
      firstName: '',
      surname: '',
      email: '',
      confirmEmail: '',
      mobile: '',
      companyName: '',
      designation: '',
      department: '',
      newsletterUpdates: true,
      nearbyEvents: false,
      paymentRefNo: ''
    });

    // Store registration info for payment callback verification
    if (registrationId && this.isBrowser) {
      sessionStorage.setItem('lastRegistrationId', registrationId);
      sessionStorage.setItem('lastEventId', this.eventId);
    }

    // Open payment card modal
    const paymentModalRef = this.modalService.open(PaymentCardComponent, {
      size: 'xl',
      backdrop: 'static',
      keyboard: false,
      windowClass: 'payment-card-modal',
      centered: true
    });

    // Set payment card inputs
    const eventPrice = this.getEventPrice();
    paymentModalRef.componentInstance.paymentUrl = paymentUrl;
    paymentModalRef.componentInstance.amount = eventPrice ? parseFloat(eventPrice) : 0;
    paymentModalRef.componentInstance.entityId = registrationId;
    paymentModalRef.componentInstance.eventTitle = this.event?.title || 'Event Registration';

    console.log('✅ Payment card modal opened with:', {
      paymentUrl,
      amount: eventPrice,
      entityId: registrationId,
      eventTitle: this.event?.title
    });

    this.cdr.markForCheck();
  }

  /**
   * Handles payment failure scenarios with user-friendly error messages
   */
  handlePaymentFailure(response: any, registrationId: string, customMessage?: string): void {
    console.warn('⚠️ Handling payment failure:', { response, registrationId, customMessage });
    
    this.isSubmitting = false;
    this.cdr.markForCheck();

    // Show clear error message with actionable steps
    const regId = registrationId || response?.id || response?.Id || 'N/A';
    
    // Use custom message if provided, otherwise use default
    const errorMessage = customMessage 
      ? `Registration saved successfully! However, ${customMessage}. Your registration ID is: ${regId}. Please try registering again in a few moments, or contact our support team for assistance.`
      : 'Registration saved successfully! However, the payment gateway is temporarily unavailable. ' +
        'Your registration ID is: ' + regId + '. ' +
        'Please try registering again in a few moments, or contact our support team for assistance.';
    
    this.toasterService.showError(errorMessage);
    
    // Store registration ID for potential retry
    if (regId && regId !== 'N/A' && this.isBrowser) {
      sessionStorage.setItem('lastFailedRegistrationId', regId);
      sessionStorage.setItem('lastFailedEventId', this.eventId);
      sessionStorage.setItem('lastPaymentError', customMessage || 'Payment gateway initialization failed');
    }
    
    // Keep modal open but allow user to retry
    // User can close modal and try again, or contact support
  }

  // ✅ Handle scroll to show sidebar when "About this event" is visible and stop before Certificate section
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!this.isBrowser || !this.event) {
      return;
    }

    const aboutSection = document.querySelector('#about');
    const certificateElement = document.querySelector('.certificate-section');
    const sidebarElement = document.querySelector('.sticky-top') as HTMLElement;
    
    if (!aboutSection) {
      this.isSidebarVisible = false;
      this.cdr.markForCheck();
      return;
    }

    if (!sidebarElement) {
      return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const aboutRect = aboutSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // ✅ Check if "About this event" section is visible (entered viewport)
    // Sidebar should appear when about section enters viewport (top is at or above viewport bottom)
    const isAboutVisible = aboutRect.top <= viewportHeight && aboutRect.bottom > 0;
    
    // ✅ Show sidebar only when "About this event" section is in view
    if (!isAboutVisible) {
      this.isSidebarVisible = false;
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = 'auto';
      this.cdr.markForCheck();
      return;
    }
    
    // ✅ Sidebar is visible when about section is in view
    this.isSidebarVisible = true;

    // ✅ Handle stopping before Certificate section
    if (!certificateElement) {
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = '90px';
      this.cdr.markForCheck();
      return;
    }

    const certificateRect = certificateElement.getBoundingClientRect();
    const sidebarHeight = sidebarElement.getBoundingClientRect().height;
    const sidebarTop = 90; // ✅ Fixed top position
    const buffer = 20; // ✅ 20px buffer
    
    // ✅ Calculate if sidebar bottom would overlap Certificate section top
    // When sidebar is fixed at top: 90px, its bottom is at scrollTop + 90px + sidebarHeight
    const sidebarBottomPosition = scrollTop + sidebarTop + sidebarHeight;
    const certificateTopPosition = certificateRect.top + scrollTop;
    const stopPosition = certificateTopPosition - buffer;
    
    // ✅ Switch to constrained positioning when sidebar would overlap Certificate section
    if (sidebarBottomPosition >= stopPosition) {
      this.isSidebarFixed = false;
      // ✅ Set bottom position to stop before Certificate section
      // Calculate bottom value from viewport bottom to certificate top
      // Ensure bottom value is positive and reasonable
      const bottomValue = Math.max(20, window.innerHeight - certificateRect.top + buffer);
      sidebarElement.style.bottom = `${bottomValue}px`;
      sidebarElement.style.top = 'auto';
    } else {
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = '90px';
    }

    this.cdr.markForCheck();
  }
}

