import { ActivatedRoute } from '@angular/router';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import { AuthenticationService } from 'src/app/modules/auth/auth.service';
import { StudentBreadcrumbService } from 'src/app/core/services/student-breadcrumb.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-certificate-template',
  templateUrl: './certificate-template.component.html',
  styleUrls: ['./certificate-template.component.scss'],
  standalone: false
})
export class CertificateTemplateComponent implements OnInit, OnDestroy {

  subscription = new Subscription();
  course: any;
  courseId: string;
  enrollmentId: string | null = null;
  /** True when course is completed — show View/Download buttons */
  courseCompleted = false;
  /** Friendly message when certificate not available */
  statusMessage = '';
  /** Message type for styling */
  messageType: 'info' | 'warning' | 'error' = 'info';
  courseLoadError = false;
  loading = true;
  /** Brand logo URL (e.g. from S3) */
  logoUrl = (environment as { logoUrl?: string }).logoUrl ?? '';
  /** Brand name for Oil and Gas Club */
  brandName = (environment as { certificateBrandName?: string }).certificateBrandName ?? 'Oil and Gas Club';

  constructor(
    private appService: AdminAppService,
    private activatedRoute: ActivatedRoute,
    private sharedService: SharedService,
    private authService: AuthenticationService,
    private studentBreadcrumb: StudentBreadcrumbService
  ) {
    this.activatedRoute.params.subscribe(res => {
      this.courseId = res.courseID;
    });
  }

  ngOnInit(): void {
    document.body.classList.add('certificate-page-active');
    this.studentBreadcrumb.setBreadcrumb([
      { label: 'Certificates', url: '/app/student/certificate' },
      { label: 'Certificate' }
    ]);
    this.fnFetchCourse();
  }

  fnFetchCourse(): void {
    this.courseCompleted = false;
    this.enrollmentId = null;
    this.statusMessage = '';
    this.courseLoadError = false;
    this.loading = true;

    this.subscription.add(
      this.appService.getCourseById(this.courseId).pipe(
        catchError(() => {
          this.courseLoadError = true;
          this.course = null;
          this.loading = false;
          return of(null);
        })
      ).subscribe(res => {
        if (res == null) {
          this.loading = false;
          return;
        }
        this.course = res;
        this.sharedService.certificateName.next(this.course?.title ?? '');
        this.studentBreadcrumb.setBreadcrumb([
          { label: 'Certificates', url: '/app/student/certificate' },
          { label: this.course?.title || 'Certificate' }
        ]);
        const enrollmentId = res?.entrollmentId;
        if (!enrollmentId) {
          this.statusMessage = 'Enrollment not found.';
          this.messageType = 'warning';
          this.loading = false;
          return;
        }
        this.enrollmentId = String(enrollmentId);
        this.checkCompleted();
      })
    );
  }

  private checkCompleted(): void {
    if (!this.enrollmentId) {
      this.loading = false;
      return;
    }
    this.subscription.add(
      this.appService.checkCertificateCompleted(this.enrollmentId).pipe(
        catchError(() => {
          this.courseCompleted = false;
          this.statusMessage = 'Unable to check certificate status.';
          this.messageType = 'warning';
          this.loading = false;
          return of({ completed: false });
        })
      ).subscribe(res => {
        this.loading = false;
        this.courseCompleted = res?.completed ?? false;
        if (!this.courseCompleted) {
          this.statusMessage = 'Complete the course to unlock your certificate.';
          this.messageType = 'warning';
        }
      })
    );
  }

  viewCertificate(): void {
    if (!this.enrollmentId) return;
    const token = this.authService.currentToken();
    const url = environment.apiUrl + 'certificate/view/' + this.enrollmentId +
      (token ? '?token=' + encodeURIComponent(token) : '');
    window.open(url, '_blank');
  }

  downloadCertificate(): void {
    if (!this.enrollmentId) return;
    const token = this.authService.currentToken();
    const url = environment.apiUrl + 'certificate/download/' + this.enrollmentId +
      (token ? '?token=' + encodeURIComponent(token) : '');
    window.open(url, '_blank');
  }

  /** Build the certificate view URL (for sharing or adding to LinkedIn). */
  getCertificateViewUrl(): string {
    if (!this.enrollmentId) return '';
    const token = this.authService.currentToken();
    return environment.apiUrl + 'certificate/view/' + this.enrollmentId +
      (token ? '?token=' + encodeURIComponent(token) : '');
  }

  /** Open LinkedIn share dialog with the certificate view URL. */
  shareOnLinkedIn(): void {
    const url = this.getCertificateViewUrl();
    if (!url) return;
    const linkedInShare = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
    window.open(linkedInShare, '_blank', 'width=600,height=600');
  }

  /** Shown briefly after copying certificate link */
  copySuccessMessage = '';

  /** Copy certificate URL to clipboard for adding to LinkedIn profile (Licenses & Certifications). */
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
