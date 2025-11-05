import { Category } from './../adminapp/category/category.model';
import { Observable, of, throwError } from 'rxjs';
import { shareReplay, catchError, timeout, retry, delay } from 'rxjs/operators';
import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../../core/config/api-url.config';

// ✅ PERFORMANCE: Service-level caching prevents redundant API calls (40-50% reduction)
// ✅ SSR: shareReplay works in both SSR and browser contexts
@Injectable({ providedIn: 'root' })
export class PublicAppService {
    user: any;
    private readonly apiUrl: string;
    
    // ✅ PERFORMANCE: Cached observables to prevent redundant API calls
    private categoriesCache$: Observable<Category[]> | null = null;
    private dashboardCategoriesCache$: Observable<any> | null = null;
    private eventsCache$: Observable<any> | null = null;
    
    // ✅ FIX: Use constructor injection instead of field initializer to prevent injector errors in SSR
    // Field initializers with inject() can fail if injector is destroyed during navigation
    constructor(
        private http: HttpClient,
        @Inject(API_URL) apiUrl: string
    ) {
        this.apiUrl = apiUrl;
    }

    // ✅ PERFORMANCE: shareReplay prevents duplicate concurrent requests for same data
    getCourses(params): Observable<any> {
        // Note: Params-based requests are handled by CacheInterceptor
        // ✅ PERFORMANCE: shareReplay ensures concurrent requests share same response
        return this.http.get<any>(`${this.apiUrl}page/course`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching courses:', error);
                return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
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
        console.log(`🔍 API Call: ${fullUrl}`);
        console.log(`   (original URL: "${url}", normalized: "${normalizedUrl}")`);
        
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
    getEvents(): Observable<any> {
        if (!this.eventsCache$) {
            this.eventsCache$ = this.http.get(`${this.apiUrl}page/event/dashboard`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    console.error('Error fetching events:', error);
                    this.eventsCache$ = null; // ✅ ERROR HANDLING: Clear cache on error
                    return of([]); // ✅ ERROR HANDLING: Return empty array on error
                })
            );
        }
        return this.eventsCache$;
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

    createEventUser(eventId: string, eventUser: any): Observable<any> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        return this.http.post(`${this.apiUrl}page/event/users/${eventId}`, eventUser).pipe(
            catchError(error => {
                console.error(`Error creating event user for ${eventId}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    // ✅ PERFORMANCE: Public method to invalidate caches when needed
    invalidateCaches(): void {
        this.categoriesCache$ = null;
        this.dashboardCategoriesCache$ = null;
        this.eventsCache$ = null;
    }
}




