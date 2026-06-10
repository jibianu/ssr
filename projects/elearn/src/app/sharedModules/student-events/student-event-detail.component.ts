import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  HostListener,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subscription } from 'rxjs';
import { StudentDashboardApiService } from '../../modules/student/student-dashboard-api.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

interface EventDetail {
  section: string;
  title?: string;
  description?: string;
  amount?: number;
  tag?: string;
  imageUrl?: string;
  [key: string]: any;
}

interface Testimonial {
  name: string;
  role: string;
  avatar: string;
  quote: string;
}

@Component({
  selector: 'app-student-event-detail',
  standalone: false,
  templateUrl: './student-event-detail.component.html',
  styleUrls: ['./student-event-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentEventDetailComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('testimonialSlider', { static: false }) testimonialSlider?: ElementRef<HTMLDivElement>;
  @ViewChild('salarySlider', { static: false }) salarySlider?: ElementRef<HTMLDivElement>;
  @ViewChild('hostSlider', { static: false }) hostSlider?: ElementRef<HTMLDivElement>;

  event: any = null;
  events: any[] = [];
  eventId = '';
  loading = true;
  error: string | null = null;

  isRegisteredForEvent = false;
  registrationCheckDone = false;

  eventUserForm!: FormGroup;
  modalRef: NgbModalRef | null = null;
  isSubmitting = false;

  isSidebarFixed = true;
  isSidebarVisible = false;
  expanded = false;
  learningExpanded = false;

  canScrollLeft = false;
  canScrollRight = true;
  canScrollSalaryLeft = false;
  canScrollSalaryRight = true;
  canScrollHostLeft = false;
  canScrollHostRight = true;

  testimonials: Testimonial[] = [
    {
      name: 'Ekta',
      role: 'Process Engineer, ExxonMobil',
      avatar: 'assets/avatars/ekta.png',
      quote:
        'I attended the online workshop conducted by OilandGasClub and found it highly informative and well-structured. The sessions provided practical insights into current industry practices and emerging trends in the oil and gas sector. The speakers explained complex concepts clearly, making the workshop valuable for both experienced professionals and those looking to expand their technical knowledge. I appreciate the efforts of OilandGasClub in organizing such quality learning opportunities.'
    },
    {
      name: 'Rupall',
      role: 'Process Simulation Engineer, Shell India',
      avatar: 'assets/avatars/rupall.png',
      quote:
        'The OilandGasClub online workshop was an excellent platform for professional development. The content was relevant to industry requirements and covered important technical aspects with real-world applications. The interactive approach of the presenters kept the sessions engaging throughout. I would recommend these workshops to professionals seeking to enhance their understanding of oil and gas engineering practices.'
    },
    {
      name: 'Nishant',
      role: 'Mechanical & Static Equipment Engineer, Petrofac',
      avatar: 'assets/avatars/nishant.png',
      quote:
        'I had a great experience attending the online workshop organized by OilandGasClub. The workshop delivered valuable technical knowledge and practical perspectives from industry experts. The topics were thoughtfully selected and presented in a manner that encouraged active participation and learning. Such initiatives significantly contribute to continuous professional growth within the industry.'
    },
    {
      name: 'Aparna',
      role: 'Structural & Skid Design Engineer, TechnipFMC',
      avatar: 'assets/avatars/aparna.png',
      quote:
        'The online workshop conducted by OilandGasClub was insightful and professionally executed. The sessions offered useful knowledge on industry best practices and highlighted current developments in engineering and design within the oil and gas sector. The workshop environment encouraged learning and knowledge sharing, making it a worthwhile experience. I look forward to participating in more such programs in the future.'
    }
  ];

  private subscription = new Subscription();
  private readonly isBrowser: boolean;
  private testimonialScrollTimeout: any = null;
  private countdownInterval: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentApi: StudentDashboardApiService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private authenticationService: AuthenticationService,
    private toasterService: ToasterService,
    private modalService: NgbModal,
    private formBuilder: FormBuilder,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  private static isGuid(value: string): boolean {
    if (!value || typeof value !== 'string') return false;
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guid.test(value.trim());
  }

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('id');
    if (!param) {
      this.router.navigate(['/app/student/events']);
      return;
    }
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Events', url: '/app/student/events' }, { label: 'Details' }]);

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
    }, { validators: this.emailMatchValidator });

    const onEventLoaded = (e: any) => {
      this.event = this.normalizeEventResponse(e);
      this.eventId = this.event?.id ?? '';
      if (this.event?.title) {
        this.studentBreadcrumb.setBreadcrumb([{ label: 'Events', url: '/app/student/events' }, { label: this.event.title }]);
      }
      this.loading = false;
      if (this.eventId && this.authenticationService.currentToken()) {
        this.subscription.add(
          this.studentApi.checkEventRegistration(this.eventId).subscribe({
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
      if (this.eventId) {
        this.studentApi.getUpcomingEvents(this.eventId).subscribe({
          next: (list) => {
            this.events = list ?? [];
            this.cdr.markForCheck();
          },
          error: () => {}
        });
      }
      this.cdr.markForCheck();
    };

    if (StudentEventDetailComponent.isGuid(param)) {
      this.studentApi.getEventById(param).subscribe({
        next: onEventLoaded,
        error: () => {
          this.error = 'Event not found.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.studentApi.getEventByCanonicalUrl(param).subscribe({
        next: (e) => {
          onEventLoaded(e);
          const eventId = this.event?.id;
          if (eventId && eventId !== param) {
            this.router.navigate(['/app/student/events/event', eventId], { replaceUrl: true });
          }
        },
        error: () => {
          this.error = 'Event not found.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.updateTestimonialControls();
        this.updateHostControls();
        this.updateSalaryControls();
        this.onWindowScroll();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    if (this.testimonialScrollTimeout) clearTimeout(this.testimonialScrollTimeout);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.subscription.unsubscribe();
    if (this.modalRef) {
      this.modalRef.dismiss();
      this.modalRef = null;
    }
  }

  emailMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const email = group.get('email')?.value;
    const confirmEmail = group.get('confirmEmail')?.value;
    if (email && confirmEmail && email !== confirmEmail) {
      group.get('confirmEmail')?.setErrors({ emailMismatch: true });
      return { emailMismatch: true };
    }
    return null;
  }

  /** Use timeing as startTime only if it looks like a time (e.g. "10:00 AM"), not a bare number like "32". */
  private static timeLike(value: string | null | undefined): boolean {
    if (value == null || typeof value !== 'string') return false;
    const v = String(value).trim();
    if (!v) return false;
    if (/^\d+$/.test(v)) return false;
    return /[\d:]/.test(v) || /\b(am|pm|a\.m\.|p\.m\.)\b/i.test(v);
  }

  /** Treat placeholder or very short location as Online. */
  private static locationDisplay(raw: string | null | undefined): string {
    if (raw == null || typeof raw !== 'string') return 'Online';
    const v = raw.trim();
    if (!v) return 'Online';
    if (['ewt', 'tbd', 'na', 'n/a', 'tba', '-'].includes(v.toLowerCase())) return 'Online';
    if (v.length < 2) return 'Online';
    return v;
  }

  /**
   * Normalize API response: handle PascalCase, ensure eventDetails array, map timeing→startTime, location→locationName.
   */
  private normalizeEventResponse(e: any): any {
    if (!e) return e;
    const details = e.eventDetails ?? e.EventDetails ?? [];
    const eventDetails = Array.isArray(details)
      ? details.map((d: any) => ({
          id: d.id ?? d.Id,
          section: d.section ?? d.Section ?? '',
          title: d.title ?? d.Title ?? '',
          description: d.description ?? d.Description ?? '',
          tag: d.tag ?? d.Tag ?? '',
          amount: d.amount ?? d.Amount,
          imageUrl: d.imageUrl ?? d.ImageUrl,
          sortOrder: d.sortOrder ?? d.SortOrder
        }))
      : [];
    const timeing = e.timeing ?? e.Timeing;
    const startTime = e.startTime ?? e.StartTime ?? (StudentEventDetailComponent.timeLike(timeing) ? timeing : null);
    const rawLocation = e.locationName ?? e.LocationName ?? e.location ?? e.Location;
    const locationName = StudentEventDetailComponent.locationDisplay(rawLocation);
    return {
      ...e,
      id: e.id ?? e.Id,
      title: e.title ?? e.Title,
      canonicalUrl: e.canonicalUrl ?? e.CanonicalUrl,
      startDate: e.startDate ?? e.StartDate,
      endDate: e.endDate ?? e.EndDate,
      startTime,
      duration: e.duration ?? e.Duration,
      timeing: e.timeing ?? e.Timeing,
      locationName,
      location: e.location ?? e.Location,
      amount: e.amount ?? e.Amount,
      discount: e.discount ?? e.Discount,
      badge: e.badge ?? e.Badge,
      aboutEvent: e.aboutEvent ?? e.AboutEvent,
      eventInfo: e.eventInfo ?? e.EventInfo,
      longDescription: e.longDescription ?? e.LongDescription ?? e.aboutEvent ?? e.AboutEvent,
      language: e.language ?? e.Language,
      isEnded: e.isEnded ?? e.IsEnded,
      metaDescription: e.metaDescription ?? e.MetaDescription,
      eventDetails
    };
  }

  getValue(section: string, title: string, key: string): any {
    const details = this.event?.eventDetails;
    if (!details || !Array.isArray(details)) return '';
    const d = details.find((x: EventDetail) =>
      (x.section === section || (x as any).section === section) &&
      (x.title === title || (x as any).title === title)
    );
    if (!d) return '';
    const k = key in d ? key : (key.charAt(0).toUpperCase() + key.slice(1));
    return (d as any)[key] ?? (d as any)[k] ?? '';
  }

  getHelpPhone(): string {
    return this.getHelpPhones()[0];
  }

  getHelpEmail(): string {
    return this.getHelpEmails()[0];
  }

  getHelpPhones(): string[] {
    return this.getHelpContacts('Phone', '+91 98402 87919');
  }

  getHelpEmails(): string[] {
    return this.getHelpContacts('Email', 'event@oilandgasclub.com');
  }

  getHelpPhoneHref(phone?: string): string {
    const value = phone ?? this.getHelpPhone();
    return value.replace(/[\s()-]/g, '');
  }

  private getHelpContacts(title: string, fallback: string): string[] {
    const details = this.event?.eventDetails ?? [];
    const values = details
      .filter((d: EventDetail) => {
        const section = (d.section ?? (d as any).Section ?? '').trim();
        const itemTitle = (d.title ?? (d as any).Title ?? '').trim();
        return section === 'support' && itemTitle === title;
      })
      .sort(
        (a: EventDetail, b: EventDetail) =>
          Number(a.sortOrder ?? (a as any).SortOrder ?? 0) - Number(b.sortOrder ?? (b as any).SortOrder ?? 0)
      )
      .map((d: EventDetail) => String(d.description ?? (d as any).Description ?? '').trim())
      .filter(Boolean);
    return values.length ? values : [fallback];
  }

  getInfo(section: string): EventDetail[] {
    const result = this.event?.eventDetails?.filter((d: EventDetail) => d.section === section) ?? [];
    if (section === 'organized_soc' || section?.startsWith('organized_soc_')) {
      return result.filter((d: EventDetail) => d.title?.trim() !== '' && d.tag?.trim() !== '');
    }
    return result;
  }

  getRemaining(startDate: string | Date | null): { days: number; hours: number } {
    if (!startDate) return { days: 0, hours: 0 };
    const start = new Date(startDate);
    const now = new Date();
    if (start <= now) return { days: 0, hours: 0 };
    const diff = start.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  }

  getDescription(event: any): string {
    const raw = event?.eventInfo || event?.aboutEvent || '';
    if (!raw || typeof raw !== 'string') return '';
    return raw
      .replace(/\n?\[TitleImage:[^\]]*\]/g, '')
      .replace(/\n?\[VideoUrl:[^\]]*\]/g, '')
      .replace(/\n?\[QAJSON\][\s\S]*$/g, '')
      .trim();
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

  /** Navigate to event checkout. If not logged in, AuthGuard redirects to login then back to checkout. */
  goToEventCheckout(): void {
    if (this.event?.isEnded) return;
    const id = this.event?.id ?? this.eventId;
    if (!id) return;
    this.router.navigate(['/checkout/event', id]);
  }

  openRegisterModal(content: any): void {
    if (!this.authenticationService.currentToken()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    if (this.isRegisteredForEvent) {
      this.toasterService.showSuccess('You are already registered for this event.');
      return;
    }
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
    this.modalRef = this.modalService.open(content, {
      scrollable: true,
      backdrop: 'static',
      size: 'lg',
      windowClass: 'event-registration-modal',
      centered: true
    });
    this.cdr.markForCheck();
  }

  paymentProcess(): void {
    if (this.isSubmitting) return;
    if (this.eventUserForm.invalid) {
      Object.keys(this.eventUserForm.controls).forEach(key => {
        this.eventUserForm.get(key)?.markAsTouched();
        this.eventUserForm.get(key)?.updateValueAndValidity();
      });
      this.toasterService.showError('Please fill in all required fields correctly.');
      this.cdr.markForCheck();
      return;
    }
    if (!this.eventId?.trim()) {
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
    if (!name || !email || !mobile || !companyName || !designation || !department) {
      this.toasterService.showError('Please fill in all required fields correctly.');
      this.cdr.markForCheck();
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.eventUserForm.get('email')?.setErrors({ email: true });
      this.eventUserForm.get('email')?.markAsTouched();
      this.toasterService.showError('Please enter a valid email address.');
      this.cdr.markForCheck();
      return;
    }
    this.isSubmitting = true;
    this.cdr.markForCheck();
    const body = { name, email, mobile, companyName, designation, department };
    this.subscription.add(
      this.studentApi.registerForEvent(this.eventId, body).subscribe({
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
            this.studentApi.createEventCheckoutSession(this.eventId).subscribe({
              next: (checkout) => {
                const url = checkout?.paymentUrl;
                if (url) {
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
            });
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
  }

  trackByEventId(_: number, item: any): string {
    return item?.id ?? '';
  }

  getEventImage(event?: any): string {
    const e = event || this.event;
    if (!e) return '';
    if (e.eventDetails && Array.isArray(e.eventDetails)) {
      const imageDetail = e.eventDetails.find((d: EventDetail) => d.section === 'image');
      if (imageDetail?.imageUrl) return imageDetail.imageUrl;
    }
    const fromEventInfo = this.getTitleImageFromEventInfo(e?.eventInfo ?? e?.EventInfo);
    if (fromEventInfo) return fromEventInfo;
    return e.bannerImage || e.imageUrl || e.image || e.titleImageUrl || e.titleImage || '';
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

  getLogoUrl(): string {
    return 'assets/img/oilandgas_club.svg';
  }

  onLogoError(event: any): void {
    const target = event?.target as HTMLImageElement;
    if (target && typeof target.src === 'string') target.src = 'assets/img/oilandgas_club.svg';
  }

  onViewMoreInfo(): void {
    this.expanded = !this.expanded;
    this.cdr.markForCheck();
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  getTimeRemaining(startDate: string | Date | null): string {
    if (!startDate) return '00:00';
    const start = new Date(startDate);
    const now = new Date();
    if (start <= now) return '00:00';
    const diff = start.getTime() - now.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  getOrganizerSocialLinks(organizerIndex: number): EventDetail[] {
    const links = this.getInfo(`organized_soc_${organizerIndex}`);
    if (links.length > 0) return links;
    if (organizerIndex === 0) return this.getInfo('organized_soc');
    return [];
  }

  getSocialUrl(social: EventDetail): string {
    const url = social?.title || social?.description || '';
    if (!url?.trim()) return '#';
    const t = url.trim();
    return /^https?:\/\//i.test(t) ? t : `https://${t}`;
  }

  getSocialIcon(platform: string): string {
    const p = (platform || '').toLowerCase();
    if (p.includes('linkedin')) return 'fa-linkedin';
    if (p.includes('twitter') || p.includes('x')) return 'fa-twitter';
    if (p.includes('facebook')) return 'fa-facebook';
    if (p.includes('instagram')) return 'fa-instagram';
    if (p.includes('youtube')) return 'fa-youtube';
    if (p.includes('github')) return 'fa-github';
    return 'fa-link';
  }

  getLearningItems(): EventDetail[] {
    const items = this.getInfo('curriculum');
    if (items.length <= 3 || this.learningExpanded) return items;
    return items.slice(0, 3);
  }

  hasMoreLearningItems(): boolean {
    return this.getInfo('curriculum').length > 3;
  }

  toggleLearningExpansion(): void {
    this.learningExpanded = !this.learningExpanded;
    this.cdr.markForCheck();
  }

  sumAmount(section: string): number {
    return this.getInfo(section).reduce((sum, d) => sum + (d.amount ?? 0), 0);
  }

  getEventDt(ev: any, section: string, index: number): EventDetail | undefined {
    return ev?.eventDetails?.filter((d: EventDetail) => d.section === section)?.[index];
  }

  openTermsAndConditions(e: Event): void {
    e.preventDefault();
    if (this.isBrowser) window.open('/terms-and-conditions', '_blank');
  }

  startCountdownTimer(): void {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    if (!this.isBrowser || !this.event?.startDate) return;
    this.countdownInterval = setInterval(() => {
      if (new Date(this.event.startDate) <= new Date()) {
        clearInterval(this.countdownInterval!);
        this.countdownInterval = null;
      }
      this.cdr.markForCheck();
    }, 1000);
    this.cdr.markForCheck();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!this.isBrowser || !this.event) return;
    const aboutSection = document.querySelector('#about');
    const certificateElement = document.querySelector('.certificate-section');
    const sidebarElement = document.querySelector('.sticky-top') as HTMLElement;
    if (!aboutSection) {
      this.isSidebarVisible = false;
      this.cdr.markForCheck();
      return;
    }
    if (!sidebarElement) return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const aboutRect = aboutSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const isAboutVisible = aboutRect.top <= viewportHeight && aboutRect.bottom > 0;
    if (!isAboutVisible) {
      this.isSidebarVisible = false;
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = 'auto';
      this.cdr.markForCheck();
      return;
    }
    this.isSidebarVisible = true;
    if (!certificateElement) {
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = '90px';
      this.cdr.markForCheck();
      return;
    }
    const certificateRect = certificateElement.getBoundingClientRect();
    const sidebarHeight = sidebarElement.getBoundingClientRect().height;
    const sidebarTop = 90;
    const buffer = 20;
    const sidebarBottomPosition = scrollTop + sidebarTop + sidebarHeight;
    const certificateTopPosition = certificateRect.top + scrollTop;
    const stopPosition = certificateTopPosition - buffer;
    if (sidebarBottomPosition >= stopPosition) {
      this.isSidebarFixed = false;
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

  trackByTagId(_: number, item: EventDetail): string {
    return item?.id ?? item?.tag ?? '';
  }

  trackByOrganizerId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackBySocialId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackByCurriculumId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackByBonusId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackBySalaryId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackByQaId(_: number, item: EventDetail): string {
    return item?.id ?? '';
  }

  trackByTestimonial(_: number, t: Testimonial): string {
    return t?.name ?? '';
  }

  scrollTestimonials(direction: 1 | -1): void {
    if (!this.isBrowser || !this.testimonialSlider) return;
    const slider = this.testimonialSlider.nativeElement;
    const card = slider.querySelector<HTMLElement>('.testimonial-card');
    const cardWidth = card ? card.offsetWidth : slider.clientWidth;
    const gap = parseInt(getComputedStyle(slider).gap || '24', 10);
    slider.scrollTo({ left: slider.scrollLeft + direction * (cardWidth + gap), behavior: 'smooth' });
    if (this.testimonialScrollTimeout) clearTimeout(this.testimonialScrollTimeout);
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
    if (!this.isBrowser || !this.salarySlider) return;
    const slider = this.salarySlider.nativeElement;
    const card = slider.querySelector<HTMLElement>('.salary-card');
    const cardWidth = card ? card.offsetWidth : slider.clientWidth;
    const gap = parseInt(getComputedStyle(slider).gap || '24', 10);
    slider.scrollTo({ left: slider.scrollLeft + direction * (cardWidth + gap), behavior: 'smooth' });
    if (this.testimonialScrollTimeout) clearTimeout(this.testimonialScrollTimeout);
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

  scrollHost(direction: 1 | -1): void {
    if (!this.isBrowser || !this.hostSlider) return;
    const slider = this.hostSlider.nativeElement;
    slider.scrollTo({ left: slider.scrollLeft + direction * slider.clientWidth, behavior: 'smooth' });
    if (this.testimonialScrollTimeout) clearTimeout(this.testimonialScrollTimeout);
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
}
