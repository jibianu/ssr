import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StudentDashboardApiService } from '../../modules/student/student-dashboard-api.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { AdminAppService } from '../../modules/adminapp/adminapp.service';

@Component({
  selector: 'app-student-completed-event-content',
  standalone: false,
  templateUrl: './student-completed-event-content.component.html',
  styleUrls: ['./student-completed-event-content.component.scss']
})
export class StudentCompletedEventContentComponent implements OnInit {
  eventId = '';
  occurrenceId = '';
  loading = true;
  error: string | null = null;
  content: any = null;
  status: any = null;
  eventTitle = '';
  activeVideo: { title?: string; description?: string; videoLink?: string } | null = null;
  videoPlaybackError = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentApi: StudentDashboardApiService,
    private adminApp: AdminAppService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.eventId = this.route.snapshot.paramMap.get('eventId') || '';
    this.occurrenceId = this.route.snapshot.paramMap.get('occurrenceId') || '';
    if (!this.eventId || !this.occurrenceId) {
      this.error = 'Invalid event link.';
      this.loading = false;
      return;
    }
    this.studentApi.getEventById(this.eventId).subscribe({
      next: (evt) => {
        this.eventTitle = evt?.title ?? evt?.Title ?? 'Event';
        this.studentBreadcrumb.setBreadcrumb([
          { label: 'Events', url: '/app/student/events' },
          { label: 'Completed Events', url: '/app/student/events/completed' },
          { label: this.eventTitle }
        ]);
      }
    });
    this.loadStatusAndContent();
  }

  loadStatusAndContent(): void {
    this.loading = true;
    this.error = null;
    this.studentApi.getEventRecordingStatus(this.eventId, this.occurrenceId).subscribe({
      next: (status) => {
        this.status = status;
        if (status?.hasAccess) {
          this.studentApi.getEventRecordingAccess(this.eventId, this.occurrenceId).subscribe({
            next: (content) => {
              const videos = (content?.videos || []).map((v: any) => ({
                ...v,
                title: v.title ?? v.Title ?? '',
                description: v.description ?? v.Description ?? '',
                videoLink: (v.videoLink ?? v.VideoLink ?? '').trim()
              }));
              this.content = { ...content, videos };
              if (videos.length > 0) {
                this.setActiveVideo(videos[0]);
              }
              this.loading = false;
            },
            error: (err) => {
              this.error = err?.error?.message || 'Unable to load recording content.';
              this.loading = false;
            }
          });
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.error = 'Unable to check access.';
        this.loading = false;
      }
    });
  }

  goToPayment(): void {
    this.router.navigate(['/checkout/event', this.eventId], {
      queryParams: { occurrenceId: this.occurrenceId, forRecording: 'true' }
    });
  }

  videoStreamUrl(url: string): string {
    return this.adminApp.getVideoStreamUrl(url);
  }

  /** Same helper as course curriculum video page. */
  getVideoSrc(url: string): string | null {
    return this.videoStreamUrl(url) || null;
  }

  getProviderType(url: string): 'local' | 'youtube' {
    if (!url) return 'local';
    return url.includes('youtube.com') || url.includes('youtu.be') ? 'youtube' : 'local';
  }

  setActiveVideo(video: { title?: string; description?: string; videoLink?: string }): void {
    if (!video) return;
    this.activeVideo = video;
    this.videoPlaybackError = false;
  }

  onVideoError(): void {
    this.videoPlaybackError = true;
  }

  formatPrice(amount: number | undefined): string {
    const n = Number(amount ?? 0);
    if (!n) return 'Free';
    return `₹${n.toLocaleString('en-IN')}`;
  }
}
