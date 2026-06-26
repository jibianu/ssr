import { AdminAppService } from '../../adminapp.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-event-user-list-landing',
  templateUrl: './event-user-list-landing.component.html',
  styleUrls: ['./event-user-list-landing.component.scss'],
  standalone: false
})
export class EventUserListLandingComponent implements OnInit, OnDestroy {
  events: any[] = [];
  loading = true;
  subscription = new Subscription();

  constructor(private appService: AdminAppService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appService.getEventsAll().subscribe({
        next: (data) => {
          this.events = data || [];
          this.loading = false;
        },
        error: () => {
          this.events = [];
          this.loading = false;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getEventId(event: any): string {
    const id = event?.id ?? event?.Id;
    return id != null ? String(id) : '';
  }

  getEventTitle(event: any): string {
    return event?.title ?? event?.Title ?? 'Untitled';
  }

  getEventStartDate(event: any): any {
    return event?.startDate ?? event?.StartDate ?? null;
  }
}
