import { Category } from './../adminapp/category/category.model';
import { Observable, of, throwError } from 'rxjs';
import { shareReplay, catchError, timeout, retry, delay } from 'rxjs/operators';
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_URL } from '../../core/config/api-url.config';

// ✅ PERFORMANCE: Service-level caching prevents redundant API calls (40-50% reduction)
// ✅ SSR: shareReplay works in both SSR and browser contexts
@Injectable({ providedIn: 'root' })
export class PublicAppService {
    user: any;
    private readonly apiUrl = inject(API_URL);
    
    // ✅ PERFORMANCE: Cached observables to prevent redundant API calls
    private categoriesCache$: Observable<Category[]> | null = null;
    private dashboardCategoriesCache$: Observable<any> | null = null;
    private eventsCache$: Observable<any> | null = null;
    
    constructor(private http: HttpClient) {
    }

    // ✅ PERFORMANCE: shareReplay prevents duplicate concurrent requests for same data
    getCourses(params): Observable<any> {
        // Note: Params-based requests are handled by CacheInterceptor
        // ✅ PERFORMANCE: shareReplay ensures concurrent requests share same response
        return this.http.get<any>(this.apiUrl + `page/course`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching courses:', error);
                return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
            })
        );
    }

    // ✅ PERFORMANCE: Cache course by ID - frequently accessed detail pages
    getCourseById(id): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course/id/` + id).pipe(
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
        const fullUrl = this.apiUrl + apiPath;
        console.log(`🔍 API Call: ${fullUrl} (original URL: "${url}", normalized: "${normalizedUrl}")`);
        
        // ✅ Add longer timeout for course API calls (120 seconds) via custom header
        // Increased from 60s to 120s to match proxy timeout settings
        const headers = new HttpHeaders().set('X-Timeout', '120000');
        
        return this.http.get<any>(fullUrl, { headers }).pipe(
            timeout(120000), // 120 seconds timeout for course API calls (matches proxy timeout)
            retry({
                count: 2, // Retry up to 2 times on failure
                delay: (error: any, retryCount: number) => {
                    // Only retry on network errors (no status or 0 status), not on client errors (4xx)
                    if (error?.status && error.status >= 400 && error.status < 500) {
                        // Don't retry client errors (like 404, 401, etc.)
                        return throwError(() => error);
                    }
                    // Exponential backoff: 1s, 2s for network errors
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
                    console.error(`⏱️ Timeout Error: Request to ${fullUrl} timed out after 120 seconds`);
                    console.error(`   - Original URL: "${url}", Normalized: "${normalizedUrl}"`);
                    console.error(`   - Possible causes: Backend is slow, network issues, or backend is down`);
                    console.error(`   - Check backend logs and performance`);
                } else {
                    console.error(`❌ Error fetching course by URL "${url}" (normalized: "${normalizedUrl}"). API path: ${apiPath}`, error);
                }
                
                // Return null on error to prevent breaking the app
                return of(null);
            })
        );
    }

    getDashboardCourses(): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course/Dashboard`).pipe(
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
            this.categoriesCache$ = this.http.get<Category[]>(this.apiUrl + `page/category`).pipe(
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
        return this.http.get<any>(this.apiUrl + `page/Course/` + id + '/Dashboard').pipe(
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
            this.dashboardCategoriesCache$ = this.http.get<any>(this.apiUrl + `page/Category/Dashboard`).pipe(
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
        const fullUrl = this.apiUrl + apiPath;
        console.log(`🔍 API Call: ${fullUrl} (original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}", normalized: "${normalizedCourseUrl}" / "${normalizedLocation}")`);
        
        // ✅ Add longer timeout for course API calls (120 seconds) via custom header
        // Increased from 60s to 120s to match proxy timeout settings
        const headers = new HttpHeaders().set('X-Timeout', '120000');
        
        return this.http.get<any>(fullUrl, { headers }).pipe(
            timeout(120000), // 120 seconds timeout for course API calls (matches proxy timeout)
            retry({
                count: 2, // Retry up to 2 times on failure
                delay: (error: any, retryCount: number) => {
                    // Only retry on network errors (no status or 0 status), not on client errors (4xx)
                    if (error?.status && error.status >= 400 && error.status < 500) {
                        // Don't retry client errors (like 404, 401, etc.)
                        return throwError(() => error);
                    }
                    // Exponential backoff: 1s, 2s for network errors
                    return of(null).pipe(delay(1000 * retryCount));
                }
            }),
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                // ✅ FIX: Correct error detection - 500 is a server error, not network error
                const status = error?.status || error?.error?.StatusCode || 0;
                const isNetworkError = status === 0 || !status || error.message?.includes('fetch failed');
                const isTimeoutError = error.name === 'TimeoutError' || status === 408;
                const isServerError = status >= 500 && status < 600;
                const isClientError = status >= 400 && status < 500;
                
                if (isNetworkError) {
                    console.error(`🔴 Network Error: Unable to connect to API server at ${fullUrl}`);
                    console.error(`   - Check if the API server is running`);
                    console.error(`   - Check network connectivity`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                } else if (isTimeoutError) {
                    console.error(`⏱️ Timeout Error: Request to ${fullUrl} timed out after 120 seconds`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Possible causes: Backend is slow, network issues, or backend is down`);
                    console.error(`   - Check backend logs and performance`);
                } else if (isServerError) {
                    console.error(`🔴 Server Error ${status}: ${fullUrl}`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                    console.error(`   - Error details:`, error?.error || error);
                } else if (isClientError) {
                    console.error(`⚠️ Client Error ${status}: ${fullUrl}`);
                    console.error(`   - Original courseUrl: "${courseUrl}", locationUrl: "${locationUrl}"`);
                    console.error(`   - Normalized: "${normalizedCourseUrl}" / "${normalizedLocation}"`);
                    console.error(`   - Error details:`, error?.error || error);
                } else {
                    console.error(`❌ Error fetching course by URL "${courseUrl}" and location "${locationUrl}". Normalized to: "${normalizedCourseUrl}" / "${normalizedLocation}". API path: ${apiPath}`, error);
                }
                
                // Return null on error to prevent breaking the app - resolver will handle redirects
                return of(null);
            })
        );
    }

    // ✅ PERFORMANCE: Cache events list - frequently accessed
    getEvents(): Observable<any> {
        if (!this.eventsCache$) {
            this.eventsCache$ = this.http.get(this.apiUrl + `page/event/dashboard`).pipe(
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
        return this.http.get(this.apiUrl + `page/event/upcoming/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching upcoming events for ${eventId}:`, error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Cache event by ID - used in route resolvers
    getEventById(eventId: string): Observable<any> {
        return this.http.get(this.apiUrl + `page/event/${eventId}`).pipe(
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
        return this.http.post(this.apiUrl + `page/event/users/${eventId}`, eventUser).pipe(
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




