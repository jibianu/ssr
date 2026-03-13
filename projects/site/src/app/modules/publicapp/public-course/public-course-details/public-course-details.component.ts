import { Component, OnDestroy, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, PLATFORM_ID, Inject, ChangeDetectorRef, HostListener, ElementRef, ViewChild, Input } from '@angular/core';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { PublicAppService } from '../../publicapp.service';
import { AuthenticationService } from '../../../auth/auth.service';
import { environment } from './../../../../../environments/environment';

@Component({
    selector: 'app-public-course-details, app-course-content',
    templateUrl: './public-course-details.component.html',
    styleUrls: ['./public-course-details.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush for faster change detection
})
export class PublicCourseDetailsComponent implements OnInit, OnChanges, OnDestroy {

  /** When set by CourseShellComponent, use this instead of loading from API. Canonical URL is then /:slug (no /courses/). */
  @Input() resolvedCourse: any = null;
  @Input() courseSlug = '';

  course: any = null; // ✅ Course data - only set when user clicks "Load Course" button
  courseDetails: any = null; // ✅ Alias for backward compatibility with existing template
  image = '';
  categoryName = '';
  courseSummaryText = ''; // First course summary or description for header (replaces category in that spot)
  courseId = '';
  /** Category ID from course for related courses (same as Elearn getCoursesByCategory(categoryId)). */
  get courseCategoryId(): string | null {
    const c = this.course ?? this.courseDetails;
    if (!c) return null;
    const cat = c.category ?? c.Category;
    if (cat && (cat.id ?? cat.Id)) return String(cat.id ?? cat.Id);
    const top = c.categoryId ?? c.CategoryId;
    return top != null ? String(top) : null;
  }

  /** Slug for resolving courseId via GET /api/courses/slug/{slug} (public course Buy flow). */
  get courseSlugForCheckout(): string {
    const c = this.course ?? this.courseDetails;
    const slug = c ? (c.canonicalUrl ?? c.CanonicalUrl ?? c.slug ?? c.Slug ?? '') : '';
    return (slug || this.courseSlug || '').toString().trim().replace(/^\//, '');
  }

  // ✅ Loading states
  isLoading = false;
  isLoaded = false;
  loadError: string | null = null;

  // ✅ Landing edit section (when URL is course ID / GUID – e.g. opened from admin "Public landing page")
  showEditSection = false;
  isEditingCourseDetails = false;
  editForm: {
    title: string;
    canonicalUrl: string;
    categoryId: string;
    metaDescription: string;
    titleImageUrl: string;
  } = { title: '', canonicalUrl: '', categoryId: '', metaDescription: '', titleImageUrl: '' };
  categories: any[] = [];
  saveError: string | null = null;
  saveSuccess = false;
  titleImageUploading = false;
  titleImageUploadError: string | null = null;
  
  // ✅ SSR: Browser check for DOM operations
  private readonly isBrowser: boolean;
  private readonly createdByList = ['f48824b8-f021-70f5-0cb8-a5cee2516932', 'e0986ef4-e84c-43cb-8a7a-f300a515ef4f'];

  // ✅ FIX: Add missing 'more' property for FAQ expansion functionality
  more = false;

  // ✅ Log "no course features" only once per load to avoid console spam
  private _courseFeaturesWarningLogged = false;

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

  // ✅ Promo video overlay (click thumbnail to play)
  showPromoVideoModal = false;

  // ✅ FIX: Move inject() calls to constructor to prevent injector errors in SSR
  private readonly canonicalService: CanonicalService;
  private readonly metadataService: MetadataService;
  private readonly structuredDataService: StructuredDataService;
  private readonly publicAppService: PublicAppService;
  private readonly changeDetectorRef: ChangeDetectorRef;
  private readonly authService: AuthenticationService;
  private subscription = new Subscription();

  /** Shown when free enroll API fails */
  enrollError: string | null = null;
  enrollInProgress = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private router: Router,
    canonicalService: CanonicalService,
    metadataService: MetadataService,
    structuredDataService: StructuredDataService,
    publicAppService: PublicAppService,
    changeDetectorRef: ChangeDetectorRef,
    authService: AuthenticationService
  ) {
    // ✅ FIX: Initialize injected services in constructor to ensure injector is available
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.canonicalService = canonicalService;
    this.metadataService = metadataService;
    this.structuredDataService = structuredDataService;
    this.publicAppService = publicAppService;
    this.changeDetectorRef = changeDetectorRef;
    this.authService = authService;
  }

  /** When true, page is shown inside admin "Public landing page" sidebar (embed=1); hide "Edit in admin" links so all edit is in the sidebar. */
  isEmbedMode = false;

  ngOnInit(): void {
    const getSlug = () =>
      this.courseSlug
      ?? this.route.snapshot.paramMap.get('courseSlug')
      ?? this.route.snapshot.paramMap.get('url')
      ?? this.route.snapshot.parent?.paramMap?.get('courseSlug')
      ?? this.route.snapshot.parent?.paramMap?.get('url')
      ?? null;
    const getLocation = () => this.route.snapshot.paramMap.get('location') ?? this.route.snapshot.parent?.paramMap?.get('location') ?? null;

    if (this.resolvedCourse) {
      this.applyResolvedCourse();
      if (this.isBrowser) this.initializeCountdown();
      this.changeDetectorRef.markForCheck();
      return;
    }

    const run = () => {
      // When parent (CourseShell) provides resolvedCourse, do not fetch by slug – parent will pass new data on navigation (ngOnChanges). Avoids race where stale API response overwrites correct course after search.
      if (this.resolvedCourse) return;
      this.loadCourse(getSlug(), getLocation());
    };
    run();
    this.subscription.add(this.route.params.subscribe(() => run()));
    if (this.route.parent?.params) this.subscription.add(this.route.parent.params.subscribe(() => run()));
    const querySub = this.route.queryParamMap.subscribe(q => {
      this.isEmbedMode = q.get('embed') === '1';
      this.changeDetectorRef.markForCheck();
    });
    this.subscription.add(querySub);
    if (this.isBrowser) this.initializeCountdown();
  }

  /** Apply course data from CourseShell (resolver); canonical URL is /:slug (no /courses/). */
  private applyResolvedCourse(): void {
    const data = this.resolvedCourse;
    if (!data) return;
    this.normalizeCourseDetailResponse(data);
    this.course = data;
    this.courseDetails = data;
    const slug = (this.courseSlug ?? (data.canonicalUrl ?? data.CanonicalUrl ?? '')).toString().trim();
    this.setComponentProperties(data, null, slug, true);
    this.isLoaded = true;
    this.isLoading = false;
  }

  /** When parent (CourseShell) passes new resolvedCourse/courseSlug after navigation (e.g. topbar search), re-apply so page reloads. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resolvedCourse'] || changes['courseSlug']) {
      if (this.resolvedCourse) {
        this.applyResolvedCourse();
        if (this.isBrowser) this.initializeCountdown();
        this.changeDetectorRef.markForCheck();
      }
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
    this._courseFeaturesWarningLogged = false;
    this.changeDetectorRef.markForCheck();

    // ✅ Use refresh so we get fresh About, FAQ, Trainers after Edit landing page saves (avoids stale cache)
    const courseObservable = location 
      ? this.publicAppService.getCourseByCanonicalLocationURL(slug, location)
      : this.publicAppService.getCourseByCanonicalURL(slug, { refresh: true });

    const requestedSlug = slug.trim().toLowerCase();
    courseObservable.subscribe({
      next: (data) => {
        if (!data) {
          this.loadError = 'Course not found. In Elearn admin: set the course Canonical URL (Edit panel) and ensure the course is Published.';
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
          return;
        }
        // Ignore stale response: user may have navigated to another course (e.g. from search) before this request completed.
        const currentSlug = (this.courseSlug ?? this.route.snapshot.paramMap.get('courseSlug') ?? this.route.snapshot.parent?.paramMap?.get('courseSlug') ?? '').toString().trim().toLowerCase();
        if (currentSlug && requestedSlug !== currentSlug) {
          this.isLoading = false;
          this.changeDetectorRef.markForCheck();
          return;
        }

        // ✅ Normalize Courses_backend PascalCase response so template (camelCase) shows all sections
        if (data) {
          this.normalizeCourseDetailResponse(data);
        }

        // ✅ Set course data (only after successful API response)
        this.course = data;
        this.courseDetails = data; // ✅ Alias for backward compatibility
        this.setComponentProperties(data, location);
        this.isLoaded = true;
        this.isLoading = false;
        // Start offer countdown when course is loaded (client-side) so timer runs after hydration
        if (this.isBrowser) {
          this.initializeCountdown();
        }
        // ✅ Show edit section when opened by course ID (GUID) – e.g. admin "Public landing page" preview
        this.showEditSection = this.isGuid(slug || '');
        if (this.showEditSection) {
          this.editForm = {
            title: data.title || data.Title || '',
            canonicalUrl: this.getCanonicalUrlForEditForm(data),
            categoryId: (data.category && (data.category.id || data.category.Id)) ? (data.category.id || data.category.Id) : '',
            metaDescription: data.metaDescription || data.MetaDescription || data.description || data.Description || '',
            titleImageUrl: data.titleImageUrl || data.TitleImageUrl || data.imageLink || ''
          };
          this.publicAppService.getCategories().subscribe({
            next: (cats) => { this.categories = cats || []; this.changeDetectorRef.markForCheck(); },
            error: () => { this.changeDetectorRef.markForCheck(); }
          });
        }
        // ✅ Replace URL with canonical slug when page was opened by course ID so address bar shows /course-slug
        const canonicalSlug = (data.canonicalUrl ?? data.CanonicalUrl ?? '').trim();
        if (this.isBrowser && this.isGuid(slug || '') && canonicalSlug && !this.isGuid(canonicalSlug)) {
          this.router.navigate(['/', canonicalSlug], { queryParamsHandling: 'preserve', replaceUrl: true });
        }
        this.changeDetectorRef.markForCheck();
      },
      error: (error) => {
        console.error('Error loading course:', error);
        const status = error?.status ?? error?.statusCode;
        this.loadError = status === 404
          ? 'Course not found. In Elearn admin: set the course Canonical URL (Slug) and ensure the course is Published.'
          : 'Failed to load course. Check that the API is running (e.g. https://localhost:52287) and try again.';
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Normalizes API response so both Elearn (camelCase) and Courses_backend (PascalCase) work.
   * Ensures About, Course Content, FAQ, Trainer, Key Features sections get data.
   */
  private normalizeCourseDetailResponse(data: any): void {
    const d = data as any;
    // Top-level: prefer camelCase, fallback to PascalCase
    if (d.id === undefined && d.Id !== undefined) d.id = d.Id;
    if (d.title === undefined && d.Title !== undefined) d.title = d.Title;
    if (d.titleImageUrl === undefined && d.TitleImageUrl !== undefined) d.titleImageUrl = d.TitleImageUrl;
    if (d.canonicalUrl === undefined && d.CanonicalUrl !== undefined) d.canonicalUrl = d.CanonicalUrl;
    if (d.metaDescription === undefined && d.MetaDescription !== undefined) d.metaDescription = d.MetaDescription;
    if (d.amount === undefined && d.Amount !== undefined) d.amount = d.Amount;
    if (d.originalAmount === undefined && d.OriginalAmount !== undefined) d.originalAmount = d.OriginalAmount;
    if (d.discount === undefined && d.Discount !== undefined) d.discount = d.Discount;
    d.coursePriceType = d.coursePriceType ?? d.course_price_type ?? 'paid';
    d.finalPrice = d.finalPrice ?? d.final_price;
    d.originalPrice = d.originalPrice ?? d.original_price;
    d.discountPrice = d.discountPrice ?? d.discount_price;
    d.discountStartDate = d.discountStartDate ?? d.discount_start_date;
    d.discountEndDate = d.discountEndDate ?? d.discount_end_date;
    if (d.amount == null && d.finalPrice != null) d.amount = d.finalPrice;
    if (d.originalAmount == null && d.originalPrice != null) d.originalAmount = d.originalPrice;
    if (d.category === undefined && d.Category !== undefined) d.category = d.Category;
    if (d.createdByUser === undefined && d.CreatedByUser !== undefined) d.createdByUser = d.CreatedByUser;
    if (d.updatedByUser === undefined && d.UpdatedByUser !== undefined) d.updatedByUser = d.UpdatedByUser;
    // Collections and nested objects
    d.courseFeatures = d.courseFeatures ?? d.CourseFeatures ?? [];
    d.courseContents = d.courseContents ?? d.CourseContents ?? [];
    d.frequentlyAskedQuestions = d.frequentlyAskedQuestions ?? d.FrequentlyAskedQuestions ?? [];
    d.courseTeachers = d.courseTeachers ?? d.CourseTeachers ?? [];
    d.courseInformation = d.courseInformation ?? d.CourseInformation ?? [];
    d.courseSummaries = d.courseSummaries ?? d.CourseSummaries ?? [];
    d.becomeCourse = d.becomeCourse ?? d.BecomeCourse ?? null;
    d.categoryName = d.categoryName ?? d.CategoryName ?? (d.category && (d.category.name ?? d.category.Name)) ?? '';
    if (!Array.isArray(d.courseFeatures)) d.courseFeatures = [];
    if (!Array.isArray(d.courseContents)) d.courseContents = [];
    if (!Array.isArray(d.frequentlyAskedQuestions)) d.frequentlyAskedQuestions = [];
    if (!Array.isArray(d.courseTeachers)) d.courseTeachers = [];
    if (!Array.isArray(d.courseInformation)) d.courseInformation = [];
    if (!Array.isArray(d.courseSummaries)) d.courseSummaries = [];
    // Normalize nested courseInformation and courseSummaries (camelCase vs PascalCase)
    (d.courseInformation as any[]).forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.title === undefined && item.Title !== undefined) item.title = item.Title;
        if (item.summary === undefined && item.Summary !== undefined) item.summary = item.Summary;
      }
    });
    (d.courseSummaries as any[]).forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.title === undefined && item.Title !== undefined) item.title = item.Title;
        if (item.summary === undefined && item.Summary !== undefined) item.summary = item.Summary;
      }
    });
    (d.courseFeatures as any[]).forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.description === undefined && item.Description !== undefined) item.description = item.Description;
      }
    });
    if (d.becomeCourse && typeof d.becomeCourse === 'object') {
      const bc = d.becomeCourse as any;
      if (bc.title === undefined && bc.Title !== undefined) bc.title = bc.Title;
      if (bc.description === undefined && bc.Description !== undefined) bc.description = bc.Description;
    }
    // Normalize FAQ items (camelCase vs PascalCase) so template can use item.question / item.answer
    (d.frequentlyAskedQuestions as any[]).forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.question === undefined && item.Question !== undefined) item.question = item.Question;
        if (item.answer === undefined && item.Answer !== undefined) item.answer = item.Answer;
      }
    });
    // Normalize Trainer items so template can use item.name / item.imageUrl / item.description
    (d.courseTeachers as any[]).forEach((item: any) => {
      if (item && typeof item === 'object') {
        if (item.name === undefined && item.Name !== undefined) item.name = item.Name;
        if (item.imageUrl === undefined && item.ImageUrl !== undefined) item.imageUrl = item.ImageUrl;
        if (item.description === undefined && item.Description !== undefined) item.description = item.Description;
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

  /** True when course is free (course_price_type === 'free' or final_price === 0). */
  get isFreeCourse(): boolean {
    const d = this.courseDetails;
    if (!d) return false;
    const type = d.coursePriceType ?? d.course_price_type;
    const finalPrice = d.finalPrice ?? d.final_price ?? d.amount;
    return type === 'free' || (finalPrice != null && Number(finalPrice) === 0);
  }

  /** True when paid course has an active discount (final price < original). */
  get hasActiveDiscount(): boolean {
    if (this.isFreeCourse) return false;
    const d = this.courseDetails;
    if (!d) return false;
    const amount = d.amount ?? d.finalPrice ?? d.final_price;
    const original = d.originalAmount ?? d.originalPrice ?? d.original_price;
    return amount != null && original != null && Number(original) > 0 && Number(amount) < Number(original);
  }

  /** Flash sale end time (ms) from discount_end_date when paid with active discount; null otherwise. */
  get flashSaleEndTime(): number | null {
    if (!this.hasActiveDiscount || !this.courseDetails?.discountEndDate) return null;
    const end = this.courseDetails.discountEndDate;
    const t = typeof end === 'string' ? new Date(end).getTime() : (end && (end as any).getTime ? (end as Date).getTime() : null);
    return t != null && !isNaN(t) && t > Date.now() ? t : null;
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
      return hasDescription;
    });
    
    if (this.isBrowser && validFeatures.length === 0 && !this._courseFeaturesWarningLogged) {
      this._courseFeaturesWarningLogged = true;
      console.warn('[PublicCourseDetailsComponent] No course features in API response. For full data (About, Contents, FAQ, Trainer), ensure Courses_backend is running and CoursesBackend:BaseUrl is set in Elearn appsettings.');
    }
    
    return validFeatures;
  }

  setComponentProperties(courseDetails: any, location: string | null, canonicalSlugOverride?: string, noCoursesPrefix = true) {
    const canonicalUrl = canonicalSlugOverride ?? (location ?
      `${courseDetails.canonicalUrl}-${location.toLowerCase()}` :
      (courseDetails.canonicalUrl ?? courseDetails.slug ?? courseDetails.Slug ?? ''));
    const base = environment.seoUrl.replace(/\/?$/, '');
    const fullUrl = noCoursesPrefix ? `${base}/${canonicalUrl.replace(/^\//, '')}` : `${base}/courses/${canonicalUrl.replace(/^\//, '')}`;

    this.courseDetails = courseDetails;
    this.courseId = this.courseDetails.id ?? this.courseDetails.Id;
    const cat = this.courseDetails?.category;
    this.categoryName = courseDetails.categoryName ?? courseDetails.CategoryName ?? (cat ? (cat.name || cat.Name || '') : '');
    const summaries = courseDetails.courseSummaries ?? courseDetails.CourseSummaries;
    const firstSummary = Array.isArray(summaries) && summaries.length > 0 ? summaries[0] : null;
    this.courseSummaryText = (firstSummary && (firstSummary.summary ?? firstSummary.Summary)) ? (firstSummary.summary ?? firstSummary.Summary).trim() : (courseDetails.metaDescription ?? courseDetails.MetaDescription ?? courseDetails.description ?? courseDetails.Description ?? '').trim();
    this.image = this.courseDetails.titleImageUrl || (this.courseDetails as any).TitleImageUrl || 'assets/img/oilandgasclub.jpg';
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
      this.canonicalService.setCanonicalURL(fullUrl); // https://oilandgasclub.com/:slug or /courses/:slug

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

  /** True when slug is a GUID (course ID) – used for "Public landing page" preview / edit section. */
  isGuid(slug: string): boolean {
    if (!slug || typeof slug !== 'string') return false;
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guid.test(slug.trim());
  }

  /** Generate URL-friendly slug from course title for Canonical URL (e.g. "API 580 Preperation course" → "api-580-preperation-course"). */
  slugifyFromTitle(title: string): string {
    if (!title || typeof title !== 'string') return '';
    return title
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** Canonical URL for edit form: use from API if present and not a GUID, else generate from course title. */
  getCanonicalUrlForEditForm(data: any): string {
    const raw = data?.canonicalUrl ?? data?.CanonicalUrl ?? '';
    const title = data?.title ?? data?.Title ?? '';
    if (raw && !this.isGuid(raw)) return raw.trim();
    return this.slugifyFromTitle(title) || raw;
  }

  startEditCourseDetails(): void {
    if (!this.courseDetails) return;
    this.editForm = {
      title: this.courseDetails.title || this.courseDetails.Title || '',
      canonicalUrl: this.getCanonicalUrlForEditForm(this.courseDetails),
      categoryId: (this.courseDetails.category && (this.courseDetails.category.id || this.courseDetails.category.Id)) ? (this.courseDetails.category.id || this.courseDetails.category.Id) : '',
      metaDescription: this.courseDetails.metaDescription || this.courseDetails.MetaDescription || this.courseDetails.description || '',
      titleImageUrl: this.courseDetails.titleImageUrl || this.courseDetails.TitleImageUrl || this.image || ''
    };
    this.isEditingCourseDetails = true;
    this.saveError = null;
    this.saveSuccess = false;
    this.changeDetectorRef.markForCheck();
  }

  cancelEditCourseDetails(): void {
    this.isEditingCourseDetails = false;
    this.saveError = null;
    this.saveSuccess = false;
    this.changeDetectorRef.markForCheck();
  }

  saveCourseDetails(): void {
    if (!this.courseId) return;
    this.saveError = null;
    this.saveSuccess = false;
    this.publicAppService.updateCourseFromLanding(this.courseId, this.editForm).subscribe({
      next: () => {
        this.saveSuccess = true;
        this.isEditingCourseDetails = false;
        this.loadCourse(this.courseId, null);
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.saveError = err?.error?.message || err?.message || 'Failed to save.';
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  onTitleImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file || !this.courseId) return;
    this.titleImageUploadError = null;
    this.titleImageUploading = true;
    this.changeDetectorRef.markForCheck();
    this.publicAppService.uploadCourseTitleImage(this.courseId, file).subscribe({
      next: (res) => {
        const url = (res && (res.url ?? res.Url)) ? (res.url ?? res.Url) : '';
        if (url) this.editForm.titleImageUrl = url;
        this.titleImageUploading = false;
        if (input) input.value = '';
        this.changeDetectorRef.markForCheck();
      },
      error: (err) => {
        this.titleImageUploadError = err?.error?.message || err?.message || 'Upload failed.';
        this.titleImageUploading = false;
        if (input) input.value = '';
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  get adminEditCourseUrl(): string {
    const base = (environment as any).elearnAppUrl || (environment as any).elearnUrl || 'http://localhost:4201';
    return `${base.replace(/\/$/, '')}/app/admin/course/edit/${this.courseId}`;
  }

  get adminAddCourseUrl(): string {
    const base = (environment as any).elearnAppUrl || (environment as any).elearnUrl || 'http://localhost:4201';
    return `${base.replace(/\/$/, '')}/app/admin/course/add`;
  }

  /** Admin URL for curriculum list (Contents) for this course. */
  get adminCurriculumUrl(): string {
    const base = (environment as any).elearnAppUrl || (environment as any).elearnUrl || 'http://localhost:4201';
    return `${base.replace(/\/$/, '')}/app/admin/course/curriculum/list/${this.courseId}`;
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

  /** Proxy URL for S3 promo videos (avoids CORS). */
  getPromoVideoSrc(url: string | null | undefined): string | null {
    return this.publicAppService.getPromoVideoStreamUrl(url);
  }

  openPromoVideo(): void {
    this.showPromoVideoModal = true;
    this.changeDetectorRef.markForCheck();
  }

  closePromoVideo(): void {
    this.showPromoVideoModal = false;
    this.changeDetectorRef.markForCheck();
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
   * Initialize countdown timer - uses flash sale end date when available, else stored or new timer
   */
  private initializeCountdown(): void {
    if (!this.isBrowser) {
      return;
    }

    // ✅ STEP 7 — Flash sale timer: use discount_end_date when paid course has active discount
    const flashEnd = this.flashSaleEndTime;
    if (flashEnd != null) {
      this.startCountdown(flashEnd);
      return;
    }

    // Free or no discount: no countdown needed (hide timer for free; for paid without discount we can hide or use generic offer)
    if (this.isFreeCourse) {
      this.isCountdownExpired = false;
      this.countdownHours = '00';
      this.countdownMinutes = '00';
      this.countdownSeconds = '00';
      this.changeDetectorRef.markForCheck();
      return;
    }

    let offerEndTime: number | null = this.getStoredOfferEndTime();
    if (!offerEndTime) {
      offerEndTime = this.createNewOfferTimer();
    }
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

  /**
   * Enroll Now for FREE course: if not logged in redirect to login with returnUrl;
   * if logged in call POST api/course/enroll/free then redirect to /app/student/course/{courseId}.
   */
  handleEnrollNowClick(event: Event): void {
    if (!this.isBrowser) return;
    event.preventDefault();
    event.stopPropagation();
    this.enrollError = null;
    const c = this.course ?? this.courseDetails;
    let cid = this.courseId || (c?.id ?? c?.Id);
    if (!cid) {
      const slug = this.courseSlugForCheckout || this.courseSlug || (c?.slug ?? c?.Slug ?? c?.canonicalUrl ?? c?.CanonicalUrl);
      if (slug) {
        this.publicAppService.getCourseBySlugForCheckout(String(slug).trim().replace(/^\//, '')).subscribe({
          next: (info) => {
            if (info?.id) {
              this.courseId = info.id;
              this.doEnrollFreeCourse(info.id);
            } else {
              this.enrollError = 'Course not loaded.';
              this.changeDetectorRef.markForCheck();
            }
          },
          error: () => {
            this.enrollError = 'Course not loaded.';
            this.changeDetectorRef.markForCheck();
          }
        });
        return;
      }
      this.enrollError = 'Course not loaded.';
      this.changeDetectorRef.markForCheck();
      return;
    }
    this.doEnrollFreeCourse(String(cid));
  }

  private doEnrollFreeCourse(courseId: string): void {
    if (!this.isBrowser) return;
    this.authService.ensureTokensLoaded();
    if (!this.authService.hasValidAccessToken() && !this.authService.getIdToken()) {
      const returnUrl = `/app/student/course/${encodeURIComponent(courseId)}`;
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem('returnUrl', returnUrl);
        } catch (_) {}
      }
      this.router.navigate(['/login'], { queryParams: { returnUrl } });
      return;
    }
    this.enrollInProgress = true;
    this.changeDetectorRef.markForCheck();
    this.publicAppService.enrollFreeCourse(courseId).subscribe({
      next: (res) => {
        this.enrollInProgress = false;
        this.changeDetectorRef.markForCheck();
        if (res?.success || res?.alreadyEnrolled) {
          const courseLearningPath = '/app/student/course/' + encodeURIComponent(courseId);
          const base = (environment.elearnAppUrl || '').trim().replace(/\/$/, '') || (this.isBrowser ? window.location.origin : '');
          const absoluteUrl = base ? base + courseLearningPath : courseLearningPath;
          if (this.isBrowser) {
            this.navigateToUrl(absoluteUrl);
          }
        } else {
          this.enrollError = res?.message || 'Enrollment failed. Please try again.';
          this.changeDetectorRef.markForCheck();
        }
      },
      error: () => {
        this.enrollInProgress = false;
        this.enrollError = 'Enrollment failed. Please try again.';
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Navigate to URL. When page is in an iframe (embed mode), navigate the top window so the parent
   * Elearn app (4201) goes to the URL instead of the iframe – avoids duplicate topbar/sidebar.
   */
  private navigateToUrl(url: string): void {
    if (!this.isBrowser) return;
    const target = typeof window !== 'undefined' && window !== window.top ? window.top! : window;
    target.location.href = url;
  }

  /**
   * Buy Now (paid course): redirect to checkout using courseId.
   * When elearnAppUrl is set (e.g. public site 4200, checkout on 4201), redirects to elearn checkout.
   * When embedded in 4201 iframe, navigates top window to avoid multiple layouts.
   */
  handleDesktopBuyClick(event: Event): void {
    if (!this.isBrowser) return;
    event.preventDefault();
    event.stopPropagation();
    const c = this.course ?? this.courseDetails;
    const cid = this.courseId || (c?.id ?? c?.Id);
    if (cid) {
      const base = (environment.elearnAppUrl || '').trim().replace(/\/$/, '');
      const checkoutUrl = base ? `${base}/checkout/${encodeURIComponent(String(cid))}` : `/checkout/${encodeURIComponent(String(cid))}`;
      this.navigateToUrl(checkoutUrl);
      return;
    }
    const slug = this.courseSlugForCheckout.replace(/^-+/, '').trim();
    if (slug) {
      this.publicAppService.getCourseBySlugForCheckout(slug).subscribe({
        next: (res) => {
          if (res?.id) {
            const base = (environment.elearnAppUrl || '').trim().replace(/\/$/, '');
            const checkoutUrl = base ? `${base}/checkout/${encodeURIComponent(res.id)}` : `/checkout/${encodeURIComponent(res.id)}`;
            this.navigateToUrl(checkoutUrl);
          } else {
            console.warn('Buy button: Could not resolve course ID from slug');
          }
        },
        error: () => console.warn('Buy button: Failed to resolve course by slug')
      });
    } else {
      console.error('Buy button: Course ID missing. Ensure course API returns id.');
    }
  }

  // ✅ Handle mobile buy button click: redirect to checkout page (paid course). Same logic as desktop.
  handleMobileBuyClick(event: Event): void {
    this.handleDesktopBuyClick(event);
  }
}