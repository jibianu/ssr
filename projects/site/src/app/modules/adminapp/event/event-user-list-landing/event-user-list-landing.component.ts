import { AdminAppService } from '../../adminapp.service';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-event-user-list-landing',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-user-list-landing.component.html',
  styleUrls: ['./event-user-list-landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EventUserListLandingComponent implements OnInit, OnDestroy {
  events: any[] = [];
  loading = true;
  subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.subscription.add(
      this.appService.getEvents().subscribe({
        next: (list) => {
          this.events = Array.isArray(list) ? list : [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.events = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  getEventId(event: any): string {
    return event?.id || event?.Id || '';
  }

  getEventTitle(event: any): string {
    return event?.title || event?.Title || 'Untitled';
  }
}
