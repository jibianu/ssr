import { Component, OnDestroy, OnInit, ChangeDetectionStrategy, PLATFORM_ID, Inject, ChangeDetectorRef, HostListener, ElementRef, ViewChild } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { PublicAppService } from '../../publicapp.service';
import { environment } from './../../../../../environments/environment';

@Component({
    selector: 'app-public-course-details',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
})
export class PublicCourseDetailsComponent implements OnInit, OnDestroy {

  course: any = null; // ✅ Course data - only set when user clicks "Load Course" button
  courseDetails: any = null; // ✅ Alias for backward compatibility with existing template
  image = '';
  categoryName = '';
  courseId = '';
  
  // ✅ Loading states
  isLoading = false;
  isLoaded = false;
  loadError: string | null = null;
  
  // ✅ SSR: Browser check for DOM operations
  private readonly isBrowser: boolean;
  private readonly createdByList = ['f48824b8-f021-70f5-0cb8-a5cee2516932', 'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'];

  // ✅ FIX: Add missing 'more' property for FAQ expansion functionality
  more = false;

  // ✅ Sticky sidebar positioning state
  isSidebarFixed = true; // ✅ Start as fixed, switch to absolute when near Related Courses

  // ✅ Countdown Timer Properties
  countdownHours: string = '00';
  countdownMinutes: string = '00';
  countdownSeconds: string = '00';
  isCountdownExpired: boolean = false;
  private countdownInterval: any = null;
  
  // ✅ Countdown Timer Configuration
  private readonly OFFER_DURATION_HOURS = 24; // ✅ Configurable: Offer duration in hours
  private readonly COOKIE_NAME = 'course_offer_end_time';
  private readonly COOKIE_EXPIRY_DAYS = 30; // ✅ Configurable: Cookie expiry in days

  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly canonicalService: CanonicalService;
  private readonly metadataService: MetadataService;
  private readonly structuredDataService: StructuredDataService;
  private readonly publicAppService: PublicAppService;
  private readonly changeDetectorRef: ChangeDetectorRef;
  private subscription = new Subscription();

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    canonicalService: CanonicalService,
    metadataService: MetadataService,
    structuredDataService: StructuredDataService,
    publicAppService: PublicAppService,
    changeDetectorRef: ChangeDetectorRef
  ) {
    // ✅ FIX: Initialize injected services in constructor to ensure injector is available
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.canonicalService = canonicalService;
    this.metadataService = metadataService;
    this.structuredDataService = structuredDataService;
    this.publicAppService = publicAppService;
    this.changeDetectorRef = changeDetectorRef;
  }

  ngOnInit(): void {
    const paramsSub = this.route.paramMap.subscribe(paramMap => {
      const slug = paramMap.get('url');
      const location = paramMap.get('location');
      this.loadCourse(slug, location);
    });
    this.subscription.add(paramsSub);
    
    // ✅ Initialize countdown timer
    if (this.isBrowser) {
      this.initializeCountdown();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    // ✅ Cleanup countdown interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // ✅ Handle scroll to stop sidebar before Related Courses section
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    if (!this.isBrowser || !this.course) {
      return;
    }

    const relatedCoursesElement = document.querySelector('.related-courses-wrapper');
    if (!relatedCoursesElement) {
      this.isSidebarFixed = true;
      this.changeDetectorRef.markForCheck();
      return;
    }

    const sidebarElement = document.querySelector('.sticky-sidebar') as HTMLElement;
    if (!sidebarElement) {
      return;
    }

    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const relatedCoursesRect = relatedCoursesElement.getBoundingClientRect();
    const sidebarHeight = sidebarElement.getBoundingClientRect().height;
    const sidebarTop = 90; // ✅ Fixed top position
    const buffer = 20; // ✅ 20px buffer
    
    // ✅ Calculate if sidebar would overlap Related Courses
    const sidebarBottom = scrollTop + sidebarTop + sidebarHeight;
    const relatedCoursesTop = relatedCoursesRect.top + scrollTop;
    const stopPosition = relatedCoursesTop - buffer;
    
    // ✅ Switch to constrained positioning when near Related Courses
    if (sidebarBottom >= stopPosition) {
      this.isSidebarFixed = false;
      // ✅ Set bottom position to stop before Related Courses
      const bottomValue = window.innerHeight - relatedCoursesRect.top + buffer;
      sidebarElement.style.bottom = `${bottomValue}px`;
      sidebarElement.style.top = 'auto';
    } else {
      this.isSidebarFixed = true;
      sidebarElement.style.bottom = 'auto';
      sidebarElement.style.top = '90px';
    }

    this.changeDetectorRef.markForCheck();
  }

  // ✅ Manual course loading - ONLY triggered by user interaction (button click)
  // NO automatic calls on page load
  loadCourse(slug: string | null, location: string | null): void {
    if (!slug) {
      this.loadError = 'Course URL not found';
      return;
    }

    // Prevent multiple simultaneous requests
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.isLoaded = false;
    this.loadError = null;
    this.course = null;
    this.courseDetails = null;
    this.changeDetectorRef.markForCheck();

    // ✅ Use service method (caching works automatically via shareReplay)
    // ✅ IMPORTANT: This should result in ONLY ONE API call to /api/course/{slug}
    // shareReplay ensures duplicate concurrent requests share the same response
    const courseObservable = location 
      ? this.publicAppService.getCourseByCanonicalLocationURL(slug, location)
      : this.publicAppService.getCourseByCanonicalURL(slug);

    courseObservable.subscribe({
      next: (data) => {
        if (!data) {
          this.loadError = 'Course not found';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
          return;
        }
        
        // ✅ FIX: Normalize Course Features property name (handle both PascalCase and camelCase)
        // Backend API returns "CourseFeatures" (PascalCase) but frontend expects "courseFeatures" (camelCase)
        // This ensures "Key Features" section can access "Course Features" data from API
        if (data) {
          // If courseFeatures doesn't exist but CourseFeatures does, copy it
          if (!data.courseFeatures && (data as any).CourseFeatures) {
            data.courseFeatures = (data as any).CourseFeatures;
            if (this.isBrowser) {
              console.log('[PublicCourseDetailsComponent] ✅ Normalized CourseFeatures (PascalCase) to courseFeatures (camelCase)');
            }
          }
          // Ensure courseFeatures is always set (even if empty array)
          if (!data.courseFeatures) {
            data.courseFeatures = [];
          }
        }
        
        // ✅ DEBUG: Log courseFeatures data with detailed information
        if (this.isBrowser) {
          console.log('[PublicCourseDetailsComponent] Course data loaded:', {
            id: data?.id,
            title: data?.title,
            courseFeatures: data?.courseFeatures,
            courseFeaturesLength: data?.courseFeatures?.length || 0,
            courseFeaturesRaw: data?.courseFeatures,
            hasCourseFeatures: !!data?.courseFeatures,
            isArray: Array.isArray(data?.courseFeatures),
            // Check for PascalCase version
            CourseFeatures: (data as any)?.CourseFeatures,
            CourseFeaturesLength: (data as any)?.CourseFeatures?.length || 0
          });
          
          // ✅ Additional debug: Log full data structure
          if (!data?.courseFeatures || data.courseFeatures.length === 0) {
            console.warn('[PublicCourseDetailsComponent] ⚠️ No courseFeatures found in API response!');
            console.warn('Full data object keys:', Object.keys(data || {}));
            console.warn('Data object:', data);
          }
        }
        
        // ✅ Set course data (only after successful API response)
        this.course = data;
        this.courseDetails = data; // ✅ Alias for backward compatibility
        this.setComponentProperties(data, location);
        this.isLoaded = true;
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading course:', error);
        this.loadError = 'Failed to load course. Please try again.';
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  // ✅ Getter for self-learning check
  get isSelfLearning$(): boolean {
    if (!this.course) {
      return false;
    }
    return this.course.createdByUser && 
      this.createdByList.includes(this.course.createdByUser.id);
  }

  // ✅ Getter for course features - handles both camelCase and PascalCase
  // This maps "Course Features" data from API to "Key Features" display in UI
  // Used in pricing card to display course features
  get courseFeatures(): any[] {
    if (!this.courseDetails) {
      if (this.isBrowser) {
        console.warn('[PublicCourseDetailsComponent] courseDetails is null/undefined - cannot get Course Features');
      }
      return [];
    }
    
    // ✅ Handle both camelCase (courseFeatures) and PascalCase (CourseFeatures) property names
    // The API returns "CourseFeatures" but we normalize it to "courseFeatures"
    // This ensures pricing card can access Course Features data
    const features = this.courseDetails.courseFeatures || (this.courseDetails as any).CourseFeatures;
    
    if (!features) {
      if (this.isBrowser) {
        console.warn('[PublicCourseDetailsComponent] ⚠️ No Course Features data found in courseDetails');
        console.warn('Available properties:', Object.keys(this.courseDetails || {}));
      }
      return [];
    }
    
    if (!Array.isArray(features)) {
      if (this.isBrowser) {
        console.warn('[PublicCourseDetailsComponent] ⚠️ Course Features is not an array:', typeof features, features);
      }
      return [];
    }
    
    // ✅ Filter out any null/undefined items and ensure we have valid features
    const validFeatures = features.filter(f => {
      const hasDescription = f && (f.description || f.Description);
      if (!hasDescription && this.isBrowser) {
        console.warn('[PublicCourseDetailsComponent] Skipping invalid feature:', f);
      }
      return hasDescription;
    });
    
    if (this.isBrowser) {
      if (validFeatures.length > 0) {
        console.log('[PublicCourseDetailsComponent] ✅ Course Features loaded for pricing card:', validFeatures.length, 'items');
        console.log('[PublicCourseDetailsComponent] Course Features data:', validFeatures);
      } else {
        console.warn('[PublicCourseDetailsComponent] ⚠️ No valid Course Features found after filtering');
      }
    }
    
    return validFeatures;
  }

  setComponentProperties(courseDetails, location: string | null) {
    const canonicalUrl = location ?
      `${courseDetails.canonicalUrl}-${location.toLowerCase()}`:
      `${courseDetails.canonicalUrl}`;
    
      this.courseDetails = courseDetails;
      this.courseId = this.courseDetails.id;
      this.categoryName = (this.courseDetails && this.courseDetails.category) ? this.courseDetails.category.name : '';
      this.image = this.courseDetails.titleImageUrl || 'https://www.oilandgasclub.com/assets/images/og-image.jpg';

      const fullUrl = environment.seoUrl + canonicalUrl;
      const authorName = this.courseDetails.createdByUser?.firstname && this.courseDetails?.createdByUser?.lastname
        ? `${this.courseDetails.createdByUser.firstname} ${this.courseDetails.createdByUser.lastname}`
        : 'Oilandgasclub';

      // ✅ SEO: Set meta tags (SSR-compatible)
      this.metadataService.updateMetadata({
        title: this.courseDetails.title || 'Course - Oilandgasclub',
        description: this.courseDetails.metaDescription || 'Professional oil and gas industry course',
        author: authorName,
        type: 'article',
        image: this.image,
        imageWidth: 1200,
        imageHeight: 630,
        seoUrl: fullUrl,
        time: this.courseDetails.createdOn,
        updatedTime: this.courseDetails.updatedOn,
        category: this.categoryName,
        canonicalUrl: fullUrl
      });
      this.canonicalService.setCanonicalURL(fullUrl);

      // ✅ SEO: Add Course structured data (JSON-LD)
      this.structuredDataService.setCourse({
        name: this.courseDetails.title || 'Course',
        description: this.courseDetails.metaDescription || 'Professional oil and gas industry course',
        url: fullUrl,
        image: this.image,
        provider: {
          name: 'Oilandgasclub',
          url: 'https://www.oilandgasclub.com'
        },
        educationalLevel: 'Professional',
        inLanguage: 'en',
        datePublished: this.courseDetails.createdOn,
        dateModified: this.courseDetails.updatedOn,
        category: this.categoryName,
        ...(this.courseDetails.price && {
          offers: {
            price: this.courseDetails.price.toString(),
            priceCurrency: this.courseDetails.currency || 'USD',
            availability: 'https://schema.org/InStock',
            url: fullUrl
          }
        })
      });

      // ✅ SEO: Add BreadcrumbList structured data
      const breadcrumbs = [
        { name: 'Home', url: environment.seoUrl },
        { name: 'Courses', url: `${environment.seoUrl}list` }
      ];
      
      if (this.categoryName) {
        breadcrumbs.push({
          name: this.categoryName,
          url: `${environment.seoUrl}category/${this.categoryName}`
        });
      }
      
      breadcrumbs.push({
        name: this.courseDetails.title || 'Course',
        url: fullUrl
      });
      
      this.structuredDataService.setBreadcrumbs(breadcrumbs);
  }

  // onImgError(event) {
  //   event.target.src = 'https://via.placeholder.com/468x300?text=OilandGasClub';
  // }

  onImgError(event: any) {
    (event.target as HTMLImageElement).src = 'assets/img/oilandgasclub.jpg';
  }

  onUserImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/user-profile.png';
    }
  }

  // ✅ PERFORMANCE: TrackBy functions for ngFor optimization
  trackBySummaryIndex(index: number): number {
    return index;
  }

  trackByCourseContentId(index: number, item: any): string {
    return item?.id || `content-${index}`;
  }

  trackBySubContentId(index: number, item: any): string {
    return item?.id || `subcontent-${index}`;
  }

  trackBySubSubContentId(index: number, item: any): string {
    return item?.id || `subsubcontent-${index}`;
  }

  // ✅ HELPER: Check if sub-item has nested items to show dropdown icon
  hasNestedItems(subItem: any): boolean {
    return subItem?.courseContentSubSubTypes && 
           Array.isArray(subItem.courseContentSubSubTypes) && 
           subItem.courseContentSubSubTypes.length > 0;
  }

  trackByFaqId(index: number, item: any): string {
    return item?.id || `faq-${index}`;
  }

  trackByTeacherId(index: number, item: any): string {
    return item?.id || `teacher-${index}`;
  }

  trackByFeatureId(index: number, item: any): string {
    return item?.id || `feature-${index}`;
  }

  trackByInfoItemId(index: number, item: any): string {
    return item?.id || `info-${index}`;
  }

  // ✅ FIX: Prevent navigation when clicking More/Less link
  toggleMore(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.more = !this.more;
  }

  // ✅ FIX: Prevent navigation when clicking dropdown/collapse links
  // ✅ SSR: Safe - only executes in browser
  // ✅ Scroll to section when navigation tab is clicked
  scrollToSection(sectionId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // ✅ SSR: Only execute DOM operations in browser
    if (!this.isBrowser) {
      return;
    }
    
    // ✅ Wait for next tick to ensure DOM is ready
    setTimeout(() => {
      // ✅ For trainer section, find the correct element (the one with trainer content)
      let element: HTMLElement | null = null;
      
      if (sectionId === 'trainer') {
        // ✅ Find the trainer section that contains courseTeachers
        const trainerElements = document.querySelectorAll(`#${sectionId}`);
        // ✅ Get the last one (the actual trainer section, not description)
        if (trainerElements.length > 0) {
          element = trainerElements[trainerElements.length - 1] as HTMLElement;
        }
      } else {
        element = document.getElementById(sectionId);
      }
      
      if (element) {
        // ✅ Calculate offset for fixed header (if any)
        const headerOffset = 100; // Adjust based on your header height
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        // ✅ Smooth scroll to section
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // ✅ Update active nav link
        this.updateActiveNavLink(sectionId);
      }
    }, 100);
  }
  
  // ✅ Update active navigation link
  updateActiveNavLink(activeSectionId: string): void {
    if (!this.isBrowser) {
      return;
    }
    
    // ✅ Remove active class from all nav links
    const navLinks = document.querySelectorAll('.nav-lb-tab .nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // ✅ Add active class to clicked nav link
    const sectionMap: { [key: string]: string } = {
      'about': 'description-tab',
      'contents': 'table-tab',
      'faq': 'faq-tab',
      'trainer': 'trainer-tab'
    };
    
    const activeTabId = sectionMap[activeSectionId];
    if (activeTabId) {
      const activeLink = document.getElementById(activeTabId);
      if (activeLink) {
        activeLink.classList.add('active');
      }
    }
  }

  preventNavigation(event: Event): void {
    // Prevent default to stop Angular router from intercepting hash links
    event.preventDefault();
    event.stopPropagation();
    
    // ✅ SSR: Only execute DOM operations in browser
    if (!this.isBrowser) {
      return;
    }
    
    const target = event.target as HTMLElement;
    const link = target.closest('a[data-toggle="collapse"]') as HTMLAnchorElement;
    
    if (!link) {
      return;
    }
    
    // Get the target element from href or hash
    const targetId = link.getAttribute('href')?.replace('#', '') || link.hash?.replace('#', '');
    if (!targetId) {
      return;
    }
    
    const targetElement = document.getElementById(targetId) || document.querySelector(`#${targetId}`);
    
    if (!targetElement) {
      return;
    }
    
    const collapseElement = targetElement as HTMLElement;
    const isExpanded = collapseElement.classList.contains('show');
    
    // Check if Bootstrap is available (for Bootstrap collapse)
    const bootstrap = (window as any).bootstrap;
    
    if (bootstrap && bootstrap.Collapse) {
      // Use Bootstrap 5+ Collapse API if available
      try {
        const collapse = bootstrap.Collapse.getOrCreateInstance(collapseElement);
        collapse.toggle();
        
        // Update link state
        setTimeout(() => {
          const isNowExpanded = collapseElement.classList.contains('show');
          link.setAttribute('aria-expanded', isNowExpanded.toString());
          if (isNowExpanded) {
            link.classList.remove('collapsed');
          } else {
            link.classList.add('collapsed');
          }
        }, 100);
        return;
      } catch (e) {
        console.warn('Bootstrap Collapse API failed, using fallback:', e);
      }
    }
    
    // Fallback: manually toggle if Bootstrap API fails or isn't available
    if (isExpanded) {
      collapseElement.classList.remove('show');
      link.setAttribute('aria-expanded', 'false');
      link.classList.add('collapsed');
    } else {
      // Close other items in the same parent accordion
      const parentSelector = link.getAttribute('data-parent') || 
                            collapseElement.getAttribute('data-parent');
      if (parentSelector) {
        const parent = document.querySelector(parentSelector);
        if (parent) {
          const siblings = parent.querySelectorAll('.collapse.show');
          siblings.forEach((sibling: Element) => {
            if (sibling !== targetElement) {
              (sibling as HTMLElement).classList.remove('show');
              // Update sibling link states
              const siblingLink = parent.querySelector(`a[href="#${sibling.id}"]`) as HTMLAnchorElement;
              if (siblingLink) {
                siblingLink.setAttribute('aria-expanded', 'false');
                siblingLink.classList.add('collapsed');
              }
            }
          });
        }
      }
      
      collapseElement.classList.add('show');
      link.setAttribute('aria-expanded', 'true');
      link.classList.remove('collapsed');
    }
  }

  // ✅ ==================== COUNTDOWN TIMER METHODS ====================
  
  /**
   * Initialize countdown timer - checks for existing timer or creates new one
   */
  private initializeCountdown(): void {
    if (!this.isBrowser) {
      return;
    }

    let offerEndTime: number | null = this.getStoredOfferEndTime();

    // ✅ If no stored time exists, create a new timer
    if (!offerEndTime) {
      offerEndTime = this.createNewOfferTimer();
    }

    // ✅ Start the countdown
    this.startCountdown(offerEndTime);
  }

  /**
   * Create a new offer timer and store it
   * @returns The offer end timestamp
   */
  private createNewOfferTimer(): number {
    const now = Date.now();
    const offerEndTime = now + (this.OFFER_DURATION_HOURS * 60 * 60 * 1000); // Add hours in milliseconds
    
    // ✅ Store in cookie (preferred) or localStorage (fallback)
    this.setStoredOfferEndTime(offerEndTime);
    
    if (this.isBrowser) {
      console.log(`[CountdownTimer] New offer timer created. Expires in ${this.OFFER_DURATION_HOURS} hours.`);
    }
    
    return offerEndTime;
  }

  /**
   * Get stored offer end time from cookie or localStorage
   * @returns The offer end timestamp or null if not found
   */
  private getStoredOfferEndTime(): number | null {
    if (!this.isBrowser) {
      return null;
    }

    // ✅ Try cookie first
    const cookieValue = this.getCookie(this.COOKIE_NAME);
    if (cookieValue) {
      const timestamp = parseInt(cookieValue, 10);
      if (!isNaN(timestamp) && timestamp > Date.now()) {
        return timestamp;
      }
      // ✅ Cookie expired, remove it
      this.deleteCookie(this.COOKIE_NAME);
    }

    // ✅ Fallback to localStorage
    try {
      const storedValue = localStorage.getItem(this.COOKIE_NAME);
      if (storedValue) {
        const timestamp = parseInt(storedValue, 10);
        if (!isNaN(timestamp) && timestamp > Date.now()) {
          return timestamp;
        }
        // ✅ localStorage value expired, remove it
        localStorage.removeItem(this.COOKIE_NAME);
      }
    } catch (e) {
      console.warn('[CountdownTimer] localStorage access failed:', e);
    }

    return null;
  }

  /**
   * Store offer end time in cookie (preferred) or localStorage (fallback)
   * @param timestamp The offer end timestamp
   */
  private setStoredOfferEndTime(timestamp: number): void {
    if (!this.isBrowser) {
      return;
    }

    // ✅ Try cookie first
    const cookieSet = this.setCookie(this.COOKIE_NAME, timestamp.toString(), this.COOKIE_EXPIRY_DAYS);
    
    // ✅ Fallback to localStorage if cookie fails
    if (!cookieSet) {
      try {
        localStorage.setItem(this.COOKIE_NAME, timestamp.toString());
      } catch (e) {
        console.warn('[CountdownTimer] Failed to store timer in both cookie and localStorage:', e);
      }
    }
  }

  /**
   * Start the countdown timer
   * @param offerEndTime The offer end timestamp
   */
  private startCountdown(offerEndTime: number): void {
    if (!this.isBrowser) {
      return;
    }

    // ✅ Clear any existing interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // ✅ Update immediately
    this.updateCountdown(offerEndTime);

    // ✅ Update every second
    this.countdownInterval = setInterval(() => {
      this.updateCountdown(offerEndTime);
    }, 1000);
  }

  /**
   * Update countdown display
   * @param offerEndTime The offer end timestamp
   */
  private updateCountdown(offerEndTime: number): void {
    if (!this.isBrowser) {
      return;
    }

    const now = Date.now();
    const remaining = offerEndTime - now;

    if (remaining <= 0) {
      // ✅ Timer expired
      this.countdownHours = '00';
      this.countdownMinutes = '00';
      this.countdownSeconds = '00';
      this.isCountdownExpired = true;
      
      // ✅ Clear interval
      if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
      }

      // ✅ Clean up stored timer
      this.deleteCookie(this.COOKIE_NAME);
      try {
        localStorage.removeItem(this.COOKIE_NAME);
      } catch (e) {
        // Ignore localStorage errors
      }

      this.changeDetectorRef.markForCheck();
      return;
    }

    // ✅ Calculate time components
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    // ✅ Format with leading zeros
    this.countdownHours = this.padZero(hours);
    this.countdownMinutes = this.padZero(minutes);
    this.countdownSeconds = this.padZero(seconds);
    this.isCountdownExpired = false;

    this.changeDetectorRef.markForCheck();
  }

  /**
   * Pad number with leading zero
   * @param num The number to pad
   * @returns Padded string
   */
  private padZero(num: number): string {
    return num.toString().padStart(2, '0');
  }

  // ✅ ==================== COOKIE UTILITY METHODS ====================

  /**
   * Set a cookie
   * @param name Cookie name
   * @param value Cookie value
   * @param days Days until expiry
   * @returns True if successful
   */
  private setCookie(name: string, value: string, days: number): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      const expires = `expires=${date.toUTCString()}`;
      document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
      return true;
    } catch (e) {
      console.warn('[CountdownTimer] Failed to set cookie:', e);
      return false;
    }
  }

  /**
   * Get a cookie value
   * @param name Cookie name
   * @returns Cookie value or null
   */
  private getCookie(name: string): string | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const nameEQ = `${name}=`;
      const cookies = document.cookie.split(';');
      
      for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
          cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
          return cookie.substring(nameEQ.length, cookie.length);
        }
      }
    } catch (e) {
      console.warn('[CountdownTimer] Failed to get cookie:', e);
    }

    return null;
  }

  /**
   * Delete a cookie
   * @param name Cookie name
   */
  private deleteCookie(name: string): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    } catch (e) {
      console.warn('[CountdownTimer] Failed to delete cookie:', e);
    }
  }

}