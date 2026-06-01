import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { PublicAppService } from 'src/app/modules/publicapp/publicapp.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';

/** GUID regex: so we can tell route param is course ID vs canonical slug. */
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-category-course-description',
  templateUrl: './category-course-description.component.html',
  styleUrls: ['./category-course-description.component.scss'],
  standalone: false
})
export class CategoryCourseDescriptionComponent implements OnInit, OnDestroy {
  courses: any;
  subscription: Subscription = new Subscription();
  curriculumList: any[] = [];
  isWishListedAdded: boolean;
  WishListText: string;
  courseID: any;
  wishId = '';
  userId = '';
  progressed: any;

  /** Sample certificate: logo, brand, signer (same as backend certificate view) */
  certificateLogoUrl = (environment as { logoUrl?: string }).logoUrl || '/assets/img/oilandgas_club.svg';
  certificateBrandName = (environment as { certificateBrandName?: string }).certificateBrandName || 'Oil and Gas Club';
  certificateSignerName = 'Anush';
  certificateSignerTitle = 'CEO';

  /** Accordion: id of the expanded module, or null */
  expandedModuleId: string | null = null;

  /** Override from enrollment-status API when set (so Resume shows even if course API was cached). */
  enrollmentStatusEnrolled: boolean | null = null;
  /** True while enrollment-status API is in progress; prevents wrong button flash. */
  enrollmentStatusLoading = false;

  /** True when the logged-in user is enrolled (handles API returning camelCase or PascalCase, or enrollment-status API). */
  get isEnrolled(): boolean {
    if (this.enrollmentStatusEnrolled !== null) return this.enrollmentStatusEnrolled;
    const c = this.courses;
    if (!c) return false;
    return !!(c as any).isProgressedForLoggedInUser || !!(c as any).IsProgressedForLoggedInUser;
  }

  /** True when course is free (final price 0). Used to show Enroll vs Buy Now when not enrolled. */
  get isFreeCourse(): boolean {
    const c = this.courses;
    if (!c) return false;
    const price = c.discountedPrice ?? c.price ?? c.Price ?? 0;
    return Number(price) === 0;
  }

  /** True while free-enroll API is in progress. */
  enrollingFree = false;

  constructor(
    private appService: AdminAppService,
    private publicAppService: PublicAppService,
    private activateRoute: ActivatedRoute,
    private router: Router,
    private studentBreadcrumb: StudentBreadcrumbService,
    private cdr: ChangeDetectorRef,
    private authService: AuthenticationService
  ) {}

  /** JWT present — same gate as enrollment APIs. */
  get isLoggedIn(): boolean {
    return !!this.authService.currentToken();
  }

  /** Sidebar / mobile bar: primary CTA label (Udemy-style). */
  get ctaLabel(): string {
    if (this.enrollingFree) return 'Enrolling...';
    if (!this.isLoggedIn) return 'Buy Now';
    if (this.isEnrolled) return 'Resume';
    if (this.isFreeCourse) return 'Enroll Now';
    return 'Buy Now';
  }

  get ctaButtonClass(): string {
    const base = 'cd-btn';
    if (!this.isLoggedIn || (!this.isEnrolled && !this.isFreeCourse)) {
      return `${base} cd-btn--primary`;
    }
    if (this.isEnrolled) return `${base} cd-btn--success`;
    return `${base} cd-btn--enroll`;
  }

  get ctaIconClass(): string {
    if (!this.isLoggedIn || (!this.isEnrolled && !this.isFreeCourse)) {
      return 'fas fa-shopping-cart';
    }
    if (this.isEnrolled) return 'fas fa-play';
    return 'fas fa-user-plus';
  }

  /**
   * Single handler: guest → login; enrolled → resume; free → enroll; paid → checkout.
   */
  handleCourseAction(): void {
    if (this.enrollmentStatusLoading || this.enrollingFree) return;
    if (!this.isLoggedIn) {
      this.fnGuestBuyOrLogin();
      return;
    }
    if (this.isEnrolled) {
      this.fnResume();
      return;
    }
    if (this.isFreeCourse) {
      this.fnEnrollFree();
    } else {
      this.fnGotoEntroll();
    }
  }

  /** Guest CTA: send to login with return to this course marketing URL. */
  fnGuestBuyOrLogin(): void {
    if (!this.courseID) return;
    const id = String(this.courseID).trim();
    const returnUrl = `/app/student/categories/course/${id}`;
    void this.router.navigate(['/login'], { queryParams: { returnUrl } });
  }

  ngOnInit(): void {
    this.WishListText = 'Add to Wishlist';
    this.courseID = this.activateRoute.snapshot.params['courseID'];
    this.loadCourse();

    // Refetch when user navigates to this page (e.g. after payment) so "Resume Learning" shows
    this.subscription.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd)
      ).subscribe(() => {
        const url = this.router.url;
        if (url.includes('category-courses-description/') || url.includes('/categories/course/')) {
          const match = url.match(/(?:category-courses-description|\/categories\/course)\/([^/?#]+)/);
          const id = match ? match[1] : null;
          if (id) {
            this.courseID = id;
            this.loadCourse();
          }
        }
      })
    );
  }

  private loadCourse(): void {
    if (!this.courseID) return;
    this.enrollmentStatusEnrolled = null;
    this.enrollmentStatusLoading = true;
    const isGuid = GUID_REGEX.test(String(this.courseID).trim());
    if (isGuid) {
      this.fetchEnrollmentStatusForButton();
      this.GetCourseDetails(this.courseID, true);
      this.getCurriculumList(this.courseID);
    } else {
      // Slug in URL (student app) — stay under /app/student/categories/course/:slug; do not use /courses/:slug (wrong router → 404).
      this.fetchEnrollmentStatusForButton();
      this.GetCourseDetailsBySlug(this.courseID, true);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  /** Subtitle from course description, max 140 chars (API data only) */
  get subtitle(): string {
    const d = this.courses?.description || this.courses?.subtitle || '';
    if (typeof d !== 'string') return '';
    return d.length > 140 ? d.slice(0, 140).trim() + '…' : d;
  }

  /** Total question count from curriculum (API-derived) */
  get totalQuestions(): number {
    if (!this.curriculumList?.length) return 0;
    return this.curriculumList.reduce(
      (sum: number, c: any) => sum + (c.curriculumQuestionCount ?? 0),
      0
    );
  }

  /** Learning points from first 4–6 curriculum titles (API data only) */
  get learningPoints(): string[] {
    if (!this.curriculumList?.length) return [];
    return this.curriculumList
      .slice(0, 6)
      .map((c: any) => c?.title)
      .filter(Boolean);
  }

  toggleModule(id: string): void {
    this.expandedModuleId = this.expandedModuleId === id ? null : id;
  }

  isModuleExpanded(id: string): boolean {
    return this.expandedModuleId === id;
  }

  onCertificateLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['certLogoFallback']) {
      (img as any).dataset['certLogoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }

  /** Estimated duration in minutes for a module (derived from counts; no extra API) */
  getModuleDurationMinutes(item: any): number {
    const v = item?.curriculumVideoLectureCount ?? 0;
    const q = item?.curriculumQuestionCount ?? 0;
    return Math.max(0, v * 5 + q * 2);
  }

  /** Content rows for accordion body: same format as admin (Study Materials : title, Video : title, Q/A (n)) */
  getModuleContentRows(item: any): { displayText: string; icon: string }[] {
    const rows: { displayText: string; icon: string }[] = [];
    if ((item?.curriculumStudyMaterialCount ?? 0) > 0) {
      const text = item?.firstStudyMaterialTitle ? `Study Materials : ${item.firstStudyMaterialTitle}` : `Study Materials (${item.curriculumStudyMaterialCount})`;
      rows.push({ displayText: text, icon: 'fa-book' });
    }
    if ((item?.curriculumVideoLectureCount ?? 0) > 0) {
      const text = item?.firstVideoLectureTitle ? `Video : ${item.firstVideoLectureTitle}` : `Video (${item.curriculumVideoLectureCount})`;
      rows.push({ displayText: text, icon: 'fa-video-camera' });
    }
    if ((item?.curriculumQuestionCount ?? 0) > 0) {
      rows.push({ displayText: `Q/A (${item.curriculumQuestionCount})`, icon: 'fa-question-circle' });
    }
    return rows;
  }

  /** Go to checkout (paid course). */
  fnGotoEntroll(): void {
    if (!this.courseID) return;
    // Safety: if user already bought/enrolled, always go to curriculum instead of checkout.
    this.subscription.add(
      this.appService.getEnrollmentStatus(String(this.courseID).trim()).subscribe({
        next: (r) => {
          if (r?.isEnrolled) {
            this.enrollmentStatusEnrolled = true;
            this.fnResume();
            return;
          }
          this.router.navigate(['/checkout', this.courseID]);
        },
        error: () => {
          // Fallback to previous behavior if status API fails.
          this.router.navigate(['/checkout', this.courseID]);
        }
      })
    );
  }

  /** Enroll in free course: call API, then set enrolled and navigate to curriculum. */
  fnEnrollFree(): void {
    if (!this.courseID || this.enrollingFree) return;
    // Safety: if already enrolled, do not call enroll API; go to curriculum directly.
    this.subscription.add(
      this.appService.getEnrollmentStatus(String(this.courseID).trim()).subscribe({
        next: (r) => {
          if (r?.isEnrolled) {
            this.enrollmentStatusEnrolled = true;
            this.fnResume();
            return;
          }
          this.enrollingFree = true;
          this.subscription.add(
            this.appService.enrollFree(this.courseID).subscribe({
              next: (res) => {
                this.enrollingFree = false;
                if (res?.success || res?.alreadyEnrolled) {
                  this.enrollmentStatusEnrolled = true;
                  this.router.navigate(['/app/student/course', this.courseID]);
                }
              },
              error: () => { this.enrollingFree = false; }
            })
          );
        },
        error: () => {
          // If status API fails, continue with existing free-enroll flow.
          this.enrollingFree = true;
          this.subscription.add(
            this.appService.enrollFree(this.courseID).subscribe({
              next: (res) => {
                this.enrollingFree = false;
                if (res?.success || res?.alreadyEnrolled) {
                  this.enrollmentStatusEnrolled = true;
                  this.router.navigate(['/app/student/course', this.courseID]);
                }
              },
              error: () => { this.enrollingFree = false; }
            })
          );
        }
      })
    );
  }

  getCurriculumList(courseID: string): void {
    this.subscription.add(
      this.appService.getCurriculumByCourseId(courseID).subscribe((res: any) => {
        if (res?.curriculumResponseList) {
          this.curriculumList = res.curriculumResponseList;
        }
      })
    );
  }

  /** Apply API course response to component state (handles both ID and slug responses). */
  private applyCourseResponse(res: any): void {
    const enrolled = res.isProgressedForLoggedInUser ?? res.IsProgressedForLoggedInUser;
    if (res.IsProgressedForLoggedInUser !== undefined) res.isProgressedForLoggedInUser = res.IsProgressedForLoggedInUser;
    this.courses = res;
    this.courseID = res.id ?? res.Id ?? this.courseID;
    this.userId = res.loggedInUserId;
    this.isWishListedAdded = res.isWishListedForLoggedInUser ?? res.IsWishListedForLoggedInUser;
    this.wishId = res.isWishListedIdForLoggedInUser ?? res.IsWishListedIdForLoggedInUser ?? '';
    this.WishListText = this.isWishListedAdded ? 'Wishlisted' : 'Add to Wishlist';
    // Re-check latest enrollment status after course response resolves final course ID.
    if (this.courseID) {
      this.fetchEnrollmentStatusForButton();
    }
    if (enrolled) {
      this.progressed = res.isProgressedIdForLoggedInUser ?? res.IsProgressedIdForLoggedInUser;
      this.enrollmentStatusEnrolled = true;
      this.cdr.detectChanges();
    }
    this.updateBreadcrumb();
  }

  /** Call enrollment-status API – single source of truth for showing Resume vs Enroll/Buy (same as Explore page). */
  private fetchEnrollmentStatusForButton(): void {
    if (!this.courseID) return;
    const courseId = String(this.courseID).trim();
    if (!this.isLoggedIn) {
      this.enrollmentStatusEnrolled = null;
      this.enrollmentStatusLoading = false;
      this.cdr.detectChanges();
      return;
    }
    this.enrollmentStatusLoading = true;
    this.subscription.add(
      // Use the same bulk API as category cards (single id) so inside page and card page stay consistent.
      this.appService.getEnrollmentStatusBulk([courseId]).subscribe({
        next: (r) => {
          const idLower = courseId.toLowerCase();
          const entry = r
            ? Object.entries(r).find(([k]) => (k || '').toLowerCase() === idLower)
            : null;
          const enrolled = entry ? entry[1] : undefined;
          // Set only when API gives an explicit value; otherwise keep fallback to course response.
          this.enrollmentStatusEnrolled = typeof enrolled === 'boolean' ? enrolled : null;
          this.enrollmentStatusLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          // Do not force false on transient/API errors; fallback to course response enrollment flags.
          this.enrollmentStatusEnrolled = null;
          this.enrollmentStatusLoading = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  GetCourseDetails(courseID: string, skipCache?: boolean): void {
    this.subscription.add(
      this.appService.getCourseByCourseID(courseID, skipCache).subscribe((res: any) => {
        if (res) {
          this.applyCourseResponse(res);
        }
      })
    );
  }

  /** Load when :courseID route param is a marketing slug (not GUID). */
  GetCourseDetailsBySlug(slug: string, skipCache?: boolean): void {
    this.subscription.add(
      this.appService.getCourseBySlugOnly(slug, skipCache).subscribe((res: any) => {
        if (res) {
          this.applyCourseResponse(res);
          const id = res.id ?? res.Id;
          if (id) {
            this.getCurriculumList(String(id));
          }
        }
      })
    );
  }

  private updateBreadcrumb(): void {
    const segments: { label: string; url?: string }[] = [
      { label: 'Explore', url: '/app/student/categories' }
    ];
    if (this.courses?.category?.id) {
      segments.push({
        label: this.courses.category.name || 'Category',
        url: `/app/student/category-courses/${this.courses.category.id}/${this.courses.category.name || ''}`
      });
    }
    segments.push({ label: this.courses?.title || 'Course' });
    this.studentBreadcrumb.setBreadcrumb(segments);
  }

  fnAddWishList(): void {
    this.isWishListedAdded = !this.isWishListedAdded;
    this.WishListText = this.isWishListedAdded ? 'Wishlisted' : 'Add to Wishlist';
    if (this.isWishListedAdded) {
      this.subscription.add(
        this.appService.addWishList({ courseId: this.courseID, comments: '' }).subscribe()
      );
    } else {
      this.subscription.add(
        this.appService.updateWishList({ wishListId: this.wishId }).subscribe()
      );
    }
  }

  fnResume(): void {
    localStorage.setItem('course', JSON.stringify(this.courses));
    this.router.navigate(['/app/student/course', this.courseID]);
  }
}
