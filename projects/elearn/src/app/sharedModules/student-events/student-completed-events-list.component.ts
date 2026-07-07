import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StudentDashboardApiService } from '../../modules/student/student-dashboard-api.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

@Component({
  selector: 'app-student-completed-events-list',
  standalone: false,
  templateUrl: './student-completed-events-list.component.html',
  styleUrls: ['./student-completed-events-list.component.scss']
})
export class StudentCompletedEventsListComponent implements OnInit {
  events: any[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private studentApi: StudentDashboardApiService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([
      { label: 'Events', url: '/app/student/events' },
      { label: 'Completed Events' }
    ]);
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading = true;
    this.error = null;
    this.studentApi.getCompletedEvents().subscribe({
      next: (list) => {
        this.events = list || [];
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load completed events.';
        this.events = [];
        this.loading = false;
      }
    });
  }

  openEvent(item: any): void {
    const eventId = item.eventId ?? item.EventId;
    const occurrenceId = item.occurrenceId ?? item.OccurrenceId;
    if (!eventId || !occurrenceId) return;
    this.router.navigate(['/app/student/events/completed', eventId, occurrenceId]);
  }

  getEventImage(event: any): string {
    const eventInfo = event?.eventInfo ?? event?.EventInfo ?? '';
    const m = eventInfo.match(/\[TitleImage:(.+?)\]/);
    return m ? m[1].trim() : '';
  }

  formatDate(value: string | undefined): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatPrice(amount: number | undefined): string {
    const n = Number(amount ?? 0);
    if (!n) return 'Free';
    return `₹${n.toLocaleString('en-IN')}`;
  }
}
