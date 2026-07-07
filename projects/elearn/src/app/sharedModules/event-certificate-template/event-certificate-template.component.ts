import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { getApiBaseUrl } from 'src/app/core/helpers/api-base-url.helper';

@Component({
  selector: 'app-event-certificate-template',
  templateUrl: './event-certificate-template.component.html',
  styleUrls: ['../certificate-template/certificate-template.component.scss'],
  standalone: false
})
export class EventCertificateTemplateComponent implements OnInit, OnDestroy {

  subscription = new Subscription();
  event: any;
  eventId: string;
  occurrenceId: string | null = null;
  eventUserId: string | null = null;
  certificateReady = false;
  statusMessage = '';
  messageType: 'info' | 'warning' | 'error' = 'info';
  eventLoadError = false;
  loading = true;
  copySuccessMessage = '';

  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private sharedService: SharedService,
    private authService: AuthenticationService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {
    this.activatedRoute.params.subscribe(res => {
      this.eventId = res.eventId;
    });
    this.activatedRoute.queryParams.subscribe((q) => {
      const occ = q?.['occurrenceId'];
      if (occ) this.occurrenceId = String(occ);
    });
  }

  ngOnInit(): void {
    document.body.classList.add('certificate-page-active');
    this.studentBreadcrumb.setBreadcrumb([
      { label: 'Certificates', url: '/app/student/certificate' },
      { label: 'Event Certificate' }
    ]);
    this.loadEvent();
  }

  private loadEvent(): void {
    this.certificateReady = false;
    this.eventUserId = null;
    this.statusMessage = '';
    this.eventLoadError = false;
    this.loading = true;

    this.subscription.add(
      this.appService.getEventById(this.eventId).pipe(
        catchError(() => {
          this.eventLoadError = true;
          this.event = null;
          this.loading = false;
          return of(null);
        })
      ).subscribe(res => {
        if (res == null) {
          this.loading = false;
          return;
        }
        this.event = res;
        this.sharedService.certificateName.next(this.event?.title ?? '');
        this.studentBreadcrumb.setBreadcrumb([
          { label: 'Certificates', url: '/app/student/certificate' },
          { label: this.event?.title || 'Event Certificate' }
        ]);
        this.checkCertificate();
      })
    );
  }

  private checkCertificate(): void {
    this.subscription.add(
      this.appService.checkEventCertificateCompleted(this.eventId, this.occurrenceId ?? undefined).pipe(
        catchError(() => {
          this.certificateReady = false;
          this.statusMessage = 'Unable to check certificate status.';
          this.messageType = 'warning';
          this.loading = false;
          return of<{ completed: boolean; eventUserId?: string }>({ completed: false });
        })
      ).subscribe(res => {
        this.loading = false;
        if (res?.eventUserId) {
          this.eventUserId = String(res.eventUserId);
        }
        this.certificateReady = res?.completed ?? false;
        if (!this.certificateReady) {
          this.statusMessage = 'Your certificate will be available after the event is marked as completed and your payment is confirmed.';
          this.messageType = 'warning';
        }
      })
    );
  }

  viewCertificate(): void {
    if (!this.eventId) return;
    const token = this.authService.currentToken();
    let url = getApiBaseUrl() + 'certificate/event/view/' + this.eventId;
    const params = new URLSearchParams();
    if (this.occurrenceId) params.set('occurrenceId', this.occurrenceId);
    if (token) params.set('token', token);
    const qs = params.toString();
    if (qs) url += '?' + qs;
    window.open(url, '_blank');
  }

  downloadCertificate(): void {
    if (!this.eventId) return;
    const token = this.authService.currentToken();
    let url = getApiBaseUrl() + 'certificate/event/download/' + this.eventId;
    const params = new URLSearchParams();
    if (this.occurrenceId) params.set('occurrenceId', this.occurrenceId);
    if (token) params.set('token', token);
    const qs = params.toString();
    if (qs) url += '?' + qs;
    window.open(url, '_blank');
  }

  getCertificateViewUrl(): string {
    if (!this.eventId) return '';
    const token = this.authService.currentToken();
    let url = getApiBaseUrl() + 'certificate/event/view/' + this.eventId;
    const params = new URLSearchParams();
    if (this.occurrenceId) params.set('occurrenceId', this.occurrenceId);
    if (token) params.set('token', token);
    const qs = params.toString();
    return qs ? url + '?' + qs : url;
  }

  shareOnLinkedIn(): void {
    const url = this.getCertificateViewUrl();
    if (!url) return;
    const linkedInShare = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    window.open(linkedInShare, '_blank', 'width=600,height=600');
  }

  copyCertificateLink(): void {
    const url = this.getCertificateViewUrl();
    if (!url) return;
    const done = () => {
      this.copySuccessMessage = 'Link copied! Paste it in LinkedIn under Licenses & Certifications.';
      setTimeout(() => { this.copySuccessMessage = ''; }, 4000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => { this.fallbackCopy(url); done(); });
    } else {
      this.fallbackCopy(url);
      done();
    }
  }

  private fallbackCopy(url: string): void {
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('certificate-page-active');
    this.subscription.unsubscribe();
    this.sharedService.certificateName.next('');
  }
}
