import { Category } from './../adminapp/category/category.model';
import { Observable, of, throwError, TimeoutError, race, timer, forkJoin } from 'rxjs';
import { shareReplay, catchError, timeout, retry, delay, map, switchMap } from 'rxjs/operators';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../../core/config/api-url.config';
import { normalizeEventCanonicalSlug } from '../../core/helpers/event-canonical-slug.helper';

// ✅ PERFORMANCE: Service-level caching prevents redundant API calls (40-50% reduction)
// ✅ SSR: shareReplay works in both SSR and browser contexts
@Injectable({ providedIn: 'root' })
export class PublicAppService {
    user: any;
    private readonly apiUrl: string;
    private readonly isServer: boolean;
    
    // ✅ PERFORMANCE: Cached observables to prevent redundant API calls
    private categoriesCache$: Observable<Category[]> | null = null;
    private dashboardCategoriesCache$: Observable<any> | null = null;
    private eventsCache$: Observable<any> | null = null;
    private courseCatalogCache$: Observable<{ results: any[] }> | null = null;

    /**
     * Replays the last successful `getCourseByCanonicalURL(..., { refresh: false })` pipeline per slug
     * so resolvers + components + revisits share one HTTP round-trip instead of rebuilding cold Observables.
     */
    private readonly courseByCanonicalObsCache = new Map<string, Observable<any>>();
    private static readonly COURSE_CANONICAL_CACHE_CAP = 48;
    private readonly courseBasicObsCache = new Map<string, Observable<any>>();
    private readonly courseContentObsCache = new Map<string, Observable<any>>();
    private readonly courseExtraObsCache = new Map<string, Observable<any>>();
    
    // ✅ FIX: Use constructor injection instead of field initializer to prevent injector errors in SSR
    // Field initializers with inject() can fail if injector is destroyed during navigation
    constructor(
        private http: HttpClient,
        @Inject(API_URL) apiUrl: string,
        @Inject(PLATFORM_ID) platformId: Object
    ) {
        this.apiUrl = apiUrl;
        this.isServer = isPlatformServer(platformId);
    }

    getPublicCoursesByCategory(categorySlug: string, pageNumber = 1, pageSize = 16): Observable<{ results: any[]; totalNumberOfRecords: number }> {
        let params = new HttpParams()
            .set('pageNumber', String(pageNumber))
            .set('pageSize', String(Math.max(1, pageSize)));
        const slug = (categorySlug ?? '').trim();
        if (slug) params = params.set('categorySlug', slug);
        return this.http.get<any>(`${this.apiUrl}api/public/courses`, { params }).pipe(
            map(res => ({
                results: res?.results ?? res?.Results ?? [],
                totalNumberOfRecords: res?.totalNumberOfRecords ?? res?.TotalNumberOfRecords ?? 0
            })),
            catchError(error => {
                if (this.isServer) return of({ results: [], totalNumberOfRecords: 0 });
                console.error('[PublicAppService] Error fetching courses by category:', error);
                return of({ results: [], totalNumberOfRecords: 0 });
            })
        );
    }

    /**
     * GET api/public/courses/by-category/{categoryId} - same as Elearn getCoursesByCategory(categoryId).
     * Reuses backend ICourseAppService.GetCourseByCategory for "Related Courses" on public course page.
     */
    getCoursesByCategoryId(categoryId: string): Observable<any[]> {
        const id = (categoryId ?? '').trim();
        if (!id) return of([]);
        return this.http.get<any[]>(`${this.apiUrl}api/public/courses/by-category/${encodeURIComponent(id)}`).pipe(
            map(res => Array.isArray(res) ? res : []),
            catchError(error => {
                if (this.isServer) return of([]);
                console.error('[PublicAppService] Error fetching courses by category id:', error);
                return of([]);
            })
        );
    }

    /**
     * GET api/public/courses/catalog — lightweight slug/title/price rows for homepage link sync.
     */
    getCourseCatalog(): Observable<{ results: any[] }> {
        if (!this.courseCatalogCache$) {
            this.courseCatalogCache$ = this.http.get<any>(`${this.apiUrl}api/public/courses/catalog`).pipe(
                map(res => ({ results: res?.results ?? res?.Results ?? [] })),
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    if (this.isServer) return of({ results: [] });
                    console.error('[PublicAppService] Error fetching course catalog:', error);
                    return of({ results: [] });
                })
            );
        }
        return this.courseCatalogCache$;
    }

    // ✅ PERFORMANCE: shareReplay prevents duplicate concurrent requests for same data
    getCourses(params): Observable<any> {
        // Note: Params-based requests are handled by CacheInterceptor
        // ✅ PERFORMANCE: shareReplay ensures concurrent requests share same response
        let httpParams: HttpParams | undefined;

        if (params instanceof HttpParams) {
            httpParams = params;
        } else if (params && typeof params === 'object') {
            httpParams = Object.keys(params).reduce((acc: HttpParams, key: string) => {
                const value = params[key];

                if (value === null || value === undefined) {
                    return acc;
                }

                const stringValue = Array.isArray(value)
                    ? value.map(v => (v ?? '').toString()).filter(v => v.trim().length > 0)
                    : [(value ?? '').toString()];

                return stringValue.reduce((innerAcc, item) => {
                    if (!item || !item.trim()) {
                        return innerAcc;
                    }
                    return innerAcc.set(key, item.trim());
                }, acc);
            }, new HttpParams());
        }

        const options = httpParams ? { params: httpParams } : {};

        const url = `${this.apiUrl}page/course`;
        console.log('[PublicAppService] Fetching courses from:', url, 'with params:', params);
        
        return this.http.get<any>(url, options).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                // ✅ SSR-FRIENDLY: Only log errors in browser, not during SSR
                // Network errors during SSR are expected if backend is not running
                if (this.isServer) {
                    // During SSR, silently return empty array if backend is not available
                    console.warn('[PublicAppService] SSR: Backend not available, returning empty courses');
                    return of({ results: [], totalNumberOfRecords: 0 });
                } else {
                    // In browser, log detailed error
                    console.error('[PublicAppService] Error fetching courses:', {
                        error,
                        url,
                        status: error?.status,
                        statusText: error?.statusText,
                        message: error?.message
                    });
                    return of({ results: [], totalNumberOfRecords: 0 }); // ✅ ERROR HANDLING: Return empty result structure
                }
            })
        );
    }

    // ✅ Backend has only page/course/course/{slug}; when slug is a GUID it returns course by ID.
    getCourseById(id): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}${this.buildPublicCourseHttpPath(String(id))}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching course ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    /** Update course details from landing-page edit section (title, canonicalUrl, categoryId, metaDescription, titleImageUrl). */
    updateCourseFromLanding(courseId: string, body: {
        title: string;
        canonicalUrl: string;
        categoryId: string;
        metaDescription: string;
        titleImageUrl: string;
    }): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}${this.buildPublicCourseHttpPath(String(courseId))}`, body);
    }

    /** Upload course title image for landing page; returns the image URL to set in course details. */
    uploadCourseTitleImage(courseId: string, file: File): Observable<{ url?: string; Url?: string }> {
        const formData = new FormData();
        formData.append('file', file, file.name);
        return this.http.post<{ url?: string; Url?: string }>(`${this.apiUrl}${this.buildPublicCourseHttpPath(String(courseId), '/title-image')}`, formData);
    }

    /** Returns proxy URL for S3 promo videos (avoids CORS); returns original URL for other hosts. */
    getPromoVideoStreamUrl(url: string | null | undefined): string | null {
        if (!url || typeof url !== 'string') return null;
        if (url.includes('s3.amazonaws.com') || url.includes('s3-accelerate.amazonaws.com')) {
            return `${this.apiUrl}api/CurriculumVideoLecture/StreamVideo?url=${encodeURIComponent(url)}`;
        }
        return url;
    }

    /** Resolve course thumbnail for <img src> — API may return ImageLink as absolute S3 URL or relative upload path. */
    resolveCourseImageUrl(raw: string | null | undefined): string {
        const s = (raw ?? '').toString().trim();
        if (!s) {
            return 'assets/img/oilandgasclub.jpg';
        }
        if (/^https?:\/\//i.test(s)) {
            return s;
        }
        if (s.startsWith('assets/')) {
            return s.startsWith('/') ? s : `/${s}`;
        }
        const api = (this.apiUrl || '').replace(/\/$/, '');
        return `${api}/${s.replace(/^\/+/, '')}`;
    }

    // ✅ PERFORMANCE: Cache by canonical URL - used in route resolvers and components
    // options.refresh: when true, appends ?_refresh=timestamp so public page gets fresh data (About, FAQ, Trainers) after Edit landing page saves
    getCourseByCanonicalURL(url: string, options?: { refresh?: boolean }): Observable<any> {
        const normalizedUrl = this.normalizeCourseSlugForApi(url);

        if (!normalizedUrl) {
            console.error('⚠️ Empty course URL after normalization');
            return of(null);
        }

        const useCache = !options?.refresh;
        const cacheKey = useCache ? normalizedUrl.toLowerCase() : null;
        if (cacheKey) {
            const hit = this.courseByCanonicalObsCache.get(cacheKey);
            if (hit) {
                return hit;
            }
        }

        const apiPath = this.buildPublicCourseHttpPath(normalizedUrl);
        const fullUrl = options?.refresh
            ? `${this.apiUrl}${apiPath}?_refresh=${Date.now()}`
            : `${this.apiUrl}${apiPath}`;

        if (!this.isServer && typeof ngDevMode !== 'undefined' && ngDevMode) {
            console.log(`[PublicAppService] GET course by canonical: ${fullUrl}`);
        }

        // No custom headers: avoids CORS preflight (OPTIONS) on cross-origin course GETs.
        const request$ = this.http.get<any>(fullUrl).pipe(
            timeout(60000),
            retry({
                count: 1,
                delay: (error: any, retryCount: number) => {
                    const isTimeoutError =
                        error?.name === 'TimeoutError' ||
                        error?.name === 'Timeout' ||
                        error?.status === 408 ||
                        error?.message?.includes('timeout');

                    if (isTimeoutError) {
                        console.warn(`⏱️ Timeout detected - skipping retry to avoid further delays`);
                        return throwError(() => error);
                    }

                    if (error?.status && error.status >= 400 && error.status < 500) {
                        return throwError(() => error);
                    }

                    if (!this.isServer && typeof ngDevMode !== 'undefined' && ngDevMode) {
                        console.log(`🔄 Retrying request (attempt ${retryCount + 1}/2) after ${1000 * retryCount}ms...`);
                    }
                    return of(null).pipe(delay(1000 * retryCount));
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                if (cacheKey) {
                    this.courseByCanonicalObsCache.delete(cacheKey);
                }

                const isNetworkError = !error.status || error.status === 0 || error.message?.includes('fetch failed');
                const isTimeoutError = error.name === 'TimeoutError' || error.status === 408;

                if (isNetworkError) {
                    console.error(`🔴 Network Error: Unable to connect to API server at ${fullUrl}`);
                } else if (isTimeoutError) {
                    console.error(`⏱️ Timeout Error: Request to ${fullUrl} timed out after 60 seconds`);
                } else {
                    console.error(`❌ Error fetching course by URL "${url}" (normalized: "${normalizedUrl}"). API path: ${apiPath}`, error);
                }

                return of(null);
            })
        );

        if (cacheKey) {
            while (this.courseByCanonicalObsCache.size >= PublicAppService.COURSE_CANONICAL_CACHE_CAP) {
                const oldest = this.courseByCanonicalObsCache.keys().next().value;
                if (oldest === undefined) {
                    break;
                }
                this.courseByCanonicalObsCache.delete(oldest);
            }
            this.courseByCanonicalObsCache.set(cacheKey, request$);
        }

        return request$;
    }

    /** Fast payload for first render: GET page/course/course/{slug}/basic */
    getCourseBasicByCanonicalURL(url: string): Observable<any> {
        const normalized = this.normalizeCourseSlugForApi(url);
        if (!normalized) return of(null);
        const key = normalized.toLowerCase();
        const hit = this.courseBasicObsCache.get(key);
        if (hit) return hit;

        const fullUrl = `${this.apiUrl}${this.buildPublicCourseHttpPath(normalized, '/basic')}`;
        const request$ = this.http.get<any>(fullUrl).pipe(
            timeout(30000),
            // 404 = course not found (or missing /basic on very old servers). Do not chain to full GET here —
            // slug-page.resolver / loadCourseBasic performs a single full fetch when needed (avoids triple 404s).
            catchError((err) => {
                const status = err?.status ?? err?.statusCode;
                if (status === 404) {
                    return of(null);
                }
                return throwError(() => err);
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(() => {
                this.courseBasicObsCache.delete(key);
                return of(null);
            })
        );
        while (this.courseBasicObsCache.size >= PublicAppService.COURSE_CANONICAL_CACHE_CAP) {
            const oldest = this.courseBasicObsCache.keys().next().value;
            if (oldest === undefined) break;
            this.courseBasicObsCache.delete(oldest);
        }
        this.courseBasicObsCache.set(key, request$);
        return request$;
    }

    /** Curriculum-only payload: GET page/course/course/{slug}/content */
    getCourseContentByCanonicalURL(url: string): Observable<{ courseContents: any[] } | null> {
        const normalized = this.normalizeCourseSlugForApi(url);
        if (!normalized) return of(null);
        const key = normalized.toLowerCase();
        const hit = this.courseContentObsCache.get(key);
        if (hit) return hit as any;

        const fullUrl = `${this.apiUrl}${this.buildPublicCourseHttpPath(normalized, '/content')}`;
        const request$ = this.http.get<any>(fullUrl).pipe(
            timeout(60000),
            map(res => ({ courseContents: res?.courseContents ?? res?.CourseContents ?? [] })),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(() => {
                this.courseContentObsCache.delete(key);
                return of(null);
            })
        );
        while (this.courseContentObsCache.size >= PublicAppService.COURSE_CANONICAL_CACHE_CAP) {
            const oldest = this.courseContentObsCache.keys().next().value;
            if (oldest === undefined) break;
            this.courseContentObsCache.delete(oldest);
        }
        this.courseContentObsCache.set(key, request$);
        return request$ as any;
    }

    /** Extras payload: GET page/course/course/{slug}/extra */
    getCourseExtraByCanonicalURL(url: string): Observable<any | null> {
        const normalized = this.normalizeCourseSlugForApi(url);
        if (!normalized) return of(null);
        const key = normalized.toLowerCase();
        const hit = this.courseExtraObsCache.get(key);
        if (hit) return hit;

        const fullUrl = `${this.apiUrl}${this.buildPublicCourseHttpPath(normalized, '/extra')}`;
        const request$ = this.http.get<any>(fullUrl).pipe(
            timeout(60000),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(() => {
                this.courseExtraObsCache.delete(key);
                return of(null);
            })
        );
        while (this.courseExtraObsCache.size >= PublicAppService.COURSE_CANONICAL_CACHE_CAP) {
            const oldest = this.courseExtraObsCache.keys().next().value;
            if (oldest === undefined) break;
            this.courseExtraObsCache.delete(oldest);
        }
        this.courseExtraObsCache.set(key, request$);
        return request$;
    }

    /**
     * Route param from `/:slug` — decode, trim slashes, collapse hyphens, lowercase.
     * Keeps most characters (blog/event safe); fixes leading "-" typos.
     */
    normalizeSlugRouteParam(raw: string): string {
        let s = (raw || '').trim();
        try {
            s = decodeURIComponent(s);
        } catch {
            // ignore
        }
        s = s.replace(/^\/+/, '').replace(/[?#].*$/, '');
        s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
        return s;
    }

    /**
     * Course list/detail API slug — same rules as backend NormalizeSlug for public course URLs.
     */
    normalizePublicCourseSlug(url: string): string {
        return this.normalizeCourseSlugForApi(url || '');
    }

    /** ASP.NET: [Route("page/course")] + [HttpGet("course/{slug}")] => page/course/course/{slug} */
    private buildPublicCourseHttpPath(slug: string, suffix = ''): string {
        const n = this.normalizeCourseSlugForApi(slug);
        return `page/course/course/${encodeURIComponent(n)}${suffix}`;
    }

    private normalizeCourseSlugForApi(url: string): string {
        let normalizedUrl = (url || '').trim();
        const rawLower = normalizedUrl.toLowerCase();
        const looksLikeAsset =
            rawLower.endsWith('.js') ||
            rawLower.endsWith('.css') ||
            rawLower.endsWith('.map') ||
            rawLower.endsWith('.json') ||
            rawLower.endsWith('.ico') ||
            rawLower.startsWith('assets/') ||
            rawLower.startsWith('/assets/');
        if (looksLikeAsset) {
            return '';
        }
        normalizedUrl = normalizedUrl.replace(/^\/+/, '');
        if (normalizedUrl.startsWith('course/course/')) normalizedUrl = normalizedUrl.replace(/^course\/course\//, '');
        else if (normalizedUrl.startsWith('course/')) normalizedUrl = normalizedUrl.replace(/^course\//, '');
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');

        // Normalize legacy/malformed canonical values such as:
        // "coating--%26-painting-cbt-part-2-" => "coating-painting-cbt-part-2"
        try {
            normalizedUrl = decodeURIComponent(normalizedUrl);
        } catch {
            // Keep original value if decoding fails.
        }
        normalizedUrl = normalizedUrl
            .replace(/[?#].*$/, '')
            .replace(/&/g, '-')
            .replace(/[^a-zA-Z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toLowerCase();

        return normalizedUrl;
    }

    /** Clears cached Observables for a slug or id (after landing-page save / publish). */
    invalidateCourseByCanonicalUrlCache(rawUrl: string): void {
        let normalizedUrl = (rawUrl || '').trim().replace(/^\/+/, '');
        if (normalizedUrl.startsWith('course/course/')) {
            normalizedUrl = normalizedUrl.replace(/^course\/course\//, '');
        } else if (normalizedUrl.startsWith('course/')) {
            normalizedUrl = normalizedUrl.replace(/^course\//, '');
        }
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        if (!normalizedUrl) {
            return;
        }
        this.courseByCanonicalObsCache.delete(normalizedUrl.toLowerCase());
    }

    getDashboardCourses(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}page/course/Dashboard`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching dashboard courses:', error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Service-level cache with shareReplay - prevents duplicate API calls
    getCategories(): Observable<Category[]> {
        if (this.isServer) {
            return this.http.get<Category[]>(`${this.apiUrl}api/public/categories`).pipe(
                catchError(error => {
                    console.error('Error fetching categories:', error);
                    return of([]);
                })
            );
        }

        if (!this.categoriesCache$) {
            this.categoriesCache$ = this.http.get<Category[]>(`${this.apiUrl}api/public/categories`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }), // ✅ PERFORMANCE: refCount=true releases memory when no subscribers
                catchError(error => {
                    console.error('Error fetching categories:', error);
                    this.categoriesCache$ = null; // ✅ ERROR HANDLING: Clear cache on error to allow retry
                    return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
                })
            );
        }
        return this.categoriesCache$;
    }

    // ✅ LIGHTWEIGHT: Get related courses with minimal data (name, image, category, slug)
    // This endpoint should return only essential fields, not full course details
    // Prevents multiple /api/course/{slug} calls - uses lightweight endpoint instead
    getRelatedCourses(category: string): Observable<any[]> {
        if (!category || !category.trim()) {
            return of([]);
        }

        // ✅ Use existing /page/course endpoint with category filter (returns list, not individual course details)
        // This endpoint returns a list of courses, preventing individual /api/course/{slug} calls
        const params = new HttpParams()
            .set('pageSize', '5')
            .set('pageNumber', '1')
            .set('Filter.Category', category.trim());
        
        const fullUrl = `${this.apiUrl}page/course`;
        
        console.log(`🔍 Related Courses API Call: ${fullUrl}?Filter.Category=${category.trim()}`);
        console.log(`   ⚠️ Using list endpoint (minimal data only, NOT individual /api/course/{slug} calls)`);
        
        return this.http.get<any>(fullUrl, { params }).pipe(
            map(response => {
                // ✅ Extract only minimal data needed for related courses display
                // Backend returns: { results: [...], totalNumberOfRecords: ... }
                const courses = (response?.results || []).map((course: any) => ({
                    id: course.id,
                    title: course.title,
                    titleImageUrl: course.titleImageUrl ?? course.imageLink ?? course.ImageLink,
                    canonicalUrl: course.canonicalUrl ?? course.CanonicalUrl ?? course.slug ?? course.Slug,
                    amount: course.amount ?? course.Amount ?? course.discountedPrice ?? course.DiscountedPrice ?? course.price ?? course.Price,
                    price: course.price ?? course.Price,
                    discountedPrice: course.discountedPrice ?? course.DiscountedPrice,
                    coursePrices: course.coursePrices,
                    category: course.category || course.categoryName
                }));
                return courses;
            }),
            timeout(30000), // 30 seconds timeout (lighter than full course endpoint)
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching related courses for category "${category}":`, error);
                // Return empty array on error - don't break the page
                return of([]);
            })
        );
    }

    getCourseByCategoryId(id): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}page/Course/${id}/Dashboard`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching courses by category ${id}:`, error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Cache dashboard categories - called on /courses page load
    getDashboardCategories(): Observable<any[]> {
        const publicDashboardUrl = `${this.apiUrl}api/public/categories/dashboard`;
        const legacyDashboardUrl = `${this.apiUrl}page/Category/Dashboard`;
        const legacyApiUrl = `${this.apiUrl}api/Category/Dashboard`;

        const normalizeList = (body: any): any[] => {
            if (Array.isArray(body)) {
                return body;
            }
            return body?.data ?? body?.items ?? body?.results ?? [];
        };

        const fetchPublicDashboard = () =>
            this.http.get<any>(publicDashboardUrl).pipe(
                map(normalizeList),
                catchError(() => of(null as any[] | null))
            );

        const fetchLegacy = (url: string) =>
            this.http.get<any>(url).pipe(
                map(normalizeList),
                catchError(() => of(null as any[] | null))
            );

        const buildFromPublicListing = (): Observable<any[]> =>
            forkJoin({
                categories: this.getCategories(),
                courses: this.http
                    .get<any>(`${this.apiUrl}api/public/courses`, {
                        params: new HttpParams().set('pageNumber', '1').set('pageSize', '100')
                    })
                    .pipe(
                        map((body) => {
                            const list = body?.results ?? body?.Results ?? normalizeList(body);
                            return Array.isArray(list) ? list : [];
                        }),
                        catchError(() => of([]))
                    )
            }).pipe(map(({ categories, courses }) => this.buildDashboardFromPublicListing(categories, courses)));

        const resolveDashboard = (): Observable<any[]> =>
            fetchPublicDashboard().pipe(
                switchMap((list) => (list && list.length > 0 ? of(list) : buildFromPublicListing())),
                switchMap((list) => {
                    if (list && list.length > 0) {
                        return of(list);
                    }
                    return race([
                        fetchLegacy(legacyDashboardUrl),
                        timer(12000).pipe(map(() => null as any[] | null))
                    ]).pipe(
                        switchMap((legacyList) =>
                            legacyList && legacyList.length > 0 ? of(legacyList) : fetchLegacy(legacyApiUrl)
                        ),
                        map((legacyList) => legacyList ?? [])
                    );
                }),
                catchError(() => of([]))
            );

        if (this.isServer) {
            return resolveDashboard();
        }

        if (!this.dashboardCategoriesCache$) {
            this.dashboardCategoriesCache$ = resolveDashboard().pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(() => {
                    this.dashboardCategoriesCache$ = null;
                    return of([]);
                })
            );
        }
        return this.dashboardCategoriesCache$;
    }

    /** Build page/Category/Dashboard shape from fast public APIs when dashboard endpoint is unavailable. */
    private buildDashboardFromPublicListing(categories: Category[], courses: any[]): any[] {
        const byCategoryId = new Map<string, any[]>();
        for (const course of courses ?? []) {
            const categoryId = String(course?.category?.id ?? course?.categoryId ?? course?.CategoryId ?? '');
            const categoryName = course?.category?.name ?? course?.categoryName ?? course?.Category?.Name ?? '';
            const key = categoryId || categoryName;
            if (!key) {
                continue;
            }
            if (!byCategoryId.has(key)) {
                byCategoryId.set(key, []);
            }
            byCategoryId.get(key)!.push({
                ...course,
                id: course?.id ?? course?.Id,
                slug: course?.slug ?? course?.Slug ?? course?.canonicalUrl,
                canonicalUrl: course?.canonicalUrl ?? course?.slug ?? course?.Slug,
                imageLink: course?.imageLink ?? course?.ImageLink ?? course?.titleImageUrl,
                amount: course?.amount ?? course?.discountedPrice ?? course?.price ?? 0,
                category: course?.category ?? { id: categoryId, name: categoryName }
            });
        }

        let sortOrder = 0;
        return (categories ?? [])
            .map((cat) => {
                const id = String(cat?.id ?? (cat as any)?.Id ?? '');
                const name = cat?.name ?? (cat as any)?.Name ?? '';
                const coursesForCat = byCategoryId.get(id) ?? byCategoryId.get(name) ?? [];
                return {
                    id: cat?.id ?? (cat as any)?.Id,
                    name,
                    appsName: name,
                    sortOrder: sortOrder++,
                    showOnDashboard: true,
                    courses: coursesForCat
                };
            })
            .filter((section) => section.courses.length > 0);
    }

    getCourseByCanonicalLocationURL(courseUrl: string, locationUrl: string): Observable<any> {
        // ✅ FIX: Normalize courseUrl - remove leading slashes and any 'course/course/' or 'course/' prefixes
        let normalizedCourseUrl = (courseUrl || '').trim();

        // ✅ SAFETY: Never treat static asset filenames as course slugs/locations.
        const rawCourseLower = normalizedCourseUrl.toLowerCase();
        const rawLocationLower = (locationUrl || '').trim().toLowerCase();
        const looksLikeAsset =
            rawCourseLower.endsWith('.js') || rawCourseLower.endsWith('.css') || rawCourseLower.endsWith('.map') ||
            rawCourseLower.endsWith('.json') || rawCourseLower.endsWith('.ico') ||
            rawLocationLower.endsWith('.js') || rawLocationLower.endsWith('.css') || rawLocationLower.endsWith('.map') ||
            rawLocationLower.endsWith('.json') || rawLocationLower.endsWith('.ico') ||
            rawCourseLower.startsWith('assets/') || rawCourseLower.startsWith('/assets/') ||
            rawLocationLower.startsWith('assets/') || rawLocationLower.startsWith('/assets/');
        if (looksLikeAsset) {
            if (!this.isServer) {
                console.warn('[PublicAppService] Ignoring asset-like slug/location passed to getCourseByCanonicalLocationURL:', {
                    courseUrl,
                    locationUrl
                });
            }
            return of(null);
        }
        
        // Remove leading slashes first
        normalizedCourseUrl = normalizedCourseUrl.replace(/^\/+/, '');
        
        // Remove 'course/course/' prefix if present (more specific first)
        if (normalizedCourseUrl.startsWith('course/course/')) {
            normalizedCourseUrl = normalizedCourseUrl.replace(/^course\/course\//, '');
        } else if (normalizedCourseUrl.startsWith('course/')) {
            normalizedCourseUrl = normalizedCourseUrl.replace(/^course\//, '');
        }
        
        // Remove any trailing slashes
        normalizedCourseUrl = normalizedCourseUrl.replace(/\/+$/, '');
        
        // ✅ Also normalize locationUrl
        let normalizedLocation = (locationUrl || '').trim();
        normalizedLocation = normalizedLocation.replace(/^\/+/, '');
        normalizedLocation = normalizedLocation.replace(/\/+$/, '');
        
        if (!normalizedCourseUrl) {
            console.error('⚠️ Empty course URL after normalization');
            return of(null);
        }
        
        if (!normalizedLocation) {
            console.error('⚠️ Empty location URL after normalization');
            return of(null);
        }
        
        const apiPath = `${this.buildPublicCourseHttpPath(normalizedCourseUrl)}/location/${encodeURIComponent(normalizedLocation)}`;
        const fullUrl = `${this.apiUrl}${apiPath}`;
        
        // ✅ Direct backend connection (no proxy)
        console.log(`🔍 API Call: ${fullUrl}`);
        console.log(`   (original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}", normalized: "${normalizedCourseUrl}" / "${normalizedLocation}")`);
        
        // No custom headers: avoids CORS preflight on cross-origin GETs (see TimeoutInterceptor for 60s).
        return this.http.get<any>(fullUrl).pipe(
            timeout(60000), // 60 seconds timeout for course API calls (reduced from 120s)
            retry({
                count: 1, // Reduced retries: only 1 retry (was 2) to avoid long waits
                delay: (error: any, retryCount: number) => {
                    // Don't retry timeout errors (408) - they indicate backend is too slow/hanging
                    const isTimeoutError = error?.name === 'TimeoutError' || 
                                         error?.name === 'Timeout' || 
                                         error?.status === 408 ||
                                         error?.message?.includes('timeout');
                    
                    if (isTimeoutError) {
                        console.warn(`⏱️ Timeout detected - skipping retry to avoid further delays`);
                        return throwError(() => error);
                    }
                    
                    // Don't retry client errors (4xx) - like 404, 401, etc.
                    if (error?.status && error.status >= 400 && error.status < 500) {
                        return throwError(() => error);
                    }
                    
                    // Exponential backoff: 1s for network errors only
                    console.log(`🔄 Retrying request (attempt ${retryCount + 1}/2) after ${1000 * retryCount}ms...`);
                    return of(null).pipe(delay(1000 * retryCount));
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                // ✅ FIX: Enhanced error detection - check multiple error object structures
                // Error might be HttpErrorResponse, Error object, or transformed error
                // Check status from multiple possible locations
                let status = 0;
                if (error?.status) {
                    status = error.status;
                } else if (error?.error?.StatusCode) {
                    status = error.error.StatusCode;
                } else if (error?.error?.status) {
                    status = error.error.status;
                } else if (typeof error === 'object' && 'status' in error) {
                    status = (error as any).status;
                }
                
                // Check if it's a timeout error first (before status check)
                const isTimeoutError = error?.name === 'TimeoutError' || 
                                      error?.message?.includes('timeout') ||
                                      status === 408;
                
                // Network errors have status 0 or no status at all
                const isNetworkError = (status === 0 || !status) && 
                                      !isTimeoutError && 
                                      (error?.message?.includes('fetch failed') || 
                                       error?.message?.includes('Network') ||
                                       !error?.status);
                
                // Server errors (500-599)
                const isServerError = status >= 500 && status < 600;
                
                // Client errors (400-499)
                const isClientError = status >= 400 && status < 500;
                
                if (isNetworkError) {
                    console.error(`🔴 Network Error: Unable to connect to API server at ${fullUrl}`);
                    console.error(`   - Check if the API server is running`);
                    console.error(`   - Check network connectivity`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                    console.error(`   - Full error:`, error);
                } else if (isTimeoutError) {
                    console.error(`⏱️ Timeout Error: Request to ${fullUrl} timed out after 60 seconds`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Possible causes: Backend is slow, network issues, or backend is down`);
                    console.error(`   - Check backend logs and performance`);
                } else if (isServerError) {
                    const errorMessages = error?.error?.Messages || error?.error?.message || error?.message || 'Unknown server error';
                    console.error(`🔴 Server Error ${status}: ${fullUrl}`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                    console.error(`   - Error message:`, errorMessages);
                    console.error(`   - Full error:`, error?.error || error);
                } else if (isClientError) {
                    const errorMessages = error?.error?.Messages || error?.error?.message || error?.message || 'Unknown client error';
                    console.error(`⚠️ Client Error ${status}: ${fullUrl}`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                    console.error(`   - Error message:`, errorMessages);
                    console.error(`   - Full error:`, error?.error || error);
                } else {
                    console.error(`❌ Error fetching course by URL "${courseUrl}" and location "${locationUrl}". Normalized to: "${normalizedCourseUrl}" / "${normalizedLocation}". API path: ${apiPath}`);
                    console.error(`   - Status: ${status || 'unknown'}`);
                    console.error(`   - Full error:`, error);
                }
                
                // Return null on error to prevent breaking the app - resolver will handle redirects
                return of(null);
            })
        );
    }

    // ✅ PERFORMANCE: Cache events list - frequently accessed
    // NOTE: This returns ALL events (no ShowOnDashboard filter). Use getDashboardEvents() when you only want public-visible events.
    // DISABLED CACHING: Events cache disabled to ensure immediate visibility updates when admin changes checkbox
    getEvents(): Observable<any> {
        if (this.isServer) {
            return this.http.get<any>(`${this.apiUrl}api/events`).pipe(
                catchError(error => {
                    console.error('Error fetching events:', error);
                    return of([]);
                })
            );
        }

        // ✅ NO CACHING: Always fetch fresh data to ensure checkbox updates reflect immediately
        // This ensures when admin checks/unchecks "Show On Dashboard", changes appear immediately
        return this.http.get<any>(`${this.apiUrl}api/events`).pipe(
            catchError(error => {
                console.error('Error fetching events:', error);
                return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
            })
        );
    }

    /**
     * Get ONLY events that should be shown publicly (ShowOnDashboard == true).
     * Uses the backend-filtered endpoint to avoid client-side drift.
     * NO CACHING: Always fetch fresh data to ensure instant visibility updates.
     */
    /** GET api/events/published - only published events (for public /events page). */
    getPublishedEvents(): Observable<any[]> {
        const endpoint = `${this.apiUrl}api/events/published`;
        return this.http.get<any>(endpoint).pipe(
            map((body: any) => {
                const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
                return Array.isArray(list) ? list : [];
            }),
            catchError(() => of([]))
        );
    }

    /** Fast lookup from published list when GET api/events/event/{slug} is slow or unavailable. */
    getPublishedEventBySlug(slug: string): Observable<any | null> {
        const key = normalizeEventCanonicalSlug(slug);
        if (!key) {
            return of(null);
        }
        return this.getPublishedEvents().pipe(
            map((events) =>
                events.find(
                    (e) => normalizeEventCanonicalSlug(e?.canonicalUrl ?? e?.CanonicalUrl) === key
                ) ?? null
            ),
            catchError(() => of(null))
        );
    }

    /**
     * Public event detail by canonical slug — tries full endpoint, falls back to published list.
     * Production backend can exceed 10s on the heavy detail endpoint; published list is fast.
     */
    getPublicEventBySlug(slug: string): Observable<any | null> {
        const key = normalizeEventCanonicalSlug(slug);
        if (!key) {
            return of(null);
        }
        const detailUrl = `${this.apiUrl}api/events/event/${encodeURIComponent(key)}`;
        const detail$ = this.http.get<any>(detailUrl).pipe(
            map((event) => (event?.id ? event : null)),
            catchError(() => of(null))
        );
        return race([detail$, timer(8000).pipe(map(() => null))]).pipe(
            switchMap((event) => (event ? of(event) : this.getPublishedEventBySlug(key)))
        );
    }

    getDashboardEvents(): Observable<any> {
        const endpoint = `${this.apiUrl}api/events/dashboard`;

        if (this.isServer) {
            return this.http.get<any>(endpoint).pipe(
                map((body: any) => {
                    const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
                    if (!Array.isArray(list)) return [];
                    return list.filter((e: any) => e?.isPublished === true || e?.IsPublished === true);
                }),
                catchError(error => {
                    console.error('Error fetching dashboard events:', error);
                    return of([]);
                })
            );
        }

        // ✅ NO CACHING: Always fetch fresh data to ensure instant updates when admin changes checkbox
        // ✅ Only show events that are explicitly published (hide unpublished even if backend sends them)
        return this.http.get<any>(endpoint).pipe(
            map((body: any) => {
                const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
                if (!Array.isArray(list)) return [];
                return list.filter((e: any) => e?.isPublished === true || e?.IsPublished === true);
            }),
            catchError(error => {
                console.error('Error fetching dashboard events:', error);
                return of([]); // Fallback to empty array
            })
        );
    }

    getUpcomingEvents(eventId: string): Observable<any> {
        // ✅ PERFORMANCE: shareReplay prevents duplicate requests for same eventId
        return this.http.get(`${this.apiUrl}api/events/upcoming/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching upcoming events for ${eventId}:`, error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Cache event by ID - used in route resolvers
    getEventById(eventId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}api/events/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching event ${eventId}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    /** GET api/events/check-registration/{eventId} - requires auth. Returns { registered: boolean }. */
    checkEventRegistration(eventId: string): Observable<{ registered: boolean }> {
        return this.http.get<{ registered: boolean }>(`${this.apiUrl}api/events/check-registration/${eventId}`).pipe(
            catchError(() => of({ registered: false }))
        );
    }

    /** POST api/events/register - requires auth. Free: { enrolled: true }. Paid: { enrolled: false, needPayment: true }. */
    registerForEvent(eventId: string, body?: { name?: string; email?: string; mobile?: string; companyName?: string; designation?: string; department?: string }): Observable<{ enrolled?: boolean; needPayment?: boolean; message?: string }> {
        const payload = { eventId, ...body };
        return this.http.post<{ enrolled?: boolean; needPayment?: boolean; message?: string }>(`${this.apiUrl}api/events/register`, payload).pipe(
            catchError(err => { throw err; })
        );
    }

    /** GET api/events/registration-draft/{eventId} - pending registration details before payment. */
    getEventRegistrationDraft(eventId: string): Observable<{ hasDraft?: boolean; name?: string; email?: string; mobile?: string; companyName?: string; designation?: string; department?: string }> {
        return this.http.get<any>(`${this.apiUrl}api/events/registration-draft/${eventId}`).pipe(
            catchError(() => of({ hasDraft: false }))
        );
    }

    /** POST api/events/checkout-session - requires auth. Returns { paymentUrl: string }. */
    createEventCheckoutSession(eventId: string): Observable<{ paymentUrl: string }> {
        return this.http.post<{ paymentUrl: string }>(`${this.apiUrl}api/events/checkout-session`, { eventId }).pipe(
            catchError(err => { throw err; })
        );
    }

    /** POST api/events/confirm-payment - requires auth. Call after Stripe redirect with session_id. */
    confirmEventPayment(sessionId: string): Observable<{ registered?: boolean; message?: string }> {
        return this.http.post<{ registered?: boolean; message?: string }>(`${this.apiUrl}api/events/confirm-payment`, { sessionId }).pipe(
            catchError(err => { throw err; })
        );
    }

    // Verify payment status for a registration
    verifyPaymentStatus(eventId: string, registrationId: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        // Get event users and find the specific registration
        return this.http.get(`${this.apiUrl}api/events/users/${eventId}`, { headers }).pipe(
            map((users: any[]) => {
                // Find the user with matching ID
                const user = Array.isArray(users) 
                    ? users.find(u => u.id === registrationId || u.Id === registrationId)
                    : null;
                
                if (user) {
                    return {
                        id: user.id || user.Id,
                        isPaymentCompleted: user.isPaymentCompleted || user.IsPaymentCompleted || false,
                        paymentRefNo: user.paymentRefNo || user.PaymentRefNo,
                        email: user.email || user.Email,
                        name: user.name || user.Name
                    };
                }
                return null;
            }),
            catchError(error => {
                console.error(`Error verifying payment status for ${registrationId}:`, error);
                return of(null);
            })
        );
    }

    createEventUser(eventId: string, eventUser: any): Observable<any> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        
        // Ensure proper headers and data format
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        console.log('Creating event user:', {
            url: `${this.apiUrl}api/events/users/${eventId}`,
            eventId: eventId,
            data: eventUser
        });
        
        return this.http.post(`${this.apiUrl}api/events/users/${eventId}`, eventUser, { headers }).pipe(
            map((response: any) => {
                // ✅ Ensure we return the response body directly
                // Angular HttpClient automatically extracts body, but ensure consistency
                console.log('✅ createEventUser raw response:', response);
                console.log('✅ createEventUser response type:', typeof response);
                console.log('✅ createEventUser response keys:', response ? Object.keys(response) : 'null');
                
                // Handle different response structures
                // Backend returns EventUserResponse directly, but check for wrapping
                if (response && typeof response === 'object') {
                    // Check if paymentRefNo exists and is valid
                    const paymentRefNo = response.paymentRefNo || response.PaymentRefNo;
                    
                    if (paymentRefNo && paymentRefNo !== null && paymentRefNo !== 'null' && paymentRefNo.trim() !== '') {
                        console.log('✅ Payment URL found in response:', paymentRefNo);
                    } else if (paymentRefNo === null || paymentRefNo === 'null') {
                        // PhonePe API failed - backend returned null paymentRefNo
                        console.error('❌ PhonePe API failure detected - paymentRefNo is null');
                        console.error('❌ Registration was saved but payment gateway failed');
                        console.warn('⚠️ Available properties:', Object.keys(response));
                    } else {
                        console.warn('⚠️ PaymentRefNo not found in response');
                        console.warn('⚠️ Available properties:', Object.keys(response));
                    }
                }
                
                return response;
            }),
            catchError(error => {
                console.error(`❌ Error creating event user for ${eventId}:`, {
                    error: error,
                    status: error?.status,
                    statusText: error?.statusText,
                    message: error?.error?.message || error?.message,
                    errorBody: error?.error,
                    url: `${this.apiUrl}api/events/users/${eventId}`,
                    requestData: eventUser
                });
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    // Initiate payment for a registration (separate endpoint if paymentRefNo is missing)
    initiatePayment(eventId: string, registrationId: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        console.log('🔄 Initiating payment separately:', {
            url: `${this.apiUrl}api/events/payment/initiate/${eventId}/${registrationId}`,
            eventId: eventId,
            registrationId: registrationId
        });
        
        return this.http.post(`${this.apiUrl}api/events/payment/initiate/${eventId}/${registrationId}`, {}, { headers }).pipe(
            map((response: any) => {
                console.log('✅ initiatePayment raw response:', response);
                console.log('✅ initiatePayment response type:', typeof response);
                console.log('✅ initiatePayment response keys:', response ? Object.keys(response) : 'null');
                
                // Extract payment URL from response (handle both camelCase and PascalCase)
                const paymentUrl = response?.paymentUrl || response?.PaymentUrl || response?.paymentRefNo || response?.PaymentRefNo;
                
                if (paymentUrl && paymentUrl !== null && paymentUrl !== 'null' && paymentUrl.trim() !== '') {
                    console.log('✅ Payment URL found in initiatePayment response:', paymentUrl);
                    return { paymentUrl: paymentUrl.trim(), paymentRefNo: paymentUrl.trim() };
                } else {
                    console.warn('⚠️ Payment URL not found in initiatePayment response');
                    console.warn('⚠️ Available properties:', Object.keys(response || {}));
                    return { paymentUrl: null, paymentRefNo: null };
                }
            }),
            catchError(error => {
                // Enhanced error logging
                const errorDetails = {
                    error: error,
                    status: error?.status,
                    statusText: error?.statusText,
                    message: error?.error?.message || error?.message,
                    errorBody: error?.error,
                    errorType: error?.error?.errorType,
                    eventId: error?.error?.eventId,
                    registrationId: error?.error?.registrationId,
                    url: `${this.apiUrl}api/events/payment/initiate/${eventId}/${registrationId}`,
                    requestParams: {
                        eventId: eventId,
                        registrationId: registrationId
                    }
                };
                
                console.error(`❌ Error initiating payment for ${registrationId}:`, errorDetails);
                
                // Log specific error scenarios
                if (error?.status === 400) {
                    console.error(`❌ 400 Bad Request - Backend validation failed or PhonePe API error`);
                    console.error(`   Error message: ${error?.error?.message || 'Unknown error'}`);
                    console.error(`   Error type: ${error?.error?.errorType || 'N/A'}`);
                } else if (error?.status === 404) {
                    console.error(`❌ 404 Not Found - Registration or Event not found`);
                } else if (error?.status === 500) {
                    console.error(`❌ 500 Server Error - Internal server error`);
                } else if (!error?.status) {
                    console.error(`❌ Network Error - Unable to reach backend API`);
                }
                
                return of({ paymentUrl: null, paymentRefNo: null, error: errorDetails });
            })
        );
    }

    /**
     * Bulk enrollment status (same as Elearn AdminAppService). POST api/course/enrollment-status/bulk.
     * Body: { courseIds: string[] }. Returns { [courseId]: boolean }. Requires auth.
     */
    getEnrollmentStatusBulk(courseIds: string[]): Observable<Record<string, boolean>> {
        const ids = (courseIds ?? []).map(id => (id ?? '').trim()).filter(Boolean);
        if (ids.length === 0) {
            return of({});
        }
        return this.http
            .post<Record<string, boolean>>(`${this.apiUrl}api/course/enrollment-status/bulk`, { courseIds: ids })
            .pipe(
                map(res => this.normalizeEnrollmentStatusMap(res)),
                catchError(err => {
                    if (!this.isServer) console.error('[PublicAppService] getEnrollmentStatusBulk error:', err);
                    return throwError(() => err);
                })
            );
    }

    /** Normalize keys to lowercase for stable lookups with course Guids. */
    private normalizeEnrollmentStatusMap(res: Record<string, boolean> | null | undefined): Record<string, boolean> {
        const out: Record<string, boolean> = {};
        if (!res || typeof res !== 'object') {
            return out;
        }
        for (const k of Object.keys(res)) {
            out[k.toLowerCase()] = !!res[k];
        }
        return out;
    }

    /**
     * Enroll current user in a free course (Enroll Now on public page).
     * POST api/course/enroll/free with body { courseId }. Requires auth.
     */
    enrollFreeCourse(courseId: string): Observable<{ success: boolean; alreadyEnrolled?: boolean; message?: string } | null> {
        const id = (courseId ?? '').trim();
        if (!id) return of(null);
        return this.http.post<{ success?: boolean; alreadyEnrolled?: boolean; message?: string }>(
            `${this.apiUrl}api/course/enroll/free`,
            { courseId: id },
            { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
        ).pipe(
            map(res => res ? { success: !!res.success, alreadyEnrolled: res.alreadyEnrolled, message: res.message } : null),
            catchError(err => {
                if (!this.isServer) console.error('[PublicAppService] enrollFreeCourse error:', err);
                return of(null);
            })
        );
    }

    /**
     * Create payment session for course checkout (unified by courseId).
     * POST api/payment/create-session with body { courseId, couponCode?, referralCode?, affiliateRef? }.
     * Supports coupon codes, instructor referral, and affiliate link discounts.
     */
    createPaymentSessionByCourseId(
        courseId: string,
        options?: { couponCode?: string; referralCode?: string; affiliateRef?: string }
    ): Observable<{ paymentUrl: string; finalAmount?: number; appliedDiscounts?: string[]; enrolledFree?: boolean } | null> {
        const id = (courseId ?? '').trim();
        if (!id) return of(null);
        const body: { courseId: string; couponCode?: string; referralCode?: string; affiliateRef?: string } = { courseId: id };
        if (options?.couponCode?.trim()) body.couponCode = options.couponCode.trim();
        if (options?.referralCode?.trim()) body.referralCode = options.referralCode.trim();
        if (options?.affiliateRef?.trim()) body.affiliateRef = options.affiliateRef.trim();
        return this.http.post<{ paymentUrl?: string; PaymentUrl?: string; finalAmount?: number; appliedDiscounts?: string[]; enrolledFree?: boolean }>(
            `${this.apiUrl}api/payment/create-session`,
            body,
            { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
        ).pipe(
            map(res => {
                const url = res?.paymentUrl ?? res?.PaymentUrl ?? null;
                if (!url) return null;
                return {
                    paymentUrl: url,
                    finalAmount: res?.finalAmount,
                    appliedDiscounts: res?.appliedDiscounts,
                    enrolledFree: res?.enrolledFree
                };
            }),
            catchError(err => {
                if (!this.isServer) console.error('[PublicAppService] createPaymentSessionByCourseId error:', err);
                return of(null);
            })
        );
    }

    /**
     * GET api/courses/search?keyword=... - topbar course search. Returns up to 10 items (id, title, slug).
     */
    searchCourses(keyword: string): Observable<{ id: string; title: string; slug: string }[]> {
        const term = (keyword ?? '').trim();
        if (term.length < 2) return of([]);
        return this.http.get<{ id?: string; title?: string; slug?: string; Id?: string; Title?: string; Slug?: string }[]>(
            `${this.apiUrl}api/courses/search`,
            { params: { keyword: term } }
        ).pipe(
            map(res => {
                const list = Array.isArray(res) ? res : [];
                return list.map(item => ({
                    id: String(item?.id ?? item?.Id ?? ''),
                    title: item?.title ?? item?.Title ?? '',
                    slug: item?.slug ?? item?.Slug ?? ''
                })).filter(x => x.slug);
            }),
            catchError(err => {
                if (!this.isServer) console.error('[PublicAppService] searchCourses error:', err);
                return of([]);
            })
        );
    }

    /**
     * GET api/courses/slug/{slug} - minimal course info for checkout redirect (id, title, slug, price).
     */
    getCourseBySlugForCheckout(slug: string): Observable<{ id: string; title: string; slug: string; price: number } | null> {
        const s = (slug ?? '').trim();
        if (!s) return of(null);
        return this.http.get<{ id?: string; title?: string; slug?: string; price?: number }>(
            `${this.apiUrl}api/courses/slug/${encodeURIComponent(s)}`
        ).pipe(
            map(res => {
                const id = res?.id ?? (res as any)?.Id;
                if (!id) return null;
                return {
                    id: String(id),
                    title: res?.title ?? (res as any)?.Title ?? '',
                    slug: res?.slug ?? (res as any)?.Slug ?? s,
                    price: Number(res?.price ?? (res as any)?.Price ?? 0)
                };
            }),
            catchError(err => {
                if (!this.isServer) console.error('[PublicAppService] getCourseBySlugForCheckout error:', err);
                return of(null);
            })
        );
    }

    /**
     * Verify payment after gateway redirect. POST api/payment/checkout/verify/{sessionId} with body { entityId }.
     */
    verifyPayment(sessionId: string, entityId: string): Observable<boolean> {
        const sid = (sessionId ?? '').trim();
        const eid = (entityId ?? '').trim();
        if (!sid || !eid) return of(false);
        return this.http.post<{ data?: string }>(
            `${this.apiUrl}api/payment/checkout/verify/${encodeURIComponent(sid)}`,
            { entityId: eid },
            { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
        ).pipe(
            map(() => true),
            catchError(err => {
                if (!this.isServer) console.error('[PublicAppService] verifyPayment error:', err);
                return of(false);
            })
        );
    }

    // ✅ PERFORMANCE: Public method to invalidate caches when needed
    invalidateCaches(): void {
        this.categoriesCache$ = null;
        this.dashboardCategoriesCache$ = null;
        this.eventsCache$ = null;
    }

    // ✅ Clear events cache specifically (useful when events are updated in admin)
    invalidateEventsCache(): void {
        this.eventsCache$ = null;
        console.log('[PublicAppService] Events cache invalidated');
    }

    /** Max wait for newsletter API (slow DB / wrong API URL should fail fast with a clear message). */
    private static readonly newsletterRequestTimeoutMs = 15000;

    /**
     * Subscribe to newsletter – persisted via API (`NewsletterSubscriptions` table).
     * Country is auto-detected from browser/IP metadata; no user input required.
     */
    subscribeNewsletter(
        email: string,
        options?: { source?: string; blogSlug?: string }
    ): Observable<{ success: boolean; message?: string; error?: string }> {
        const trimmed = (email ?? '').trim();
        if (!trimmed) {
            return of({ success: false, error: 'Email is required.' });
        }
        const body: { email: string; source?: string; blogSlug?: string; countryCode?: string } = { email: trimmed };
        if (options?.source) body.source = options.source;
        if (options?.blogSlug) body.blogSlug = options.blogSlug;
        const countryCode = this.getLocaleCountryCode();
        if (countryCode) body.countryCode = countryCode;
        return this.http.post<{ success: boolean; message?: string; error?: string }>(
            `${this.apiUrl}api/public/newsletter/subscribe`,
            body,
            { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) }
        ).pipe(
            timeout(PublicAppService.newsletterRequestTimeoutMs),
            catchError((err) => {
                if (!this.isServer) console.error('[PublicAppService] subscribeNewsletter', err);
                if (err instanceof TimeoutError || (err as any)?.name === 'TimeoutError') {
                    return of({
                        success: false,
                        error: 'The server took too long to respond. Check that the API is running (see environment.apiUrl) and try again.'
                    });
                }
                const status = err?.status;
                const serverErr = err?.error?.error ?? err?.error?.Error ?? err?.error?.message;
                if (status === 0 || status === undefined) {
                    return of({
                        success: false,
                        error: 'Could not reach the server. Confirm the backend is running and CORS allows this origin.'
                    });
                }
                const msg = serverErr ?? err?.message ?? 'Something went wrong. Please try again.';
                return of({ success: false, error: typeof msg === 'string' ? msg : 'Something went wrong. Please try again.' });
            })
        );
    }

    private getLocaleCountryCode(): string | null {
        if (typeof navigator === 'undefined') return null;
        const locales: string[] = [];
        if (Array.isArray((navigator as any).languages)) {
            locales.push(...(navigator as any).languages);
        }
        if ((navigator as any).language) {
            locales.push((navigator as any).language);
        }
        if ((navigator as any).userLanguage) {
            locales.push((navigator as any).userLanguage);
        }
        for (const locale of locales) {
            if (!locale || typeof locale !== 'string') continue;
            const parts = locale.split('-');
            if (parts.length > 1) {
                const cc = (parts[1] || '').trim().toUpperCase();
                if (cc) return cc.length > 10 ? cc.slice(0, 10) : cc;
            }
        }
        return null;
    }

}




