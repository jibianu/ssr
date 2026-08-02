import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, interval, Subject, merge } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';
import { normalizeEventCanonicalSlug } from 'src/app/core/helpers/event-canonical-slug.helper';
import { resolveEventStartTime } from 'src/app/core/helpers/event-timing.helper';
import { resolveMediaCdnUrl } from 'src/app/core/helpers/assets-cdn.helper';
import { MetadataService } from 'src/app/shared/service/meta.service';
import { CanonicalService } from 'src/app/shared/service/canonical.service';
import { StructuredDataService } from 'src/app/shared/service/structured-data.service';
import { environment } from 'src/environments/environment';

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
  /** Triggers an immediate refetch when the tab becomes visible again. */
  private readonly refreshTrigger$ = new Subject<void>();

  constructor(
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef,
    private metadataService: MetadataService,
    private canonicalService: CanonicalService,
    private structuredDataService: StructuredDataService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    // SSR: fetch once for SEO. Browser: poll every 60s + refresh on tab focus.
    const poll$ = this.isBrowser
      ? merge(interval(60_000).pipe(startWith(0)), this.refreshTrigger$.pipe(startWith(undefined)))
      : of(undefined);

    this.events$ = poll$.pipe(
      switchMap(() =>
        this.publicAppService.getPublishedEvents().pipe(
          map((events) =>
            (events || []).map((event) => ({
              ...event,
              startTime: resolveEventStartTime(event)
            }))
          ),
          catchError(() => of([]))
        )
      ),
      catchError(() => of([]))
    );
  }

  ngOnInit(): void {
    const canonicalUrl = `${environment.seoUrl}events`.replace(/([^:]\/)\/+/g, '$1');
    this.metadataService.updateMetadata({
      title: 'Oil and Gas Engineering Workshops and Events | Oilandgasclub',
      description:
        'Find upcoming oil and gas engineering workshops, expert sessions, and recorded events hosted by Oilandgasclub.',
      author: 'Oilandgasclub Team',
      type: 'website',
      image: 'https://oilandgasclub.com/assets/images/og-image.jpg',
      imageWidth: 1200,
      imageHeight: 630,
      seoUrl: canonicalUrl,
      category: 'Events, Workshops, Oil and Gas Training',
      canonicalUrl,
    });
    this.canonicalService.setCanonicalURL(canonicalUrl);
    this.structuredDataService.setBreadcrumbs([
      { name: 'Home', url: 'https://oilandgasclub.com/' },
      { name: 'Events', url: 'https://oilandgasclub.com/events' },
    ]);
    this.structuredDataService.setWebSite('Oilandgasclub', 'https://oilandgasclub.com');

    if (this.isBrowser && typeof document !== 'undefined') {
      this.visibilityChangeListener = () => {
        if (!document.hidden) {
          this.refreshTrigger$.next();
          this.cdr.markForCheck();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityChangeListener);
    }
  }

  ngOnDestroy(): void {
    this.refreshTrigger$.complete();

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

  /** Root slug route for event detail (domain/{slug}), normalized for hosted/production URLs. */
  getEventRoute(event: any): string[] {
    const slug = normalizeEventCanonicalSlug(event?.canonicalUrl ?? event?.CanonicalUrl);
    return slug ? ['/', slug] : ['/events'];
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
      if (imageDetail?.imageUrl) return resolveMediaCdnUrl(imageDetail.imageUrl);
    }

    const titleImageUrl = this.getTitleImageFromEventInfo(event?.eventInfo);
    if (titleImageUrl) return resolveMediaCdnUrl(titleImageUrl);

    return resolveMediaCdnUrl(event.bannerImage || event.imageUrl || event.image || '');
  }

  /** CDN-aware image URL for event cards (NgOptimizedImage). */
  getEventImageUrl(event: any): string {
    const url = this.getEventImage(event);
    return url || 'assets/img/oilandgasclub.jpg';
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

  onEventImageError(event: Event): void {
    const img = event.target as HTMLImageElement | null;
    if (img) {
      img.removeAttribute('src');
      img.classList.add('event-card__image--error');
    }
  }

}
