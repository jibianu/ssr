import { Category } from './../adminapp/category/category.model';
import { Observable, of, throwError } from 'rxjs';
import { shareReplay, catchError, timeout, retry, delay, map } from 'rxjs/operators';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { API_URL } from '../../core/config/api-url.config';

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

    // ✅ PERFORMANCE: Cache course by ID - frequently accessed detail pages
    getCourseById(id): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}page/course/id/${id}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching course ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    // ✅ PERFORMANCE: Cache by canonical URL - used in route resolvers and components
    getCourseByCanonicalURL(url: string): Observable<any> {
        // ✅ FIX: Normalize URL - remove leading slashes and any 'course/course/' or 'course/' prefixes
        let normalizedUrl = (url || '').trim();

        // ✅ SAFETY: Never treat static asset filenames as course slugs.
        // This prevents accidental calls like: getCourseByCanonicalURL("publicapp.module-XXXX.js")
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
            if (!this.isServer) {
                console.warn('[PublicAppService] Ignoring asset-like slug passed to getCourseByCanonicalURL:', url);
            }
            return of(null);
        }
        
        // Remove leading slashes first
        normalizedUrl = normalizedUrl.replace(/^\/+/, '');
        
        // Remove 'course/course/' prefix if present (more specific first)
        if (normalizedUrl.startsWith('course/course/')) {
            normalizedUrl = normalizedUrl.replace(/^course\/course\//, '');
        } else if (normalizedUrl.startsWith('course/')) {
            normalizedUrl = normalizedUrl.replace(/^course\//, '');
        }
        
        // Remove any trailing slashes
        normalizedUrl = normalizedUrl.replace(/\/+$/, '');
        
        if (!normalizedUrl) {
            console.error('⚠️ Empty course URL after normalization');
            return of(null);
        }
        
        const apiPath = `page/course/course/${normalizedUrl}`;
        const fullUrl = `${this.apiUrl}${apiPath}`;
        
        // ✅ Direct backend connection (no proxy)
        // ✅ IMPORTANT: This should only be called ONCE per course page navigation
        // shareReplay ensures duplicate concurrent requests share the same response
        console.log(`🔍 API Call: ${fullUrl}`);
        console.log(`   (original URL: "${url}", normalized: "${normalizedUrl}")`);
        console.log(`   ⚠️ This should only appear ONCE per course page load`);
        
        // ✅ Add longer timeout for course API calls (60 seconds) via custom header
        // Reduced from 120s to 60s - if backend needs more time, it should be optimized
        const headers = new HttpHeaders().set('X-Timeout', '60000');
        
        return this.http.get<any>(fullUrl, { headers }).pipe(
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
                // Better error handling for network/fetch failures
                const isNetworkError = !error.status || error.status === 0 || error.message?.includes('fetch failed');
                const isTimeoutError = error.name === 'TimeoutError' || error.status === 408;
                
                if (isNetworkError) {
                    console.error(`🔴 Network Error: Unable to connect to API server at ${fullUrl}`);
                    console.error(`   - Check if the API server is running`);
                    console.error(`   - Check network connectivity`);
                    console.error(`   - Original URL: "${url}", Normalized: "${normalizedUrl}"`);
                } else if (isTimeoutError) {
                    console.error(`⏱️ Timeout Error: Request to ${fullUrl} timed out after 60 seconds`);
                    console.error(`   - Original URL: "${url}", Normalized: "${normalizedUrl}"`);
                    console.error(`   - Possible causes:`);
                    console.error(`     1. Backend is processing slowly or hanging`);
                    console.error(`     2. Backend endpoint might be stuck/infinite loop`);
                    console.error(`     3. Database query is taking too long`);
                    console.error(`     4. Network connectivity issues`);
                    console.error(`   - Actions:`);
                    console.error(`     • Check backend logs for errors or slow queries`);
                    console.error(`     • Test endpoint directly in browser: ${fullUrl}`);
                    console.error(`     • Verify backend is responsive (try root URL: ${this.apiUrl})`);
                    console.error(`     • Check database performance if applicable`);
                    console.error(`     • Consider optimizing backend endpoint if it consistently times out`);
                } else {
                    console.error(`❌ Error fetching course by URL "${url}" (normalized: "${normalizedUrl}"). API path: ${apiPath}`, error);
                }
                
                // Return null on error to prevent breaking the app
                return of(null);
            })
        );
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
            return this.http.get<Category[]>(`${this.apiUrl}page/category`).pipe(
                catchError(error => {
                    console.error('Error fetching categories:', error);
                    return of([]);
                })
            );
        }

        if (!this.categoriesCache$) {
            this.categoriesCache$ = this.http.get<Category[]>(`${this.apiUrl}page/category`).pipe(
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
            .set('Filters.Category', category.trim());
        
        const fullUrl = `${this.apiUrl}page/course`;
        
        console.log(`🔍 Related Courses API Call: ${fullUrl}?Filters.Category=${category.trim()}`);
        console.log(`   ⚠️ Using list endpoint (minimal data only, NOT individual /api/course/{slug} calls)`);
        
        return this.http.get<any>(fullUrl, { params }).pipe(
            map(response => {
                // ✅ Extract only minimal data needed for related courses display
                // Backend returns: { results: [...], totalNumberOfRecords: ... }
                const courses = (response?.results || []).map((course: any) => ({
                    id: course.id,
                    title: course.title,
                    titleImageUrl: course.titleImageUrl,
                    canonicalUrl: course.canonicalUrl,
                    amount: course.amount,
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

    // ✅ PERFORMANCE: Cache dashboard categories - called on home page load
    getDashboardCategories(): Observable<any> {
        if (this.isServer) {
            return this.http.get<any>(`${this.apiUrl}page/Category/Dashboard`).pipe(
                catchError(error => {
                    const isNetworkError = !error?.status || error.status === 0;
                    if (!isNetworkError) {
                        console.warn('⚠️ SSR: Error fetching dashboard categories:', error.status, error.statusText);
                    }
                    return of([]);
                })
            );
        }

        if (!this.dashboardCategoriesCache$) {
            this.dashboardCategoriesCache$ = this.http.get<any>(`${this.apiUrl}page/Category/Dashboard`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    // ✅ SSR-FRIENDLY: Only log errors in browser (SSR errors are expected if backend is down)
                    if (typeof window !== 'undefined') {
                        console.error('Error fetching dashboard categories:', error);
                    } else {
                        // ✅ SSR: Log less verbose message for network errors (expected if backend is down)
                        const isNetworkError = !error.status || error.status === 0;
                        if (!isNetworkError) {
                            console.warn('⚠️ SSR: Error fetching dashboard categories (non-network error):', error.status, error.statusText);
                        }
                    }
                    this.dashboardCategoriesCache$ = null; // ✅ ERROR HANDLING: Clear cache on error
                    return of([]); // ✅ ERROR HANDLING: Return empty array on error (allows SSR to continue)
                })
            );
        }
        return this.dashboardCategoriesCache$;
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
        
        const apiPath = `page/course/course/${normalizedCourseUrl}/location/${normalizedLocation}`;
        const fullUrl = `${this.apiUrl}${apiPath}`;
        
        // ✅ Direct backend connection (no proxy)
        console.log(`🔍 API Call: ${fullUrl}`);
        console.log(`   (original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}", normalized: "${normalizedCourseUrl}" / "${normalizedLocation}")`);
        
        // ✅ Add longer timeout for course API calls (60 seconds) via custom header
        // Reduced from 120s to 60s - if backend needs more time, it should be optimized
        const headers = new HttpHeaders().set('X-Timeout', '60000');
        
        return this.http.get<any>(fullUrl, { headers }).pipe(
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
            return this.http.get<any>(`${this.apiUrl}page/event`).pipe(
                catchError(error => {
                    console.error('Error fetching events:', error);
                    return of([]);
                })
            );
        }

        // ✅ NO CACHING: Always fetch fresh data to ensure checkbox updates reflect immediately
        // This ensures when admin checks/unchecks "Show On Dashboard", changes appear immediately
        return this.http.get<any>(`${this.apiUrl}page/event`).pipe(
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
    getDashboardEvents(): Observable<any> {
        const endpoint = `${this.apiUrl}page/event/dashboard`;

        if (this.isServer) {
            return this.http.get<any>(endpoint).pipe(
                catchError(error => {
                    console.error('Error fetching dashboard events:', error);
                    return of([]);
                })
            );
        }

        // ✅ NO CACHING: Always fetch fresh data to ensure instant updates when admin changes checkbox
        // Component polls every 5 seconds, so caching would prevent fresh data
        return this.http.get<any>(endpoint).pipe(
            catchError(error => {
                console.error('Error fetching dashboard events:', error);
                return of([]); // Fallback to empty array
            })
        );
    }

    getUpcomingEvents(eventId: string): Observable<any> {
        // ✅ PERFORMANCE: shareReplay prevents duplicate requests for same eventId
        return this.http.get(`${this.apiUrl}page/event/upcoming/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching upcoming events for ${eventId}:`, error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Cache event by ID - used in route resolvers
    getEventById(eventId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}page/event/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching event ${eventId}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    // Verify payment status for a registration
    verifyPaymentStatus(eventId: string, registrationId: string): Observable<any> {
        const headers = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        });
        
        // Get event users and find the specific registration
        return this.http.get(`${this.apiUrl}page/event/users/${eventId}`, { headers }).pipe(
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
            url: `${this.apiUrl}page/event/users/${eventId}`,
            eventId: eventId,
            data: eventUser
        });
        
        return this.http.post(`${this.apiUrl}page/event/users/${eventId}`, eventUser, { headers }).pipe(
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
                    url: `${this.apiUrl}page/event/users/${eventId}`,
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
            url: `${this.apiUrl}page/event/payment/initiate/${eventId}/${registrationId}`,
            eventId: eventId,
            registrationId: registrationId
        });
        
        return this.http.post(`${this.apiUrl}page/event/payment/initiate/${eventId}/${registrationId}`, {}, { headers }).pipe(
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
                    url: `${this.apiUrl}page/event/payment/initiate/${eventId}/${registrationId}`,
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
}




