import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError, filter, map, switchMap, take } from 'rxjs/operators';
import { Category } from 'src/app/modules/adminapp/category/category.model';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { getElearnAppBaseUrl } from 'src/app/core/helpers/app-url.helper';
import { resolveCourseId } from 'src/app/core/helpers/course-id.helper';
import { navigateExploreCourseMarketingPage } from 'src/app/core/helpers/explore-course-nav.helper';
import { environment } from 'src/environments/environment';
import { getTenantSubdomainFromHostname, isCompanyTenantLoginHost } from 'src/app/core/company-portal-host.util';
import { Role } from 'src/app/shared/models/role';
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
  exploreLoading = false;

  private exploreDataLoaded = false;

  constructor(
    private appService: AdminAppService,
    private sharedService: SharedService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private studentBreadcrumb: StudentBreadcrumbService,
    private authService: AuthenticationService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.sharedService.category.next('Category');
  }

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Explore' }]);
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.resolvePortalCompanyLabel();
    this.startExploreLoadWhenReady();
  }

  /** Wait for auth cookie/role (post-login) before loading courses — avoids empty Explore on company portal. */
  private startExploreLoadWhenReady(): void {
    const role = this.authService.getRoleId();
    const token = this.authService.currentToken();
    if (token && (role != null || this.isOnCompanyPortalRoute())) {
      this.fetchCategories();
      return;
    }
    this.subscription.add(
      this.authService.roleId$.pipe(
        filter((r) => r != null),
        take(1)
      ).subscribe(() => {
        if (!this.exploreDataLoaded) {
          this.fetchCategories();
        }
      })
    );
    // Fallback if roleId$ never emits but token exists (e.g. cookie-only refresh)
    setTimeout(() => {
      if (!this.exploreDataLoaded && this.authService.currentToken()) {
        this.fetchCategories();
      }
    }, 400);
  }

  /** Company name for category headers on tenant Explore (profile field or tenant subdomain). */
  private resolvePortalCompanyLabel(): void {
    const onCompanyPortal =
      this.isCompanyAdminViewer() ||
      this.isOnCompanyPortalRoute() ||
      (typeof window !== 'undefined' && isCompanyTenantLoginHost(window.location.hostname));
    if (!onCompanyPortal) {
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
      this.appService.getPublishedCategories().subscribe({
        next: (response) => {
          this.categories = response || [];
          this.sortArr('name');
          this.fetchCoursesByCategory();
        },
        error: (error) => {
          console.error('Error loading published categories:', error);
          this.categories = [];
          this.fetchCoursesByCategory();
        }
      })
    );
  }

  private isOnCompanyPortalRoute(): boolean {
    const url = (this.router.url || '').toLowerCase();
    if (url.includes('/company/')) {
      return true;
    }
    if (typeof window !== 'undefined') {
      return window.location.pathname.toLowerCase().includes('/company/');
    }
    return false;
  }

  private isCompanyAdminViewer(): boolean {
    const role = this.authService.getRoleId();
    if (role === Role.Company) {
      return true;
    }
    const u = this.authService.currentUser();
    return u?.roleId === Role.Company || u?.RoleId === Role.Company;
  }

  /** Company portal Explore: org courses + marketplace (not only on tenant subdomains). */
  private shouldUseCompanyExploreLayout(): boolean {
    if (!this.authService.currentToken()) {
      return false;
    }
    if (this.isCompanyAdminViewer() || this.isOnCompanyPortalRoute()) {
      return true;
    }
    return (
      typeof window !== 'undefined' &&
      isCompanyTenantLoginHost(window.location.hostname)
    );
  }

  private normalizePagedResults(page: any): { results: any[]; total: number } {
    return {
      results: page?.results ?? page?.Results ?? [],
      total: page?.totalNumberOfRecords ?? page?.TotalNumberOfRecords ?? 0
    };
  }

  /** Org courses for company admin (same catalog as Company → Courses). */
  private fetchCompanyTenantCoursesForExplore() {
    const pageSize = 100;
    const baseParams: Record<string, string | number | boolean> = {
      pageSize,
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true'
    };
    return this.appService.getCompanyCourses({ ...baseParams, pageNumber: 1 }).pipe(
      switchMap((first) => {
        const norm = this.normalizePagedResults(first);
        const totalPages = Math.max(1, Math.ceil(norm.total / pageSize));
        if (totalPages <= 1) {
          return of(norm.results);
        }
        const extra = [];
        for (let p = 2; p <= totalPages; p++) {
          extra.push(
            this.appService
              .getCompanyCourses({ ...baseParams, pageNumber: p })
              .pipe(
                map((r) => this.normalizePagedResults(r).results),
                catchError(() => of([]))
              )
          );
        }
        return forkJoin(extra).pipe(map((batches) => norm.results.concat(...batches)));
      }),
      catchError((err) => {
        console.error('Company explore: org courses failed', err);
        return of([]);
      })
    );
  }

  /** Tenant students on subdomain: private org courses only. */
  private fetchOrgCoursesForExplore() {
    if (this.isCompanyAdminViewer() || this.isOnCompanyPortalRoute()) {
      return this.fetchCompanyTenantCoursesForExplore();
    }
    return this.fetchTenantCatalogCoursesOnly();
  }

  /** Paginated GET for Explore (shared helper). */
  private fetchCoursesPages(baseParams: Record<string, string | number | boolean>) {
    const pageSize = 100;
    return this.appService.getCourses({ ...baseParams, pageNumber: 1 }).pipe(
      switchMap((first) => {
        const norm = this.normalizePagedResults(first);
        const totalPages = Math.max(1, Math.ceil(norm.total / pageSize));
        if (totalPages <= 1) {
          return of(norm.results);
        }
        const extra = [];
        for (let p = 2; p <= totalPages; p++) {
          extra.push(
            this.appService.getCourses({ ...baseParams, pageNumber: p }).pipe(
              map((r) => this.normalizePagedResults(r).results),
              catchError(() => of([]))
            )
          );
        }
        return forkJoin(extra).pipe(map((batches) => norm.results.concat(...batches)));
      }),
      catchError((err) => {
        console.error('Explore: course list failed', err);
        return of([]);
      })
    );
  }

  private fetchPublicCoursesPages() {
    const pageSize = 100;
    const baseParams: Record<string, string | number> = { pageSize, pageNumber: 1 };
    return this.appService.getPublicCourses(baseParams).pipe(
      switchMap((first) => {
        const norm = this.normalizePagedResults(first);
        const totalPages = Math.max(1, Math.ceil(norm.total / pageSize));
        if (totalPages <= 1) {
          return of(norm.results);
        }
        const extra = [];
        for (let p = 2; p <= totalPages; p++) {
          extra.push(
            this.appService.getPublicCourses({ pageSize, pageNumber: p }).pipe(
              map((r) => this.normalizePagedResults(r).results),
              catchError(() => of([]))
            )
          );
        }
        return forkJoin(extra).pipe(map((batches) => norm.results.concat(...batches)));
      }),
      catchError((err) => {
        console.error('Explore: marketplace courses failed', err);
        return of([]);
      })
    );
  }

  /**
   * Load all public-listing courses in few paginated calls (API caps pageSize at 100),
   * then group by category — avoids one GET per category plus one price GET per course.
   */
  private fetchAllPublicListingCourses() {
    const baseParams: Record<string, string | number | boolean> = {
      pageSize: 100,
      'Sort.PropertyName': 'Title',
      'Sort.IsAscending': 'true',
      'Filter.IsProgressInfo': true,
      'Filter.ForPublicListing': true
    };
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
    if (this.isCompanyAdminViewer() || this.isOnCompanyPortalRoute()) {
      return this.fetchPublicCoursesPages();
    }
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
      const rawId = String((c as any)?.category?.id ?? (c as any)?.category?.Id ?? '').trim();
      const id = rawId || CommonCategoryComponent.UNCATEGORIZED_ID;
      if (byId.has(id)) {
        continue;
      }
      const name =
        rawId
          ? (c as any)?.category?.name ?? (c as any)?.category?.Name ?? 'Category'
          : 'General';
      byId.set(id, { id, name } as Category);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const na = (a.name || '').toString().toLowerCase();
      const nb = (b.name || '').toString().toLowerCase();
      return na.localeCompare(nb);
    });
  }

  private static readonly UNCATEGORIZED_ID = '__uncategorized__';

  private buildBlocksForCategories(
    categoryList: Category[],
    allCourses: any[],
    tenantId: string | null,
    maxPerCategory: number
  ): CategoryWithCourses[] {
    const byCat = new Map<string, any[]>();
    for (const c of allCourses || []) {
      const catId =
        String((c as any)?.category?.id ?? (c as any)?.category?.Id ?? '').trim() ||
        CommonCategoryComponent.UNCATEGORIZED_ID;
      if (!byCat.has(catId)) {
        byCat.set(catId, []);
      }
      byCat.get(catId)!.push(c);
    }
    let categories = categoryList || [];
    if (byCat.has(CommonCategoryComponent.UNCATEGORIZED_ID)) {
      const hasUncat = categories.some(
        (cat) => String(cat.id) === CommonCategoryComponent.UNCATEGORIZED_ID
      );
      if (!hasUncat) {
        categories = [
          ...categories,
          { id: CommonCategoryComponent.UNCATEGORIZED_ID, name: 'General' } as Category
        ];
      }
    }
    const blocks = categories.map((cat) => {
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

  /** If category grouping yields nothing, show one row with all courses. */
  private fallbackAllCoursesBlock(courses: any[], tenantId: string | null): CategoryWithCourses[] {
    if (!courses?.length) {
      return [];
    }
    const sorted = sortExploreCoursesTenantFirst(courses, tenantId).slice(0, 48).map((c) => ({
      ...c,
      id: resolveCourseId(c) || ((c as any)?.id ?? (c as any)?.Id),
      bgColor: this.getRandomColor()
    }));
    return [
      {
        category: { id: 'all', name: 'All courses' } as Category,
        courses: sorted
      }
    ];
  }

  private applyCompanyExploreResults(
    tenantCourses: any[],
    marketplaceCourses: any[],
    tenantId: string | null,
    list: Category[]
  ): void {
    const tenantList = this.categoriesDerivedFromCourses(tenantCourses || []);
    let tenantBlocks = this.sortExploreBlocks(
      this.buildBlocksForCategories(tenantList, tenantCourses || [], tenantId, 12)
    );
    if (!tenantBlocks.length && (tenantCourses?.length ?? 0) > 0) {
      tenantBlocks = this.fallbackAllCoursesBlock(tenantCourses, tenantId);
    }
    this.tenantCategoriesWithCourses = tenantBlocks;

    const marketplaceCats =
      list.length > 0 ? list : this.categoriesDerivedFromCourses(marketplaceCourses || []);
    let marketBlocks = this.sortExploreBlocks(
      this.buildBlocksForCategories(marketplaceCats, marketplaceCourses || [], tenantId, 12)
    );
    if (!marketBlocks.length && (marketplaceCourses?.length ?? 0) > 0) {
      marketBlocks = this.fallbackAllCoursesBlock(marketplaceCourses, tenantId);
    }
    this.marketplaceCategoriesWithCourses = marketBlocks;
  }

  /** Load courses for all categories; one section per category, up to 12 courses per row */
  fetchCoursesByCategory(): void {
    const list = this.categories || [];
    this.exploreLoading = true;
    this.exploreDataLoaded = true;

    if (this.shouldUseCompanyExploreLayout()) {
      this.splitExploreLayout = true;
      this.categoriesWithCourses = [];
      this.subscription.add(
        forkJoin({
          tenantCourses: this.fetchOrgCoursesForExplore(),
          marketplaceCourses: this.fetchMarketplaceCatalogCoursesOnly(),
          tenantId: resolveViewerTenantCompanyId$(this.authService).pipe(catchError(() => of(null)))
        }).subscribe({
          next: ({ tenantCourses, marketplaceCourses, tenantId }) => {
            this.applyCompanyExploreResults(
              tenantCourses || [],
              marketplaceCourses || [],
              tenantId,
              list
            );
            this.exploreLoading = false;
            this.fetchEnrollmentStatusBulk();
          },
          error: (error) => {
            console.error('Error loading company explore courses:', error);
            this.exploreLoading = false;
          }
        })
      );
      return;
    }

    this.splitExploreLayout = false;
    this.tenantCategoriesWithCourses = [];
    this.marketplaceCategoriesWithCourses = [];
    this.subscription.add(
      forkJoin({
        allCourses: this.fetchAllPublicListingCourses(),
        tenantId: resolveViewerTenantCompanyId$(this.authService)
      }).subscribe({
        next: ({ allCourses, tenantId }) => {
          const derived = this.categoriesDerivedFromCourses(allCourses || []);
          const categoryList = list.length > 0 ? list : derived;
          this.categoriesWithCourses = this.sortExploreBlocks(
            this.buildBlocksForCategories(categoryList, allCourses || [], tenantId, 12)
          );
          this.exploreLoading = false;
          this.fetchEnrollmentStatusBulk();
        },
        error: (error) => {
          console.error('Error loading explore courses:', error);
          this.exploreLoading = false;
        }
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
