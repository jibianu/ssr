import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { PublicAppService } from 'src/app/modules/publicapp/publicapp.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

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

  /** True when the logged-in user is enrolled (handles API returning camelCase or PascalCase). */
  get isEnrolled(): boolean {
    const c = this.courses;
    if (!c) return false;
    return !!(c as any).isProgressedForLoggedInUser || !!(c as any).IsProgressedForLoggedInUser;
  }

  constructor(
    private appService: AdminAppService,
    private publicAppService: PublicAppService,
    private activateRoute: ActivatedRoute,
    private router: Router,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {}

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
        if (url.includes('category-courses-description/')) {
          const match = url.match(/category-courses-description\/([^/?#]+)/);
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
    const isGuid = GUID_REGEX.test(String(this.courseID).trim());
    if (isGuid) {
      this.GetCourseDetails(this.courseID, true);
      this.getCurriculumList(this.courseID);
    } else {
      // Route param is canonical slug: redirect to canonical URL /courses/:slug (same content, correct address bar)
      this.router.navigate(['/courses', this.courseID], { replaceUrl: true, queryParamsHandling: 'preserve' });
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
    const c = item?.curriculumConceptCount ?? 0;
    return Math.max(0, v * 5 + q * 2 + c * 3);
  }

  /** Content rows for accordion body: concepts, videos, exercises (from API counts) */
  getModuleContentRows(item: any): { label: string; count: number; icon: string }[] {
    const rows: { label: string; count: number; icon: string }[] = [];
    if ((item?.curriculumConceptCount ?? 0) > 0) {
      rows.push({ label: 'Concepts', count: item.curriculumConceptCount, icon: 'fa-lightbulb' });
    }
    if ((item?.curriculumVideoLectureCount ?? 0) > 0) {
      rows.push({ label: 'Videos', count: item.curriculumVideoLectureCount, icon: 'fa-video' });
    }
    if ((item?.curriculumQuestionCount ?? 0) > 0) {
      rows.push({ label: 'Exercises', count: item.curriculumQuestionCount, icon: 'fa-dumbbell' });
    }
    if ((item?.curriculumStudyMaterialCount ?? 0) > 0) {
      rows.push({ label: 'Study materials', count: item.curriculumStudyMaterialCount, icon: 'fa-book' });
    }
    return rows;
  }

  fnGotoEntroll(): void {
    this.router.navigate(['/checkout', this.courseID]);
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
    if (enrolled) {
      this.progressed = res.isProgressedIdForLoggedInUser ?? res.IsProgressedIdForLoggedInUser;
    }
    this.updateBreadcrumb();
  }

  GetCourseDetails(courseID: string, skipCache?: boolean): void {
    this.subscription.add(
      this.appService.getCourseByCourseID(courseID, skipCache).subscribe((res: any) => {
        if (res) {
          const canonicalSlug = (res.canonicalUrl ?? res.slug ?? res.Slug ?? '').toString().trim();
          if (canonicalSlug && GUID_REGEX.test(String(courseID).trim()) && !GUID_REGEX.test(canonicalSlug)) {
            this.router.navigate(['/courses', canonicalSlug], { replaceUrl: true, queryParamsHandling: 'preserve' });
            return;
          }
          this.applyCourseResponse(res);
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
    this.router.navigate(['app/student/details/curriculum-list/', this.courseID]);
  }
}
