
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, Subscription } from 'rxjs';
import { map, shareReplay, catchError, switchMap } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { AuthenticationService } from '../../../auth/auth.service';
import { BackendHealthService } from 'src/app/core/services/backend-health.service';
import { environment } from 'src/environments/environment';
import { buildElearnAuthUrl } from 'src/app/core/helpers/elearn-auth-url.helper';

interface HomeCourseFeature {
  id?: string;
  description?: string;
  iconUrl?: string;
}

interface HomeCourse {
  id?: string;
  title?: string;
  titleImageUrl?: string;
  shortDescription?: string;
  amount?: number;
  canonicalUrl: string;
  courseFeatures: HomeCourseFeature[];
  badge?: string;
}

interface HomeCategorySection {
  categoryName: string;
  categorySlug: string;
  courses: HomeCourse[];
  totalCourses: number;
}

/** Dashboard sections + optional enrollment map (browser + JWT only). */
interface CourseHomeViewModel {
  sections: HomeCategorySection[];
  /** courseId (lowercase) → enrolled */
  enrolled: Record<string, boolean>;
  /** Bulk API failed — fall back to legacy Buy/checkout behavior */
  enrollmentFailed: boolean;
}

@Component({
    selector: 'app-public-course-home',
    templateUrl: './public-course-home.component.html',
    styleUrls: ['./public-course-home.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class PublicCourseHomeComponent implements OnInit, OnDestroy {
  /** Sections + enrollment; bound in template after first load */
  displayVm: CourseHomeViewModel | null = null;
  viewModel$!: Observable<CourseHomeViewModel>;
  viewLoading = true;

  /** After successful free enroll before list refresh */
  private readonly enrollmentLocalPatch: Record<string, boolean> = {};
  /** Prevent double POST enroll */
  enrollingCourseId: string | null = null;

  private dataSub = new Subscription();

  // ✅ ERROR HANDLING: Loading and error states
  loading = false;
  error: string | null = null;
  backendAvailable = true; // Track if backend API is available
  
  // ✅ FIX: Expose actual backend URL for template (not proxy path)
  get apiUrl(): string {
    // Use BackendHealthService to get the actual backend URL for display
    if (this.backendHealthService) {
      return this.backendHealthService.getActualBackendUrl();
    }
    // Fallback if service not initialized yet
    return 'http://localhost:52056/';
  }
  // ✅ FIX: Move inject() to constructor to prevent injector errors in SSR
  private backendHealthService: BackendHealthService;

  constructor(
    private publicAppService: PublicAppService,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    backendHealthService: BackendHealthService
  ) {
    this.backendHealthService = backendHealthService;
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.checkBackendHealth();
    }
    this.subscribeViewModel();
  }

  private subscribeViewModel(): void {
    this.viewLoading = true;
    this.displayVm = null;
    this.viewModel$ = this.createViewModel$();
    this.dataSub.add(
      this.viewModel$.subscribe({
        next: vm => {
          this.displayVm = vm;
          this.viewLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.viewLoading = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private createViewModel$(): Observable<CourseHomeViewModel> {
    return this.publicAppService.getDashboardCategories().pipe(
      map(categories => this.buildSectionsFromCategories(categories)),
      catchError(error => {
        console.error('Error loading dashboard categories:', error);
        if (!this.backendAvailable) {
          const actualApiUrl = this.backendHealthService.getActualBackendUrl();
          this.error = `Unable to connect to API server. Please ensure the backend is running at ${actualApiUrl}`;
        } else {
          this.error = error?.error?.message || 'Failed to load categories. Please refresh the page.';
        }
        return of([] as HomeCategorySection[]);
      }),
      switchMap(sections => this.mergeEnrollmentIntoViewModel(sections)),
      shareReplay(1)
    );
  }

  private buildSectionsFromCategories(categories: any[] | null | undefined): HomeCategorySection[] {
    if (!categories || categories.length === 0) {
      return [];
    }
    return categories
      .map((ele: any) => {
        const categoryName = ele.name || '';
        const categorySlug = this.normalizeCategorySlug(categoryName);
        const originalCourses = Array.isArray(ele.courses) ? ele.courses : [];

        let filteredCourses = originalCourses.filter((course: any) => {
          const courseCategory = course?.category?.name || course?.categoryName || course?.category || '';
          return this.normalizeCategoryName(courseCategory) === this.normalizeCategoryName(categoryName);
        });

        if (filteredCourses.length === 0 && originalCourses.length > 0) {
          filteredCourses = originalCourses;
        }

        const mappedCourses: HomeCourse[] = filteredCourses.map(course => this.mapCourse(course));

        return {
          categoryName,
          categorySlug,
          courses: mappedCourses,
          totalCourses: filteredCourses.length,
          sortOrder: ele.sortOrder || 0
        } as HomeCategorySection & { sortOrder: number };
      })
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(({ sortOrder, ...rest }) => rest);
  }

  private collectCourseIds(sections: HomeCategorySection[]): string[] {
    const set = new Set<string>();
    for (const s of sections) {
      for (const c of s.courses) {
        const id = this.getCourseIdString(c);
        if (id) set.add(id);
      }
    }
    return Array.from(set);
  }

  private mergeEnrollmentIntoViewModel(sections: HomeCategorySection[]): Observable<CourseHomeViewModel> {
    const base: CourseHomeViewModel = { sections, enrolled: {}, enrollmentFailed: false };
    if (!isPlatformBrowser(this.platformId)) {
      return of(base);
    }
    this.authService.ensureTokensLoaded();
    if (!this.authService.hasJwtForAuthenticatedApi()) {
      return of(base);
    }
    const ids = this.collectCourseIds(sections);
    if (ids.length === 0) {
      return of(base);
    }
    return this.publicAppService.getEnrollmentStatusBulk(ids).pipe(
      map(enrolled => ({ sections, enrolled, enrollmentFailed: false })),
      catchError(err => {
        console.warn('[PublicCourseHome] enrollment bulk failed, falling back to Buy behavior', err);
        return of({ sections, enrolled: {}, enrollmentFailed: true });
      })
    );
  }
  
  /**
   * ✅ BACKEND HEALTH: Check if backend API is available
   * Only logs to console - doesn't show UI error unless actual API calls fail
   * This prevents false positives when backend is slow to respond to health checks
   */
  private checkBackendHealth(): void {
    this.backendHealthService.checkHealthWithTimeout(5000).subscribe(available => {
      this.backendAvailable = available;
      // Don't show error immediately - only show if actual API calls also fail
      // This prevents false positives when backend is slow to start or temporarily unavailable
      if (!available) {
        console.warn('⚠️ Backend health check failed, but waiting for actual API call to confirm');
      }
    });
  }
  
  // ✅ ERROR HANDLING: Reload on retry
  reload(): void {
    this.error = null;
    Object.keys(this.enrollmentLocalPatch).forEach(k => delete this.enrollmentLocalPatch[k]);
    this.enrollingCourseId = null;
    this.backendHealthService.clearCache();
    this.checkBackendHealth();
    this.dataSub.unsubscribe();
    this.dataSub = new Subscription();
    this.subscribeViewModel();
  }

  // ✅ PERFORMANCE: Add trackBy functions for ngFor optimization
  trackByItemIndex(index: number, item: HomeCategorySection): string {
    return item?.categoryName || index.toString();
  }

  trackByCourseId(index: number, course: HomeCourse): string {
    return course?.id != null ? String(course.id) : String(index);
  }

  trackByFeatureId(index: number, feature: HomeCourseFeature): string {
    return feature?.id != null ? String(feature.id) : String(index);
  }

  // ✅ Canonical course URL: /:slug (no /courses/ prefix)
  private normalizeCourseUrl(url: string | null | undefined): string {
    if (!url) return '';
    let normalized = url.replace(/^\/+/, '').replace(/^courses\//, '');
    if (normalized.startsWith('course/course/')) normalized = normalized.replace(/^course\/course\//, '');
    else if (normalized.startsWith('course/')) normalized = normalized.replace(/^course\//, '');
    return normalized ? `/${normalized}` : '';
  }

  /**
   * Fast route for course cards from /courses page.
   * Canonical public URL is /:slug (no /course prefix).
   */
  getFastCourseRoute(course: HomeCourse | null | undefined): string[] {
    const canonical = (course?.canonicalUrl || '').toString().trim();
    const slug = canonical.replace(/^\/+/, '');
    if (!slug) return ['/courses'];
    return ['/', slug];
  }

  // ✅ FILTER: Normalize category name for case-insensitive comparison
  private normalizeCategoryName(categoryName: string | null | undefined): string {
    if (!categoryName) return '';
    // Trim whitespace and convert to lowercase for case-insensitive comparison
    return categoryName.trim().toLowerCase();
  }

  private normalizeCategorySlug(categoryName: string | null | undefined): string {
    if (!categoryName) {
      return '';
    }

    return categoryName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/img/oilandgasclub.jpg';
    }
  }

  private mapCourse(course: any): HomeCourse {
    const courseFeatures: HomeCourseFeature[] = Array.isArray(course?.courseFeatures)
      ? course.courseFeatures.map((feature: any) => ({
          id: feature?.id,
          description: feature?.description,
          iconUrl: feature?.iconUrl
        }))
      : [];

    const badge = course?.isBestSeller ? 'Best Seller' : course?.badge;

    // ✅ Explicitly preserve course ID - backend returns Guid as 'Id' (capital I)
    // Convert to string and ensure it's available as lowercase 'id'
    const courseId = course?.id || course?.Id || course?.ID;
    const courseIdString = courseId ? String(courseId) : undefined;

    // ✅ Use slug when canonicalUrl is missing (backend dashboard returns Slug, not canonicalUrl)
    const urlForLink = course?.canonicalUrl || course?.slug || '';
    const canonicalUrl = this.normalizeCourseUrl(urlForLink);

    // ✅ Image: backend returns ImageLink; template uses titleImageUrl
    const titleImageUrl = course?.titleImageUrl ?? course?.imageLink ?? course?.ImageLink ?? '';

    // ✅ Price: backend may return amount, finalPrice, or price
    const amount = course?.amount ?? course?.finalPrice ?? course?.price ?? 0;

    return {
      ...course,
      id: courseIdString, // ✅ Explicitly set id field as string
      Id: courseId, // ✅ Also preserve original Id (Guid) for compatibility
      canonicalUrl,
      courseFeatures,
      badge,
      titleImageUrl,
      amount
    } as HomeCourse;
  }



  getCourseIdString(course: HomeCourse | null | undefined): string | null {
    if (!course) return null;
    const courseId = course.id || (course as any).Id || (course as any).ID;
    return courseId ? String(courseId) : null;
  }

  isLoggedIn(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    this.authService.ensureTokensLoaded();
    return this.authService.hasJwtForAuthenticatedApi();
  }

  isFreeCourse(course: HomeCourse | null | undefined): boolean {
    return Number(course?.amount ?? 0) === 0;
  }

  isEnrolled(course: HomeCourse | null | undefined): boolean {
    const id = this.getCourseIdString(course)?.toLowerCase();
    if (!id) return false;
    if (this.enrollmentLocalPatch[id]) return true;
    return !!this.displayVm?.enrolled?.[id];
  }

  getCtaLabel(course: HomeCourse | null | undefined): string {
    if (!course) return 'Buy';
    if (!this.isLoggedIn()) return 'Buy';
    if (this.displayVm?.enrollmentFailed) return 'Buy';
    if (this.isEnrolled(course)) return 'Resume';
    if (this.isFreeCourse(course)) return 'Enroll';
    return 'Buy';
  }

  getCtaIconClass(course: HomeCourse | null | undefined): string {
    if (!course) return 'fa fa-shopping-cart';
    if (this.displayVm?.enrollmentFailed || !this.isLoggedIn()) return 'fa fa-shopping-cart';
    if (this.isEnrolled(course)) return 'fa fa-play';
    if (this.isFreeCourse(course)) return 'fa fa-user-plus';
    return 'fa fa-shopping-cart';
  }

  getCtaModifierClass(course: HomeCourse | null | undefined): string {
    if (!course) return '';
    if (this.displayVm?.enrollmentFailed || !this.isLoggedIn()) return '';
    if (this.isEnrolled(course)) return 'course-card__cta--resume';
    if (this.isFreeCourse(course)) return 'course-card__cta--enroll';
    return '';
  }

  isCtaLoading(course: HomeCourse | null | undefined): boolean {
    const id = this.getCourseIdString(course);
    return !!id && this.enrollingCourseId === id;
  }

  /**
   * Legacy Buy URL (used when enrollment bulk failed or guest).
   */
  getBuyButtonUrl(course: HomeCourse | null | undefined): string {
    if (!course) return '#';

    const courseIdString = this.getCourseIdString(course);

    if (courseIdString) {
      const elearnBase = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
      if (!elearnBase) return '#';

      if (isPlatformBrowser(this.platformId)) {
        this.authService.ensureTokensLoaded();
        if (this.authService.hasJwtForAuthenticatedApi()) {
          const amount = Number(course.amount ?? 0);
          if (amount === 0) {
            return `${elearnBase}/app/student/course/${encodeURIComponent(courseIdString)}`;
          }
          return `${elearnBase}/checkout/${encodeURIComponent(courseIdString)}`;
        }
      }

      const returnUrl = '/app/student/course/' + courseIdString;
      return buildElearnAuthUrl('login', `returnUrl=${encodeURIComponent(returnUrl)}`, elearnBase);
    }

    if (course.canonicalUrl) {
      return course.canonicalUrl.startsWith('/') ? course.canonicalUrl : `/${course.canonicalUrl}`;
    }

    return '#';
  }

  getCourseActionHref(course: HomeCourse | null | undefined): string {
    if (!course) return '#';
    if (this.displayVm?.enrollmentFailed || !this.isLoggedIn()) {
      return this.getBuyButtonUrl(course);
    }
    const id = this.getCourseIdString(course);
    const elearnBase = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
    if (!id || !elearnBase) return '#';

    if (this.isEnrolled(course)) {
      return `${elearnBase}/app/student/course/${encodeURIComponent(id)}`;
    }
    if (this.isFreeCourse(course)) {
      return '#';
    }
    return `${elearnBase}/checkout/${encodeURIComponent(id)}`;
  }

  private navigateHard(url: string): void {
    try {
      window.location.href = url;
    } catch {
      try {
        window.location.assign(url);
      } catch {
        window.location.replace(url);
      }
    }
  }

  /**
   * Udemy-style: guest → login; enrolled → resume; free → enroll API then course; paid → checkout.
   */
  handleCourseActionClick(event: Event, course: HomeCourse | null | undefined): void {
    if (!isPlatformBrowser(this.platformId) || !course) {
      event.preventDefault();
      return;
    }

    if (this.displayVm?.enrollmentFailed || !this.isLoggedIn()) {
      event.preventDefault();
      event.stopPropagation();
      const url = this.getBuyButtonUrl(course);
      if (url && url !== '#') this.navigateHard(url);
      return;
    }

    const id = this.getCourseIdString(course);
    const elearnBase = ((environment as { elearnAppUrl?: string }).elearnAppUrl ?? '').trim().replace(/\/$/, '');
    if (!id || !elearnBase) {
      event.preventDefault();
      return;
    }

    if (this.isEnrolled(course)) {
      event.preventDefault();
      event.stopPropagation();
      this.navigateHard(`${elearnBase}/app/student/course/${encodeURIComponent(id)}`);
      return;
    }

    if (this.isFreeCourse(course)) {
      event.preventDefault();
      event.stopPropagation();
      if (this.enrollingCourseId === id) return;
      this.enrollingCourseId = id;
      this.cdr.markForCheck();
      this.publicAppService.enrollFreeCourse(id).subscribe({
        next: res => {
          this.enrollingCourseId = null;
          if (res?.success || res?.alreadyEnrolled) {
            this.enrollmentLocalPatch[id.toLowerCase()] = true;
            this.navigateHard(`${elearnBase}/app/student/course/${encodeURIComponent(id)}`);
          } else {
            const path = course.canonicalUrl?.startsWith('/') ? course.canonicalUrl : `/${course.canonicalUrl || ''}`;
            if (path && path !== '/') this.navigateHard(path);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.enrollingCourseId = null;
          this.cdr.markForCheck();
          const path = course.canonicalUrl?.startsWith('/') ? course.canonicalUrl : `/${course.canonicalUrl || ''}`;
          if (path && path !== '/') this.navigateHard(path);
        }
      });
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.navigateHard(`${elearnBase}/checkout/${encodeURIComponent(id)}`);
  }

  ngOnDestroy(): void {
    this.dataSub.unsubscribe();
  }
}