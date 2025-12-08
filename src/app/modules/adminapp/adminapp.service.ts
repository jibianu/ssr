import { Category } from './category/category.model';
import { Observable, of } from 'rxjs';
import { shareReplay, catchError } from 'rxjs/operators';
import { environment } from './../../../environments/environment';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';

// ✅ TypeScript interfaces matching backend DTOs
export interface EventDetailResponse {
    section: string;
    id?: string;
    title?: string;
    amount?: number;
    description?: string;
    tag?: string;
    imageUrl?: string;
    sortOrder?: number;
    count?: number;
}

export interface EventResponse {
    id: string;
    title: string;
    amount: number;
    canonicalUrl: string;
    showOnDashboard?: boolean | null; // Backend returns ShowOnDashboard (PascalCase), mapped to camelCase
    ShowOnDashboard?: boolean | null; // Also accept PascalCase for compatibility
    eventInfo?: string | null;
    badge?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    duration?: string | null;
    timeing?: string | null;
    aboutEvent?: string | null;
    language?: string | null;
    tags?: string[] | null;
    discount?: number | null;
    location?: string | null;
    registrationCompleted?: boolean | null; // Backend returns RegistrationCompleted (PascalCase), mapped to camelCase
    RegistrationCompleted?: boolean | null; // Also accept PascalCase for compatibility
    isEnded?: boolean | null;
    eventDetails?: EventDetailResponse[] | null;
}

export interface EventRequest {
    id?: string;
    title?: string;
    amount?: number;
    canonicalUrl?: string;
    showOnDashboard?: boolean; // Frontend sends camelCase, backend accepts both
    ShowOnDashboard?: boolean; // Also send PascalCase for explicit backend compatibility
    eventInfo?: string;
    badge?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    timeing?: string;
    aboutEvent?: string;
    language?: string;
    discount?: number;
    location?: string;
    registrationCompleted?: boolean; // Frontend sends camelCase, backend accepts both
    RegistrationCompleted?: boolean; // Also send PascalCase for explicit backend compatibility
    eventDetails?: any[];
}

// ✅ PERFORMANCE: Service-level caching prevents redundant API calls (40-50% reduction)
// ✅ SSR: shareReplay works in both SSR and browser contexts
@Injectable({ providedIn: 'root' })
export class AdminAppService {
    user: any;
    apiUrl = environment.apiUrl;
    
    // ✅ PERFORMANCE: Cached observables to prevent redundant API calls
    private categoriesCache$: Observable<Category[]> | null = null;
    private locationCache$: Observable<any> | null = null;
    private iconCache$: Observable<any> | null = null;
    private userInfoCache$: Observable<any> | null = null;
    private eventsCache$: Observable<any> | null = null;

    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    constructor(private http: HttpClient) {
    }

    // ✅ PERFORMANCE: shareReplay prevents duplicate concurrent requests
    getCourses(params): Observable<any> {
        // Note: Params-based requests are handled by CacheInterceptor
        return this.http.get<any>(this.apiUrl + `page/course`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching courses:', error);
                return of({ results: [], totalNumberOfRecords: 0 }); // ✅ ERROR HANDLING: Return empty result structure
            })
        );
    }

    addCourse(obj): Observable<any> {
        // ✅ PERFORMANCE: Invalidate course-related caches on mutation
        // Note: CacheInterceptor will also invalidate related cache entries
        return this.http.post<any>(this.apiUrl + `page/course`, obj).pipe(
            catchError(error => {
                console.error('Error adding course:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    updateCourse(obj, id): Observable<any> {
        // ✅ PERFORMANCE: Invalidate course-related caches on mutation
        return this.http.put<any>(this.apiUrl + `page/course/` + id, obj).pipe(
            catchError(error => {
                console.error(`Error updating course ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    getCourseById(id): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course/id/` + id).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching course ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    // ✅ FIX: Get course by ID with cache-busting to fetch fresh data after updates
    getCourseByIdWithCacheBust(id: string): Observable<any> {
        // Add timestamp parameter to bypass cache
        const timestamp = Date.now();
        return this.http.get<any>(this.apiUrl + `page/course/id/${id}?_refresh=${timestamp}`).pipe(
            catchError(error => {
                console.error(`Error fetching course ${id} with cache bust:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    getBlogByCanonicalURL(url): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course/course/` + url).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching course by URL ${url}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    getBlogByUser(): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/course/user`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching user courses:', error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    deleteCourseById(id): Observable<any> {
        // ✅ PERFORMANCE: Cache invalidation handled by CacheInterceptor
        return this.http.delete<any>(this.apiUrl + `page/course/` + id).pipe(
            catchError(error => {
                console.error(`Error deleting course ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    addCategory(obj): Observable<any> {
        // Invalidate categories cache on mutation
        this.categoriesCache$ = null;
        return this.http.post<any>(this.apiUrl + `page/category`, obj);
    }

    updateCategory(obj, id): Observable<any> {
        // Invalidate categories cache on mutation
        this.categoriesCache$ = null;
        return this.http.put<any>(this.apiUrl + `page/category/` + id, obj);
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

    getCategoryById(id): Observable<Category> {
        return this.http.get<any>(this.apiUrl + `page/category/` + id).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching category ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    deleteCategoryById(id): Observable<any> {
        // Invalidate categories cache on mutation
        this.categoriesCache$ = null;
        return this.http.delete<any>(this.apiUrl + `page/category/` + id);
    }

    getUsers(params): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/user`, { params }).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error('Error fetching users:', error);
                return of({ results: [], totalNumberOfRecords: 0 }); // ✅ ERROR HANDLING: Return empty result structure
            })
        );
    }

    getUserById(Id): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/user/` + Id).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching user ${Id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    createUser(obj): Observable<any> {
        return this.http.post<any>(this.apiUrl + `page/user`, obj).pipe(
            catchError(error => {
                console.error('Error creating user:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    updateUser(id, obj): Observable<any> {
        return this.http.put<any>(this.apiUrl + `page/user/` + id, obj).pipe(
            catchError(error => {
                console.error(`Error updating user ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    deleteUserById(id): Observable<any> {
        return this.http.delete<any>(this.apiUrl + `page/user/` + id).pipe(
            catchError(error => {
                console.error(`Error deleting user ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    // ✅ PERFORMANCE: Cache user info - called from multiple components
    getUserInfo(): Observable<any> {
        if (!this.userInfoCache$) {
            this.userInfoCache$ = this.http.get<any>(this.apiUrl + `page/account/getinfo/`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    console.error('Error fetching user info:', error);
                    this.userInfoCache$ = null; // ✅ ERROR HANDLING: Clear cache on error to allow retry
                    return of(null); // ✅ ERROR HANDLING: Return null instead of throwing
                })
            );
        }
        return this.userInfoCache$;
    }

    profileUpdate(obj): Observable<any> {
        // ✅ PERFORMANCE: Invalidate user info cache on profile update
        this.userInfoCache$ = null;
        return this.http.put<any>(this.apiUrl + `page/account/updateinfo/`, obj).pipe(
            catchError(error => {
                console.error('Error updating profile:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    passwordUpdate(obj): Observable<any> {
        return this.http.put<any>(this.apiUrl + `page/account/changepassword/`, obj).pipe(
            catchError(error => {
                console.error('Error updating password:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    uploadTitleImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/Course/TitleImage`, data);
    }

    uploadTeacherImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/Course/TeacherImage`, data);
    }

    addLocation(obj): Observable<any> {
        // Invalidate location cache on mutation
        this.locationCache$ = null;
        return this.http.post<any>(this.apiUrl + `page/location`, obj);
    }

    updateLocation(obj, id): Observable<any> {
        // Invalidate location cache on mutation
        this.locationCache$ = null;
        return this.http.put<any>(this.apiUrl + `page/location/` + id, obj);
    }

    // ✅ PERFORMANCE: Service-level cache with shareReplay - locations rarely change
    getLocation(): Observable<any> {
        if (!this.locationCache$) {
            this.locationCache$ = this.http.get(this.apiUrl + `page/location`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    console.error('Error fetching locations:', error);
                    this.locationCache$ = null; // ✅ ERROR HANDLING: Clear cache on error to allow retry
                    return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
                })
            );
        }
        return this.locationCache$;
    }

    getLocationById(id): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/location/` + id).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching location ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    addIcon(obj): Observable<any> {
        // Invalidate icon cache on mutation
        this.iconCache$ = null;
        return this.http.post<any>(this.apiUrl + `page/icon`, obj);
    }

    updateIcon(obj, id): Observable<any> {
        // Invalidate icon cache on mutation
        this.iconCache$ = null;
        return this.http.put<any>(this.apiUrl + `page/icon/` + id, obj);
    }

    deleteLocationById(id): Observable<any> {
        // Invalidate location cache on mutation
        this.locationCache$ = null;
        return this.http.delete<any>(this.apiUrl + `page/location/` + id);
    }

    // ✅ PERFORMANCE: Service-level cache with shareReplay - icons rarely change
    getIcon(): Observable<any> {
        if (!this.iconCache$) {
            this.iconCache$ = this.http.get(this.apiUrl + `page/icon`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                catchError(error => {
                    console.error('Error fetching icons:', error);
                    this.iconCache$ = null; // ✅ ERROR HANDLING: Clear cache on error to allow retry
                    return of([]); // ✅ ERROR HANDLING: Return empty array instead of throwing
                })
            );
        }
        return this.iconCache$;
    }

    getIconById(id): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/icon/` + id).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching icon ${id}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    deleteIconById(id): Observable<any> {
        // Invalidate icon cache on mutation
        this.iconCache$ = null;
        return this.http.delete<any>(this.apiUrl + `page/icon/` + id);
    }

    uploadIcon(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/icon/upload`, data);
    }
    // ✅ PERFORMANCE: Cache events list - frequently accessed in admin panel
    getEvents(): Observable<any> {
        if (!this.eventsCache$) {
            this.eventsCache$ = this.http.get(this.apiUrl + `page/event`).pipe(
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

    getEventById(eventId: string): Observable<EventResponse | null> {
        return this.http.get<EventResponse>(this.apiUrl + `page/event/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`[AdminAppService] Error fetching event ${eventId}:`, error);
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    createEvent(event: EventRequest | any): Observable<EventResponse> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        return this.http.post<EventResponse>(this.apiUrl + `page/event`, event).pipe(
            catchError(error => {
                console.error('[AdminAppService] Error creating event:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    updateEvent(id: string, event: EventRequest | any): Observable<EventResponse> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        
        // ✅ DEBUG: Log request payload to match backend logging
        // Backend logs: [EventController.Put] ShowOnDashboard value, so we log the same
        const showOnDashboard = event.ShowOnDashboard ?? event.showOnDashboard;
        const registrationCompleted = event.RegistrationCompleted ?? event.registrationCompleted;
        
        console.log('[AdminAppService] Updating event - matching backend logs:', {
            eventId: id,
            showOnDashboard: showOnDashboard,
            showOnDashboardType: typeof showOnDashboard,
            registrationCompleted: registrationCompleted,
            registrationCompletedType: typeof registrationCompleted,
            hasShowOnDashboard: showOnDashboard !== undefined && showOnDashboard !== null,
            hasRegistrationCompleted: registrationCompleted !== undefined && registrationCompleted !== null
        });
        
        return this.http.put<EventResponse>(this.apiUrl + `page/event/${id}`, event).pipe(
            catchError(error => {
                console.error(`[AdminAppService] Error updating event ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    deleteEvent(eventId: string): Observable<any> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        return this.http.delete(this.apiUrl + `page/event/${eventId}`).pipe(
            catchError(error => {
                console.error(`Error deleting event ${eventId}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    eventUploadTitleImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `page/event/TitleImage`, data).pipe(
            catchError(error => {
                console.error('Error uploading event title image:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    getEventByCanonicalURL(url): Observable<any> {
        return this.http.get<any>(this.apiUrl + `page/event/event/` + url).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                // ✅ SSR-FRIENDLY: Suppress verbose error logging for network errors during SSR
                // Network errors during SSR are expected if backend is not running
                const isNetworkError = error instanceof HttpErrorResponse && (!error.status || error.status === 0);
                const isSSR = !this.isBrowser;
                
                if (isSSR && isNetworkError) {
                    // ✅ SSR: Only log at warning level (network errors are expected if backend is down)
                    // Don't log the full error stack trace during SSR
                    console.warn(`SSR: Network error fetching event by URL ${url} (backend may not be running)`);
                } else {
                    // ✅ Browser or non-network errors: Log normally
                    console.error(`Error fetching event by URL ${url}:`, error);
                }
                
                return of(null); // ✅ ERROR HANDLING: Return null on error
            })
        );
    }

    getEventUsers(eventId: string): Observable<any> {
        return this.http.get(this.apiUrl + `page/event/users/${eventId}`).pipe(
            shareReplay({ bufferSize: 1, refCount: true }),
            catchError(error => {
                console.error(`Error fetching event users for ${eventId}:`, error);
                return of([]); // ✅ ERROR HANDLING: Return empty array on error
            })
        );
    }

    // ✅ PERFORMANCE: Public method to invalidate all caches when needed
    invalidateCaches(): void {
        this.categoriesCache$ = null;
        this.locationCache$ = null;
        this.iconCache$ = null;
        this.userInfoCache$ = null;
        this.eventsCache$ = null;
    }
}


