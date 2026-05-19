import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Category } from 'src/app/modules/adminapp/category/category.model';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { getElearnAppBaseUrl } from 'src/app/core/helpers/app-url.helper';
import { resolveCourseId } from 'src/app/core/helpers/course-id.helper';
import { navigateExploreCourseMarketingPage } from 'src/app/core/helpers/explore-course-nav.helper';
import { environment } from 'src/environments/environment';
import { getTenantSubdomainFromHostname, isCompanyTenantLoginHost } from 'src/app/core/company-portal-host.util';
import {
  resolveViewerTenantCompanyId$,
  sortExploreCoursesTenantFirst
} from 'src/app/core/helpers/explore-tenant-course-sort.helper';

/** Backend ExploreCatalogFilter.CompanyPrivateOnly */
const EXPLORE_CATALOG_COMPANY_PRIVATE_ONLY = 2;

export interface CategoryWithCourses {
  category: any;
  courses: any[];
}

@Component({
  selector: 'app-common-category',
  templateUrl: './common-category.component.html',
  styleUrls: ['./common-category.component.scss'],
  standalone: false
})
export class CommonCategoryComponent implements OnInit, OnDestroy {
  subscription = new Subscription();
  categories = new Array<Category>();
  sortDir = 1;
  /** One section (row) per category; each section lists that category's courses in a 4-per-row grid */
  categoriesWithCourses: CategoryWithCourses[] = [];
  /** Company host + logged in: org-only rows first, then marketplace rows (separate sections). */
  splitExploreLayout = false;
  tenantCategoriesWithCourses: CategoryWithCourses[] = [];
  marketplaceCategoriesWithCourses: CategoryWithCourses[] = [];
  currencyCode = 'INR';
  /** courseId -> true if current user is enrolled (from bulk enrollment-status API) */
  enrollmentByCourseId: Record<string, boolean> = {};
  /** On company portal Explore: show next to each category title (e.g. "Process — Acme"). */
  portalCompanyLabel: string | null = null;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private studentBreadcrumb: StudentBreadcrumbService,
    private authService: AuthenticationService
  ) {
    this.sharedService.category.next('Category');
  }

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Explore' }]);
    this.resolvePortalCompanyLabel();
    this.fetchCategories();
  }

  /** Company name for category headers on tenant Explore (profile field or tenant subdomain). */
  private resolvePortalCompanyLabel(): void {
    if (typeof window === 'undefined' || !isCompanyTenantLoginHost(window.location.hostname)) {
      return;
    }
    const u = this.authService.currentUser();
    const fromCookie = this.trimLabel(u?.companyName ?? u?.CompanyName);
    if (fromCookie) {
      this.portalCompanyLabel = fromCookie;
      return;
    }
    if (!this.authService.currentToken()) {
      this.portalCompanyLabel = this.tenantSubdomainDisplayLabel();
      return;
    }
    this.subscription.add(
      this.authService.getUserInfo().subscribe({
        next: (user: any) => {
          const n = this.trimLabel(user?.companyName ?? user?.CompanyName);
          this.portalCompanyLabel = n || this.tenantSubdomainDisplayLabel();
        },
        error: () => {
          this.portalCompanyLabel = this.tenantSubdomainDisplayLabel();
        }
      })
    );
  }

  private trimLabel(v: unknown): string | null {
    const s = v != null ? String(v).trim() : '';
    return s.length > 0 ? s : null;
  }

  private tenantSubdomainDisplayLabel(): string | null {
    const raw = getTenantSubdomainFromHostname(
      typeof window !== 'undefined' ? window.location.hostname : ''
    );
    if (!raw) {
      return null;
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }

  fetchCategories(): void {
    this.subscription.add(
      this.appService.getPublishedCategories().subscribe(
        (response) => {
          this.categories = response || [];
          this.sortArr('name');
          this.fetchCoursesByCategory();
        },
        (error) => console.log(error)
      )
    );
  }

  private isSplitExploreHost(): boolean {
    return (
      typeof window !== 'undefined' &&
      isCompanyTenantLoginHost(window.location.hostname) &&
      !!this.authService.currentToken()
    );
  }

  /** Paginated GET for Explore (shared helper). */
  private fetchCoursesPages(baseParams: Record<string, string | number | boolean>) {
    const pageSize = 100;
    return this.appService.getCourses({ ...baseParams, pageNumber: 1 }).pipe(
      switchMap((first) => {
        const total = first?.totalNumberOfRecords ?? 0;
        const firstResults = first?.results ?? [];
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (totalPages <= 1) {
          return of(firstResults);
        }
        const extra = [];
        for (let p = 2; p <= totalPages; p++) {
          extra.push(
            this.appService.getCourses({ ...baseParams, pageNumber: p }).pipe(map((r) => r?.results ?? []))
          );
        }
        return forkJoin(extra).pipe(map((batches) => firstResults.concat(...batches)));
      })
    );
  }

  /**
   * Load all public-listing courses in few paginated calls (API caps pageSize at 100),
   * then group by category — avoids one GET per category plus one price GET per course.
   */
  private fetchAllPublicListingCourses() {
    const onTenant = this.isSplitExploreHost();
    const baseParams: Record<string, string | number | boolean> = {
      pageSize: 100,
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true',
      'Filter.IsProgressInfo': true
    };
    if (!onTenant) {
      baseParams['Filter.ForPublicListing'] = true;
    }
    return this.fetchCoursesPages(baseParams);
  }

  private fetchTenantCatalogCoursesOnly() {
    return this.fetchCoursesPages({
      pageSize: 100,
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true',
      'Filter.IsProgressInfo': true,
      'Filter.ExploreCatalogFilter': EXPLORE_CATALOG_COMPANY_PRIVATE_ONLY
    });
  }

  private fetchMarketplaceCatalogCoursesOnly() {
    return this.fetchCoursesPages({
      pageSize: 100,
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true',
      'Filter.IsProgressInfo': true,
      'Filter.ForPublicListing': true
    });
  }

  /** Derive category rows from course payloads (includes org-only categories not on global list). */
  private categoriesDerivedFromCourses(courses: any[]): Category[] {
    const byId = new Map<string, Category>();
    for (const c of courses || []) {
      const id = String((c as any)?.category?.id ?? (c as any)?.category?.Id ?? '').trim();
      if (!id || byId.has(id)) {
        continue;
      }
      const name = (c as any)?.category?.name ?? (c as any)?.category?.Name ?? 'Category';
      byId.set(id, { id, name } as Category);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const na = (a.name || '').toString().toLowerCase();
      const nb = (b.name || '').toString().toLowerCase();
      return na.localeCompare(nb);
    });
  }

  private buildBlocksForCategories(
    categoryList: Category[],
    allCourses: any[],
    tenantId: string | null,
    maxPerCategory: number
  ): CategoryWithCourses[] {
    const byCat = new Map<string, any[]>();
    for (const c of allCourses || []) {
      const catId = String((c as any)?.category?.id ?? (c as any)?.category?.Id ?? '').trim();
      if (!catId) {
        continue;
      }
      if (!byCat.has(catId)) {
        byCat.set(catId, []);
      }
      byCat.get(catId)!.push(c);
    }
    const blocks = categoryList.map((cat) => {
      const catKey = String(cat.id);
      const raw = sortExploreCoursesTenantFirst(byCat.get(catKey) ?? [], tenantId);
      const courses = raw.slice(0, maxPerCategory).map((c) => ({
        ...c,
        id: resolveCourseId(c) || ((c as any)?.id ?? (c as any)?.Id),
        bgColor: this.getRandomColor()
      }));
      return { category: cat, courses };
    });
    return blocks.filter((b) => b.courses?.length > 0);
  }

  private sortExploreBlocks(blocks: CategoryWithCourses[]): CategoryWithCourses[] {
    return [...blocks].sort((a, b) => {
      const nameA = (a.category?.name || '').toString().toLowerCase();
      const nameB = (b.category?.name || '').toString().toLowerCase();
      if (nameA === 'process') {
        return -1;
      }
      if (nameB === 'process') {
        return 1;
      }
      return 0;
    });
  }

  /** Load courses for all categories; one section per category, up to 12 courses per row */
  fetchCoursesByCategory(): void {
    const list = this.categories || [];
    if (list.length === 0) {
      this.categoriesWithCourses = [];
      this.tenantCategoriesWithCourses = [];
      this.marketplaceCategoriesWithCourses = [];
      this.splitExploreLayout = false;
      return;
    }

    if (!this.isSplitExploreHost()) {
      this.splitExploreLayout = false;
      this.tenantCategoriesWithCourses = [];
      this.marketplaceCategoriesWithCourses = [];
      this.subscription.add(
        forkJoin({
          allCourses: this.fetchAllPublicListingCourses(),
          tenantId: resolveViewerTenantCompanyId$(this.authService)
        }).subscribe({
          next: ({ allCourses, tenantId }) => {
            this.categoriesWithCourses = this.sortExploreBlocks(
              this.buildBlocksForCategories(list, allCourses || [], tenantId, 12)
            );
            this.fetchEnrollmentStatusBulk();
          },
          error: (error) => console.log(error)
        })
      );
      return;
    }

    this.splitExploreLayout = true;
    this.subscription.add(
      forkJoin({
        tenantCourses: this.fetchTenantCatalogCoursesOnly(),
        marketplaceCourses: this.fetchMarketplaceCatalogCoursesOnly(),
        tenantId: resolveViewerTenantCompanyId$(this.authService)
      }).subscribe({
        next: ({ tenantCourses, marketplaceCourses, tenantId }) => {
          const tenantList = this.categoriesDerivedFromCourses(tenantCourses || []);
          this.tenantCategoriesWithCourses = this.sortExploreBlocks(
            this.buildBlocksForCategories(tenantList, tenantCourses || [], tenantId, 12)
          );
          this.marketplaceCategoriesWithCourses = this.sortExploreBlocks(
            this.buildBlocksForCategories(list, marketplaceCourses || [], tenantId, 12)
          );
          this.categoriesWithCourses = [];
          this.fetchEnrollmentStatusBulk();
        },
        error: (error) => console.log(error)
      })
    );
  }

  /** Course id for routing/API (maps Id → id via shared helper). */
  courseIdOf(item: any): string {
    return resolveCourseId(item);
  }

  /** Fetch enrollment status for all visible courses so we can show Resume vs Buy/Enroll. */
  private fetchEnrollmentStatusBulk(): void {
    const blocks = [
      ...(this.categoriesWithCourses || []),
      ...(this.tenantCategoriesWithCourses || []),
      ...(this.marketplaceCategoriesWithCourses || [])
    ];
    const courseIds = blocks.flatMap((b) => (b.courses || []).map((c) => this.courseIdOf(c)).filter(Boolean));
    if (courseIds.length === 0 || !this.authService.currentToken()) {
      this.enrollmentByCourseId = {};
      return;
    }
    this.subscription.add(
      this.appService.getEnrollmentStatusBulk(courseIds).subscribe({
        next: (map) => {
          this.enrollmentByCourseId = map || {};
        },
        error: () => { this.enrollmentByCourseId = {}; }
      })
    );
  }

  isEnrolled(courseId: string): boolean {
    if (!courseId) return false;
    const target = String(courseId).toLowerCase();
    for (const k of Object.keys(this.enrollmentByCourseId || {})) {
      if (k.toLowerCase() === target && this.enrollmentByCourseId[k]) {
        return true;
      }
    }
    return false;
  }

  /** Open marketing / buy / wishlist course page (same as CategoryCourses “View course”). */
  viewCourseDetails(event: Event, item: any): void {
    event?.preventDefault();
    event?.stopPropagation();
    const id = this.courseIdOf(item);
    if (!id) {
      return;
    }
    navigateExploreCourseMarketingPage(this.router, item, environment);
  }

  /** Resume: go to curriculum page. */
  fnResume(item: any): void {
    const id = this.courseIdOf(item);
    if (!id) return;
    this.router.navigate(['/app/student/course', id]);
  }

  /** Buy: if not logged in, redirect to login with returnUrl=/app/student/course/:id; after login user lands on course or checkout. If logged in, go to course details page. */
  goToCheckout(item: any): void {
    const id = this.courseIdOf(item);
    if (!id) return;
    const returnUrl = '/app/student/course/' + id;
    const token = this.authService.currentToken();
    if (!token) {
      const baseUrl = getElearnAppBaseUrl();
      const url = baseUrl ? `${baseUrl}/login?returnUrl=${encodeURIComponent(returnUrl)}` : `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
      window.location.href = url;
      return;
    }
    // Marketing/buy page is sibling route categories/course/:id, not a child of categories (relative ['course', id] would not match).
    navigateExploreCourseMarketingPage(this.router, item, environment);
  }

  getDisplayOriginalPrice(item: any): number | null {
    const orig =
      item?.originalAmount ??
      item?.OriginalAmount ??
      item?.originalPrice ??
      item?.coursePriceResponse?.originalPrice ??
      item?.coursePrices?.[0]?.originalPrice ??
      null;
    const offer = this.getOfferPrice(item);
    if (orig == null || offer == null) return null;
    const o = Number(orig);
    const f = Number(offer);
    return o > f ? o : null;
  }

  /** Listing API includes amount (final display price); optional originalAmount when backend sends strike-through list price. */
  getOfferPrice(item: any): number {
    const v =
      item?.discountedPrice ??
      item?.coursePriceResponse?.discountedPrice ??
      item?.coursePrices?.[0]?.discountedPrice ??
      item?.amount ??
      item?.Amount ??
      0;
    return Number(v) || 0;
  }

  /** Row title: org section appends company name; marketplace section is category only; legacy uses suffix when portal label exists. */
  exploreRowTitle(block: CategoryWithCourses, mode: 'tenant' | 'marketplace' | 'legacy'): string {
    const base = (block.category?.name || '').toString();
    if (mode === 'tenant' && this.portalCompanyLabel) {
      return `${base} — ${this.portalCompanyLabel}`;
    }
    if (mode === 'marketplace') {
      return base;
    }
    return this.portalCompanyLabel ? `${base} — ${this.portalCompanyLabel}` : base;
  }

  /** Card pill: org section shows "Company · Category". */
  exploreCardTag(item: any, mode: 'tenant' | 'marketplace' | 'legacy'): string {
    const cat = (item?.category?.name || '').toString();
    if (mode === 'tenant' && this.portalCompanyLabel) {
      return `${this.portalCompanyLabel} · ${cat}`;
    }
    return cat;
  }

  goToCategoryCourses(cat: any, orgOnlySection: boolean): void {
    if (cat?.id == null || cat?.name == null) {
      return;
    }
    const navExtras: { relativeTo: typeof this.activatedRoute.parent; queryParams?: { org: string } } = {
      relativeTo: this.activatedRoute.parent
    };
    if (this.splitExploreLayout && orgOnlySection) {
      navExtras.queryParams = { org: '1' };
    }
    this.router.navigate(['category-courses', cat.id, cat.name], navExtras);
  }

  getRandomColor() {
    var color = Math.floor(0x1000000 * Math.random()).toString(16);
    var color1 = Math.floor(0x1000000 * Math.random()).toString(16);
    var color2 = Math.floor(0x1000000 * Math.random()).toString(16);
    return "background-image: linear-gradient(to bottom right," + "#" + ("000000" + color).slice(-6) + ",#" + ("000000" + color1).slice(-6) + ",#" + ("000000" + color2).slice(-6) + ")";
  }
  sortArr(colName: any): void {
    this.categories.sort((a, b) => {
      const aVal = (a[colName] != null ? String(a[colName]) : '').toLowerCase();
      const bVal = (b[colName] != null ? String(b[colName]) : '').toLowerCase();
      if (aVal < bVal) return -1 * this.sortDir;
      if (aVal > bVal) return 1 * this.sortDir;
      return 0;
    });
  }

  ngOnDestroy(): void {
    this.sharedService.category.next("")
  }
}
