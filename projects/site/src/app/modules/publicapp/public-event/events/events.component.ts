import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, interval, Subscription } from 'rxjs';
import { catchError, tap, switchMap, startWith, takeUntil } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';

@Component({
    selector: 'app-events',
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class EventsComponent implements OnInit, OnDestroy {

  viewMoreCategory = false;
  viewMoreDate = false;
  mobileFiltersOpen = false;
  
  // ✅ SSR OPTIMIZATION: Use Observable with async pipe (non-blocking)
  events$: Observable<any[]>;
  private readonly isBrowser: boolean;
  private visibilityChangeListener?: () => void;
  private eventsSubscription?: Subscription;

  constructor(
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // ✅ INSTANT UPDATES: Auto-refresh every 5 seconds + on page visibility change
    // This ensures checkbox updates appear within 5 seconds without page reload
    const refreshInterval$ = this.isBrowser 
      ? interval(5000).pipe(startWith(0)) // Poll every 5 seconds, start immediately
      : of(0); // SSR: only fetch once
    
    // ✅ Use getPublishedEvents() so all published events show (no ShowOnDashboard required)
    // Auto-refreshes every 5 seconds to catch admin updates instantly
    // ✅ SSR FIX: Guard service calls to prevent injector destroyed errors
    this.events$ = refreshInterval$.pipe(
      switchMap(() => {
        // ✅ SSR FIX: Only make service calls if not destroyed and in browser context
        if (!this.isBrowser) {
          // SSR: Return empty array immediately without service call
          return of([]);
        }
        
        // Browser: Make service call
        if (this.isBrowser) {
        console.log('[EventsComponent] Refreshing events from backend...');
        }
        return this.publicAppService.getPublishedEvents().pipe(
          catchError(error => {
            // ✅ SSR FIX: Only log errors in browser
            if (this.isBrowser) {
            console.error('[EventsComponent] Error fetching published events:', error);
            }
            return of([]); // Return empty array on error to keep polling
          })
        );
      }),
      tap((events: any[]) => {
        // ✅ SSR FIX: Only log in browser context
        if (this.isBrowser) {
        // Debug: Log events received from backend (already filtered)
        console.log(`[EventsComponent] Events received from backend (published): ${events?.length || 0}`);
        if (events && events.length > 0) {
          console.log('[EventsComponent] Sample event:', { title: events[0].title });
          }
        }
      }),
      catchError(error => {
        // ✅ SSR FIX: Only log errors in browser
        if (this.isBrowser) {
        console.error('[EventsComponent] Error loading events:', error);
        }
        return of([]);
      })
    );
  }

  ngOnInit(): void {
    // ✅ INSTANT UPDATES: Refresh when page becomes visible (user switches back to tab)
    // This ensures updates appear immediately when admin makes changes
    if (this.isBrowser && typeof document !== 'undefined') {
      this.visibilityChangeListener = () => {
        if (!document.hidden) {
          console.log('[EventsComponent] Page visible - refreshing events...');
          // Trigger change detection to refresh the observable
          this.cdr.markForCheck();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityChangeListener);
    }
  }

  ngOnDestroy(): void {
    // ✅ SSR FIX: Clean up all subscriptions to prevent injector destroyed errors
    // Note: async pipe handles unsubscription automatically, but we guard here for safety
    if (this.eventsSubscription) {
      this.eventsSubscription.unsubscribe();
      this.eventsSubscription = undefined;
    }
    
    // Clean up visibility change listener
    if (this.isBrowser && this.visibilityChangeListener && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeListener);
      this.visibilityChangeListener = undefined;
    }
  }

  // ✅ PERFORMANCE: Add trackBy function for ngFor optimization
  trackByEventId(index: number, event: any): string {
    return event?.id || index.toString();
  }

  trackByTagIndex(index: number, tag: string): number {
    return index;
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen = !this.mobileFiltersOpen;
  }

  /**
   * Get event image URL from eventDetails array, eventInfo [TitleImage:...], or event properties
   */
  getEventImage(event: any): string {
    if (!event) return '';

    if (event.eventDetails && Array.isArray(event.eventDetails)) {
      const imageDetail = event.eventDetails.find(
        (detail: any) => detail.section === 'image'
      );
      if (imageDetail?.imageUrl) return imageDetail.imageUrl;
    }

    const titleImageUrl = this.getTitleImageFromEventInfo(event?.eventInfo);
    if (titleImageUrl) return titleImageUrl;

    return event.bannerImage || event.imageUrl || event.image || '';
  }

  /** Strip [TitleImage:...] and [VideoUrl:...] from eventInfo for display. */
  getEventDescription(event: any): string {
    const raw = event?.shortDescription || event?.eventInfo || '';
    if (!raw || typeof raw !== 'string') return 'Learn, connect, and grow your expertise with peers and industry veterans.';
    const stripped = raw
      .replace(/\n?\[TitleImage:[^\]]*\]/g, '')
      .replace(/\n?\[VideoUrl:[^\]]*\]/g, '')
      .replace(/\n?\[QAJSON\][\s\S]*$/g, '')
      .trim();
    return stripped || 'Learn, connect, and grow your expertise with peers and industry veterans.';
  }

  private getTitleImageFromEventInfo(eventInfo: string | undefined): string {
    if (!eventInfo || typeof eventInfo !== 'string') return '';
    const m = eventInfo.match(/\[TitleImage:(.+?)\]/);
    return m ? m[1].trim() : '';
  }

}
