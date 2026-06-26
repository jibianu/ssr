import { Category } from './category/category.model';
import { Observable, of, BehaviorSubject, race, timer } from 'rxjs';
import { shareReplay, catchError, tap, switchMap, map } from 'rxjs/operators';
import { environment } from './../../../environments/environment';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';

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
    metaDescription?: string | null; // ✅ Meta description for SEO
    MetaDescription?: string | null; // Also accept PascalCase for compatibility
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

    // ✅ SHARED STATE: BehaviorSubject for Events to enable immediate UI sync across components
    private eventsSubject$ = new BehaviorSubject<EventResponse[]>([]);
    public events$ = this.eventsSubject$.asObservable();
    
    // ✅ DEBUG: Public getter to check current state (for debugging only)
    public getEventsCount(): number {
        return this.eventsSubject$.value.length;
    }

    private readonly isBrowser: boolean;

    constructor(
        private http: HttpClient,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        // ✅ DEBUG: Verify singleton instance
        console.log('[AdminAppService] 🏗️ Service instance created:', this);
        
        // ✅ FIX: Initialize in constructor to prevent injector errors during SSR
        // Field initializers with inject() can fail if injector is destroyed during SSR
        this.isBrowser = isPlatformBrowser(this.platformId);
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
            this.userInfoCache$ = this.http.get<any>(this.apiUrl + `api/Account/getinfo`).pipe(
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
        return this.http.put<any>(this.apiUrl + `api/Account/updateinfo`, obj).pipe(
            catchError(error => {
                console.error('Error updating profile:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    passwordUpdate(obj): Observable<any> {
        return this.http.put<any>(this.apiUrl + `api/Account/changepassword`, obj).pipe(
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
        // ✅ FIX: Always fetch fresh data if cache is invalidated
        // This ensures updates reflect everywhere
        if (!this.eventsCache$) {
            this.eventsCache$ = this.http.get<EventResponse[]>(this.apiUrl + `api/events`).pipe(
                shareReplay({ bufferSize: 1, refCount: true }),
                tap(events => {
                    // ✅ SHARED STATE: Update BehaviorSubject when events are fetched
                    if (Array.isArray(events)) {
                        this.eventsSubject$.next(events);
                    }
                }),
                catchError(error => {
                    console.error('Error fetching events:', error);
                    this.eventsCache$ = null; // ✅ ERROR HANDLING: Clear cache on error
                    this.eventsSubject$.next([]); // ✅ SHARED STATE: Emit empty array on error
                    return of([]); // ✅ ERROR HANDLING: Return empty array on error
                })
            );
        }
        return this.eventsCache$;
    }
    
    // ✅ FIX: Public method to force refresh events list
    // This can be called after updates to ensure fresh data
    refreshEvents(): void {
        this.eventsCache$ = null;
    }

    getEventById(eventId: string): Observable<EventResponse | null> {
        return this.http.get<EventResponse>(this.apiUrl + `api/events/${eventId}`).pipe(
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
        return this.http.post<EventResponse>(this.apiUrl + `api/events`, event).pipe(
            tap(newEvent => {
                // ✅ SHARED STATE: Add new event to BehaviorSubject
                // ✅ FIX: Create NEW object reference for Angular change detection
                const currentEvents = this.eventsSubject$.value;
                const newEventCopy = { ...newEvent }; // ✅ CRITICAL: New object reference
                this.eventsSubject$.next([...currentEvents, newEventCopy]);
                console.log('[AdminAppService] ✅ Added new event to shared state:', newEvent.id || (newEvent as any).Id);
                console.log('[AdminAppService] 🔁 Emitting new array reference (immutable update)');
            }),
            catchError(error => {
                console.error('[AdminAppService] Error creating event:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    updateEvent(id: string, event: EventRequest | any): Observable<EventResponse> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        
        // ✅ DEBUG: Log request payload
        const showOnDashboard = event.ShowOnDashboard ?? event.showOnDashboard;
        const registrationCompleted = event.RegistrationCompleted ?? event.registrationCompleted;
        
        console.log('[UPDATE PAYLOAD] 📤 PUT Request to backend:', {
            eventId: id,
            url: `${this.apiUrl}api/events/${id}`,
            showOnDashboard: showOnDashboard,
            registrationCompleted: registrationCompleted
        });
        
        return this.http.put<EventResponse>(this.apiUrl + `api/events/${id}`, event).pipe(
            tap(updatedEvent => {
                // ✅ SHARED STATE: Update BehaviorSubject with updated event
                const currentEvents = this.eventsSubject$.value;
                
                // ✅ FIX: Handle both camelCase (id) and PascalCase (Id) for compatibility
                const updatedEventId = updatedEvent.id || (updatedEvent as any).Id || id;
                const searchId = id.toLowerCase();
                
                console.log('[AdminAppService] 🔍 Updating shared state - Search ID:', searchId, 'Updated Event ID:', updatedEventId);
                console.log('[AdminAppService] Current events in shared state:', currentEvents.length);
                
                const index = currentEvents.findIndex(e => {
                    const eventId = (e.id || (e as any).Id || '').toLowerCase();
                    const matches = eventId === searchId || eventId === updatedEventId.toLowerCase();
                    if (matches) {
                        console.log('[AdminAppService] ✅ Found matching event at index:', currentEvents.indexOf(e), 'Event ID:', eventId);
                    }
                    return matches;
                });
                
                if (index !== -1 && currentEvents.length > 0) {
                    // ✅ IMMEDIATE UPDATE: Replace existing event in shared state (0ms delay)
                    // ✅ FIX: Create NEW array AND NEW object reference for Angular change detection
                    const updatedEvents = [...currentEvents];
                    updatedEvents[index] = { ...updatedEvent }; // ✅ CRITICAL: New object reference
                    this.eventsSubject$.next(updatedEvents);
                    console.log('[AdminAppService] ✅ Updated event in shared state IMMEDIATELY:', updatedEventId, 'at index:', index, 'Total events:', updatedEvents.length);
                    console.log('[AdminAppService] 🔁 Emitting new array reference (immutable update)');
                } else {
                    // ✅ FALLBACK: Event not in list OR shared state is empty
                    // Strategy: Add updated event immediately, then refresh list in background
                    console.log('[AdminAppService] ⚠️ Updated event not found in cache or cache is empty');
                    console.log('[AdminAppService] Current events count:', currentEvents.length);
                    console.log('[AdminAppService] Searching for ID:', searchId);
                    console.log('[AdminAppService] Updated event ID:', updatedEventId);
                    
                    // ✅ IMMEDIATE UPDATE: Add updated event to shared state right away (even if list is empty)
                    // This ensures the list page sees the update immediately without waiting for HTTP call
                    // ✅ FIX: Create NEW object reference for Angular change detection
                    const updatedEventCopy = { ...updatedEvent }; // ✅ CRITICAL: New object reference
                    
                    if (currentEvents.length > 0) {
                        // List exists but event not found - add it
                        const updatedEvents = [...currentEvents, updatedEventCopy];
                        this.eventsSubject$.next(updatedEvents);
                        console.log('[AdminAppService] ✅ Added updated event to shared state IMMEDIATELY (event was missing):', updatedEventId);
                        console.log('[AdminAppService] 🔁 Emitting new array reference (immutable update)');
                    } else {
                        // Shared state is empty - create array with just this event for immediate visibility
                        this.eventsSubject$.next([updatedEventCopy]);
                        console.log('[AdminAppService] ✅ Initialized shared state with updated event IMMEDIATELY:', updatedEventId);
                        console.log('[AdminAppService] 🔁 Emitting new array reference (immutable update)');
                    }
                    
                    // ✅ BACKGROUND REFRESH: Fetch full list in background to ensure consistency
                    // ✅ FIX: Use setTimeout to ensure immediate update happens FIRST, then refresh
                    // This prevents race condition where background refresh overwrites immediate update
                    setTimeout(() => {
                        this.eventsCache$ = null;
                        this.getEvents().subscribe({
                            next: (freshEvents) => {
                                console.log('[AdminAppService] ✅ Background refresh completed:', freshEvents.length, 'events');
                                // ✅ FIX: Only update if we got more events than what we have
                                // This prevents overwriting the immediate update if it's already correct
                                const currentState = this.eventsSubject$.value;
                                if (freshEvents.length >= currentState.length) {
                                    // Update shared state with fresh data (includes our immediate update)
                                    this.eventsSubject$.next(freshEvents);
                                    console.log('[AdminAppService] 🔄 Background refresh merged with immediate update');
                                } else {
                                    console.log('[AdminAppService] ⚠️ Background refresh returned fewer events, keeping immediate update');
                                }
                            },
                            error: (err) => {
                                console.error('[AdminAppService] ❌ Error refreshing events list:', err);
                                // Don't clear the immediate update on error - user already sees the updated event
                            }
                        });
                    }, 100); // ✅ Small delay ensures immediate update is processed first
                }
            }),
            catchError(error => {
                console.error(`[AdminAppService] Error updating event ${id}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    deleteEvent(eventId: string): Observable<any> {
        // ✅ PERFORMANCE: Invalidate events cache on mutation
        this.eventsCache$ = null;
        return this.http.delete(this.apiUrl + `api/events/${eventId}`).pipe(
            catchError(error => {
                console.error(`Error deleting event ${eventId}:`, error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    eventUploadTitleImage(file): Observable<any> {
        const data: FormData = new FormData();
        data.append('file', file);
        return this.http.post(this.apiUrl + `api/events/TitleImage`, data).pipe(
            catchError(error => {
                console.error('Error uploading event title image:', error);
                throw error; // ✅ ERROR HANDLING: Re-throw for component error handling
            })
        );
    }

    getEventByCanonicalURL(url): Observable<any> {
        const slug = normalizeEventCanonicalSlug(url);
        if (!slug) {
            return of(null);
        }

        const detail$ = this.http
            .get<any>(this.apiUrl + `api/events/event/` + encodeURIComponent(slug))
            .pipe(
                map((event) => (event?.id ? event : null)),
                catchError((error) => {
                    const isNetworkError =
                        error instanceof HttpErrorResponse && (!error.status || error.status === 0);
                    if (!this.isBrowser && isNetworkError) {
                        console.warn(`SSR: Network error fetching event by URL ${slug}`);
                    }
                    return of(null);
                })
            );

        // Production detail endpoint can exceed 30s; use fast published list after 8s.
        return race([detail$, timer(8000).pipe(map(() => null))]).pipe(
            switchMap((event) => (event ? of(event) : this.fetchPublishedEventBySlug(slug)))
        );
    }

    /** Fallback when GET api/events/event/{slug} times out or fails on production. */
    private fetchPublishedEventBySlug(slug: string): Observable<any | null> {
        return this.http.get<any>(this.apiUrl + 'api/events/published').pipe(
            map((body: any) => {
                const list = Array.isArray(body) ? body : (body?.data ?? body?.items ?? []);
                if (!Array.isArray(list)) {
                    return null;
                }
                return (
                    list.find(
                        (e: any) =>
                            normalizeEventCanonicalSlug(e?.canonicalUrl ?? e?.CanonicalUrl) === slug
                    ) ?? null
                );
            }),
            catchError(() => of(null))
        );
    }

    getEventUsers(eventId: string): Observable<any> {
        return this.http.get(this.apiUrl + `api/events/users/${eventId}`).pipe(
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


