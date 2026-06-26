import { Component, OnInit } from '@angular/core';
import { StudentDashboardApiService } from '../../modules/student/student-dashboard-api.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';

@Component({
  selector: 'app-student-events-list',
  standalone: false,
  templateUrl: './student-events-list.component.html',
  styleUrls: ['./student-events-list.component.scss']
})
export class StudentEventsListComponent implements OnInit {
  events: any[] = [];
  loading = true;
  error: string | null = null;
  pageNumber = 1;
  pageSize = 12;
  totalEvents = 0;

  constructor(
    private studentApi: StudentDashboardApiService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Events' }]);
    this.loadEvents();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalEvents / this.pageSize));
  }

  loadEvents(): void {
    this.loading = true;
    this.error = null;
    this.studentApi.getPublishedEvents(this.pageNumber, this.pageSize).subscribe({
      next: ({ results, total }) => {
        this.events = results || [];
        this.totalEvents = total;
        this.loading = false;
      },
      error: () => {
        this.error = 'Unable to load events.';
        this.events = [];
        this.loading = false;
      }
    });
  }

  goToPage(page: number): void {
    const next = Math.min(Math.max(1, page), this.totalPages);
    if (next === this.pageNumber) {
      return;
    }
    this.pageNumber = next;
    this.loadEvents();
  }

  getEventImage(event: any): string {
    if (!event) return '';
    if (event.eventDetails && Array.isArray(event.eventDetails)) {
      const imageDetail = event.eventDetails.find((d: any) => d?.section === 'image');
      if (imageDetail?.imageUrl) return imageDetail.imageUrl;
    }
    const url = this.getTitleImageFromEventInfo(event?.eventInfo);
    if (url) return url;
    return event.bannerImage || event.imageUrl || event.image || '';
  }

  getEventDescription(event: any): string {
    const raw = event?.shortDescription || event?.eventInfo || '';
    if (!raw || typeof raw !== 'string') return 'Learn, connect, and grow your expertise.';
    return raw
      .replace(/\n?\[TitleImage:[^\]]*\]/g, '')
      .replace(/\n?\[VideoUrl:[^\]]*\]/g, '')
      .replace(/\n?\[QAJSON\][\s\S]*$/g, '')
      .trim() || 'Learn, connect, and grow your expertise.';
  }

  private getTitleImageFromEventInfo(eventInfo: string | undefined): string {
    if (!eventInfo || typeof eventInfo !== 'string') return '';
    const m = eventInfo.match(/\[TitleImage:(.+?)\]/);
    return m ? m[1].trim() : '';
  }
}
