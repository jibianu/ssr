import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AffiliateService, AffiliateDashboardResponse, AffiliateProfileResponse, AffiliateGenerateLinkResponse, AffiliateSnapshotResponse } from '../affiliate.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';
import { first } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-affiliate-dashboard',
  templateUrl: './affiliate-dashboard.component.html',
  styleUrls: ['./affiliate-dashboard.component.scss'],
  standalone: false
})
export class AffiliateDashboardComponent implements OnInit, OnDestroy {
  dashboard: AffiliateDashboardResponse | null = null;
  loading = true;
  copySuccess = false;
  completePhone = '';
  completeLinkedIn = '';
  completeReason = '';
  completeSubmitting = false;
  completeSuccess = false;
  /** Course-specific link: list of courses for dropdown */
  coursesForLinks: { id: string; title: string }[] = [];
  loadingCourses = false;
  selectedCourseId = '';
  courseLink = '';
  loadingCourseLink = false;
  copyCourseLinkSuccess = false;
  profile: AffiliateProfileResponse | null = null;
  loadingProfile = false;
  /** Impact-style: snapshot period filter */
  snapshotPeriod: 'all' | '7d' | '30d' = 'all';
  /** Impact-style: which KPI is "active" for chart emphasis */
  activeKpi: 'clicks' | 'actions' | 'payouts' | 'sale' | 'conv' | 'epc' = 'clicks';
  /** Snapshot metrics for the selected period. */
  snapshot: AffiliateSnapshotResponse | null = null;
  loadingSnapshot = false;
  /** Placeholder messages (no backend yet) */
  messages: { title: string; date: string }[] = [];
  /** SEO-friendly generate-link response (courseSlug?ref=code) */
  generateLinkResponse: AffiliateGenerateLinkResponse | null = null;

  constructor(
    private affiliateService: AffiliateService,
    private sharedService: SharedService,
    private router: Router,
    private toaster: ToasterService
  ) {}

  private errorMessage(err: any, fallback: string): string {
    return (
      err?.error?.message ??
      err?.error?.Message ??
      (Array.isArray(err?.error?.Messages) ? err.error.Messages[0] : null) ??
      err?.message ??
      fallback
    );
  }

  /** Normalize affiliate links so that in dev they point to localhost:4200, and in prod use the real domain. */
  private normalizeLink(link: string | null | undefined): string {
    if (!link) {
      return '';
    }
    if (!environment.production) {
      try {
        const url = new URL(link);
        // Rebuild URL with current origin (e.g. http://localhost:4200)
        return `${window.location.origin}${url.pathname}${url.search}${url.hash}`;
      } catch {
        return link;
      }
    }
    return link;
  }

  ngOnInit(): void {
    this.sharedService.certificateName.next('Affiliate Dashboard');
    this.loadDashboard();
    this.loadCoursesForLinks();
    this.loadSnapshot();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }

  loadDashboard(): void {
    this.affiliateService.getDashboard().pipe(first()).subscribe({
      next: (data) => {
        // Normalize referral link for current environment (localhost vs production)
        if (data?.referralLink) {
          data.referralLink = this.normalizeLink(data.referralLink);
        }
        this.dashboard = data;
        this.loading = false;
        this.completePhone = data?.phone ?? '';
        this.completeLinkedIn = data?.linkedInProfile ?? '';
        this.completeReason = data?.reason ?? '';
        if (data?.status !== 'None' && data?.profileCompleted === false) {
          this.router.navigate(['/app/affiliate/onboarding']);
        } else if (data?.status !== 'None') {
          this.loadProfile();
        }
      },
      error: (err) => {
        this.loading = false;
        this.toaster.showError(this.errorMessage(err, 'Failed to load dashboard.'));
      }
    });
  }

  loadSnapshot(): void {
    this.loadingSnapshot = true;
    this.affiliateService.getSnapshot(this.snapshotPeriod).pipe(first()).subscribe({
      next: (data) => {
        this.snapshot = data;
        this.loadingSnapshot = false;
      },
      error: (err) => {
        this.loadingSnapshot = false;
        this.toaster.showError(this.errorMessage(err, 'Failed to load snapshot.'));
      }
    });
  }

  copyReferralLink(): void {
    if (!this.dashboard?.referralLink) return;
    navigator.clipboard.writeText(this.dashboard.referralLink).then(() => {
      this.copySuccess = true;
      setTimeout(() => (this.copySuccess = false), 2000);
    });
  }

  loadProfile(): void {
    this.loadingProfile = true;
    this.affiliateService.getProfile().pipe(first()).subscribe({
      next: (data) => {
        this.profile = data;
        this.loadingProfile = false;
      },
      error: (err) => {
        this.loadingProfile = false;
        this.toaster.showError(this.errorMessage(err, 'Failed to load profile.'));
      }
    });
  }

  loadCoursesForLinks(): void {
    this.loadingCourses = true;
    this.affiliateService.getCoursesForLinks().pipe(first()).subscribe({
      next: (list) => {
        this.coursesForLinks = list ?? [];
        this.loadingCourses = false;
      },
      error: (err) => {
        this.loadingCourses = false;
        this.toaster.showError(this.errorMessage(err, 'Failed to load courses.'));
      }
    });
  }

  onCourseSelect(): void {
    this.courseLink = '';
    this.generateLinkResponse = null;
    if (!this.selectedCourseId?.trim()) return;
    this.loadingCourseLink = true;
    this.affiliateService.getGenerateLink(this.selectedCourseId).pipe(first()).subscribe({
      next: (res) => {
        this.generateLinkResponse = res;
        const raw = res?.affiliateLink ?? '';
        this.courseLink = this.normalizeLink(raw);
        this.loadingCourseLink = false;
      },
      error: () => {
        this.loadingCourseLink = false;
        this.toaster.showError('Could not generate link. Ensure you are an approved affiliate and the course exists.');
      }
    });
  }

  copyCourseLink(): void {
    if (!this.courseLink) return;
    navigator.clipboard.writeText(this.courseLink).then(() => {
      this.copyCourseLinkSuccess = true;
      setTimeout(() => (this.copyCourseLinkSuccess = false), 2000);
    });
  }

  saveCompleteApplication(): void {
    if (!this.dashboard) return;
    const linkedIn = (this.completeLinkedIn ?? '').trim();
    this.completeSubmitting = true;
    this.completeSuccess = false;
    this.affiliateService.updateApplication(this.completePhone, linkedIn || '', this.completeReason).pipe(first()).subscribe({
      next: () => {
        this.completeSubmitting = false;
        this.completeSuccess = true;
        this.toaster.showSuccess('Saved successfully. You are under review. After Oilandgasclub approve you can promote the course. You can contact support.');
        this.loadDashboard();
        setTimeout(() => (this.completeSuccess = false), 3000);
      },
      error: (err) => {
        this.completeSubmitting = false;
        this.toaster.showError(this.errorMessage(err, 'Failed to save. Please check inputs and try again.'));
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
  }

  /** Commission rate (%) from dashboard (admin can update); fallback 10. */
  get commissionRate(): number {
    const r = this.dashboard?.commissionRate;
    return r != null && r >= 0 ? r : 10;
  }

  /** Selected course title for Create a link context. */
  get selectedCourseName(): string {
    if (!this.selectedCourseId) return '';
    const c = this.coursesForLinks.find((x) => x.id === this.selectedCourseId);
    return c?.title ?? '';
  }

  /** Conversion rate (signups / clicks * 100). */
  get conversionRate(): string {
    const clicks = this.snapshot?.clicks ?? this.dashboard?.totalClicks ?? 0;
    const actions = this.snapshot?.actions ?? this.dashboard?.totalSignups ?? 0;
    if (!clicks) return '0';
    const pct = (actions / clicks) * 100;
    return pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  }

  /** Earnings per click. */
  get epc(): number {
    const clicks = this.snapshot?.clicks ?? this.dashboard?.totalClicks ?? 0;
    if (!clicks) return 0;
    const total = this.snapshot?.earnings ?? ((this.dashboard?.pendingEarnings ?? 0) + (this.dashboard?.paidEarnings ?? 0));
    return total / clicks;
  }

  /** Snapshot chart: show bars when we have data. */
  get hasChartData(): boolean {
    const clicks = this.snapshot?.clicks ?? this.dashboard?.totalClicks ?? 0;
    const actions = this.snapshot?.actions ?? this.dashboard?.totalSignups ?? 0;
    const purchases = this.dashboard?.totalPurchases ?? 0;
    return clicks > 0 || actions > 0 || purchases > 0;
  }

  get snapshotBars(): { label: string; pct: number }[] {
    const clicks = this.snapshot?.clicks ?? this.dashboard?.totalClicks ?? 0;
    const actions = this.snapshot?.actions ?? this.dashboard?.totalSignups ?? 0;
    const purchases = this.dashboard?.totalPurchases ?? 0;
    const max = Math.max(clicks, actions, purchases, 1);
    return [
      { label: 'Clicks', pct: (clicks / max) * 100 },
      { label: 'Signups', pct: (actions / max) * 100 },
      { label: 'Purchases', pct: (purchases / max) * 100 }
    ];
  }

  onSnapshotPeriodChange(): void {
    this.loadSnapshot();
  }

  /** Link to show in Create a link: course-specific or default. */
  get displayLink(): string {
    if (this.courseLink) return this.courseLink;
    if (this.selectedCourseId) return '';
    return this.dashboard?.referralLink ?? '';
  }

  copyDisplayLink(): void {
    const link = this.courseLink || this.dashboard?.referralLink;
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => {
      if (this.courseLink) {
        this.copyCourseLinkSuccess = true;
        setTimeout(() => (this.copyCourseLinkSuccess = false), 2000);
      } else {
        this.copySuccess = true;
        setTimeout(() => (this.copySuccess = false), 2000);
      }
      this.toaster.showSuccess('Link copied to clipboard.');
    });
  }
}
