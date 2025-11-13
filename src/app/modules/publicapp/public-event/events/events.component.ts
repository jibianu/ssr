import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { PublicAppService } from '../../publicapp.service';

@Component({
    selector: 'app-events',
    templateUrl: './events.component.html',
    styleUrls: ['./events.component.scss'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.OnPush // ✅ PERFORMANCE: OnPush change detection
})
export class EventsComponent {

  bgImage = 'https://courseoilandgasbucket.s3.ap-northeast-1.amazonaws.com/Event/header.jpg';
  viewMoreCategory = false;
  viewMoreDate = false;
  mobileFiltersOpen = false;
  
  // ✅ SSR OPTIMIZATION: Use Observable with async pipe (non-blocking)
  events$: Observable<any[]>;

  constructor(
    private publicAppService: PublicAppService
  ) {
    // ✅ SSR OPTIMIZATION: Non-blocking Observable pipeline
    // Data is processed asynchronously - doesn't block SSR rendering
    this.events$ = this.publicAppService.getEvents().pipe(
      catchError(error => {
        console.error('Error loading events:', error);
        return of([]); // Fallback to empty array
      }),
      shareReplay(1) // ✅ Cache for multiple subscriptions/renders
    );
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
}
