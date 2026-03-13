import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AdminAnalyticsApiService,
  AdminAnalyticsStudentSummary,
  AdminAnalyticsStudentFilterParams,
  AdminAnalyticsCourseSummary,
} from '../admin-analytics-api.service';

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

const ACTIVITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'Online', label: 'Online' },
  { value: 'ActiveToday', label: 'Active today' },
  { value: 'Last7Days', label: 'Last 7 days' },
  { value: 'Last30Days', label: 'Last 30 days' },
  { value: 'Inactive7Plus', label: 'Inactive 7+ days' },
  { value: 'Inactive30Plus', label: 'Inactive 30+ days' },
];

const PROGRESS_BUCKET_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: '0', label: '0%' },
  { value: '1-10', label: '1–10%' },
  { value: '10-40', label: '10–40%' },
  { value: '40-80', label: '40–80%' },
  { value: '80-99', label: '80–99%' },
  { value: '100', label: '100%' },
];

const FUNNEL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'Purchased', label: 'Purchased' },
  { value: 'Opened', label: 'Opened' },
  { value: 'Started', label: 'Started' },
  { value: 'Progress25', label: '25%' },
  { value: 'Progress50', label: '50%' },
  { value: 'Progress75', label: '75%' },
  { value: 'Completed', label: 'Completed' },
];

const PURCHASE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'HasPurchase', label: 'Has purchase' },
  { value: 'NoPurchase', label: 'No purchase' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'LastSeen', label: 'Last seen' },
  { value: 'TotalTime', label: 'Total time' },
  { value: 'SessionsCount', label: 'Sessions count' },
  { value: 'Email', label: 'Email' },
  { value: 'Name', label: 'Name' },
];

@Component({
  selector: 'app-analytics-students-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './analytics-students-list.component.html',
  styleUrls: ['./analytics-students-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsStudentsListComponent implements OnInit {
  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';
  loading = true;
  students: AdminAnalyticsStudentSummary[] = [];
  courses: AdminAnalyticsCourseSummary[] = [];

  // Advanced filters
  filtersExpanded = false;
  search = '';
  activityStatus = '';
  totalTimeMinMinutes: number | null = null;
  totalTimeMaxMinutes: number | null = null;
  avgSessionMinMinutes: number | null = null;
  avgSessionMaxMinutes: number | null = null;
  sessionsCountMin: number | null = null;
  sessionsCountMax: number | null = null;
  purchaseStatus = '';
  purchaseFrom = '';
  purchaseTo = '';
  registeredFrom = '';
  registeredTo = '';
  repeatBuyer: boolean | null = null;
  totalSpentMin: number | null = null;
  totalSpentMax: number | null = null;
  progressBucket = '';
  courseIdFilter = '';
  quizAttemptsMin: number | null = null;
  quizAttemptsMax: number | null = null;
  quizScoreMin: number | null = null;
  quizScoreMax: number | null = null;
  funnelStage = '';
  funnelCourseId = '';
  sortBy = 'LastSeen';
  sortDesc = true;
  page = 1;
  pageSize = 20;
  totalCount = 0;
  pageSizeOptions = [10, 20, 50, 100];

  readonly activityOptions = ACTIVITY_OPTIONS;
  readonly progressBucketOptions = PROGRESS_BUCKET_OPTIONS;
  readonly funnelOptions = FUNNEL_OPTIONS;
  readonly purchaseStatusOptions = PURCHASE_STATUS_OPTIONS;
  readonly sortOptions = SORT_OPTIONS;

  constructor(
    private api: AdminAnalyticsApiService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParams;
    const from = qp['from'] as string | undefined;
    const to = qp['to'] as string | undefined;
    if (from && to) {
      this.fromDate = from;
      this.toDate = to;
      this.customFrom = from;
      this.customTo = to;
      this.dateRangePreset = 'custom';
    } else {
      this.setDateRangeFromPreset('last7');
    }
    // Pre-fill purchase filter when coming from Total Purchases card (particular users who purchased)
    const purchaseStatus = qp['purchaseStatus'] as string | undefined;
    const purchaseFrom = qp['purchaseFrom'] as string | undefined;
    const purchaseTo = qp['purchaseTo'] as string | undefined;
    if (purchaseStatus) this.purchaseStatus = purchaseStatus;
    if (purchaseFrom) this.purchaseFrom = purchaseFrom;
    if (purchaseTo) this.purchaseTo = purchaseTo;
    if (purchaseStatus || purchaseFrom || purchaseTo) this.filtersExpanded = true;
    // Pre-fill registration filter when coming from New Registrations card (particular users who registered)
    const registeredFrom = qp['registeredFrom'] as string | undefined;
    const registeredTo = qp['registeredTo'] as string | undefined;
    if (registeredFrom) this.registeredFrom = registeredFrom;
    if (registeredTo) this.registeredTo = registeredTo;
    if (registeredFrom || registeredTo) this.filtersExpanded = true;
    this.load();
    this.loadCourses();
  }

  loadCourses(): void {
    if (!this.fromDate || !this.toDate) return;
    this.api.getCourses(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.courses = list;
        this.cdr.markForCheck();
      },
    });
  }

  setDateRangeFromPreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const now = new Date();
    let from: Date;
    const to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case 'last7':
        from = new Date(now);
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        break;
      case 'last30':
        from = new Date(now);
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        break;
      case 'custom':
        this.customFrom = this.fromDate || this.formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        this.customTo = this.toDate || this.formatDate(now);
        this.fromDate = this.customFrom;
        this.toDate = this.customTo;
        this.cdr.markForCheck();
        return;
      default:
        from = new Date(now);
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
    }
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.cdr.markForCheck();
  }

  onPresetChange(preset: DateRangePreset): void {
    this.setDateRangeFromPreset(preset);
    if (preset !== 'custom') {
      this.loadCourses();
      this.load();
    }
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) return;
    this.fromDate = this.customFrom;
    this.toDate = this.customTo;
    this.dateRangePreset = 'custom';
    this.loadCourses();
    this.load();
  }

  hasActiveFilters(): boolean {
    return (
      (this.search ?? '').trim() !== '' ||
      (this.activityStatus ?? '') !== '' ||
      this.totalTimeMinMinutes != null ||
      this.totalTimeMaxMinutes != null ||
      this.avgSessionMinMinutes != null ||
      this.avgSessionMaxMinutes != null ||
      this.sessionsCountMin != null ||
      this.sessionsCountMax != null ||
      (this.purchaseStatus ?? '') !== '' ||
      (this.purchaseFrom ?? '') !== '' ||
      (this.purchaseTo ?? '') !== '' ||
      (this.registeredFrom ?? '') !== '' ||
      (this.registeredTo ?? '') !== '' ||
      this.repeatBuyer != null ||
      this.totalSpentMin != null ||
      this.totalSpentMax != null ||
      (this.progressBucket ?? '') !== '' ||
      (this.courseIdFilter ?? '') !== '' ||
      this.quizAttemptsMin != null ||
      this.quizAttemptsMax != null ||
      this.quizScoreMin != null ||
      this.quizScoreMax != null ||
      ((this.funnelStage ?? '') !== '' && (this.funnelCourseId ?? '') !== '')
    );
  }

  buildFilterParams(): AdminAnalyticsStudentFilterParams {
    const p: AdminAnalyticsStudentFilterParams = {
      from: this.fromDate,
      to: this.toDate,
      search: (this.search ?? '').trim() || undefined,
      activityStatus: (this.activityStatus ?? '') || undefined,
      totalTimeMinSeconds: this.totalTimeMinMinutes != null ? this.totalTimeMinMinutes * 60 : undefined,
      totalTimeMaxSeconds: this.totalTimeMaxMinutes != null ? this.totalTimeMaxMinutes * 60 : undefined,
      avgSessionDurationMinSeconds: this.avgSessionMinMinutes != null ? this.avgSessionMinMinutes * 60 : undefined,
      avgSessionDurationMaxSeconds: this.avgSessionMaxMinutes != null ? this.avgSessionMaxMinutes * 60 : undefined,
      sessionsCountMin: this.sessionsCountMin ?? undefined,
      sessionsCountMax: this.sessionsCountMax ?? undefined,
      purchaseStatus: (this.purchaseStatus ?? '') || undefined,
      purchaseFrom: (this.purchaseFrom ?? '') || undefined,
      purchaseTo: (this.purchaseTo ?? '') || undefined,
      registeredFrom: (this.registeredFrom ?? '') || undefined,
      registeredTo: (this.registeredTo ?? '') || undefined,
      repeatBuyer: this.repeatBuyer ?? undefined,
      totalSpentMin: this.totalSpentMin ?? undefined,
      totalSpentMax: this.totalSpentMax ?? undefined,
      progressBucket: (this.progressBucket ?? '') || undefined,
      courseIdFilter: (this.courseIdFilter ?? '') || undefined,
      quizAttemptsMin: this.quizAttemptsMin ?? undefined,
      quizAttemptsMax: this.quizAttemptsMax ?? undefined,
      quizScoreMin: this.quizScoreMin ?? undefined,
      quizScoreMax: this.quizScoreMax ?? undefined,
      funnelStage: (this.funnelStage ?? '') || undefined,
      funnelCourseId: (this.funnelCourseId ?? '') || undefined,
      sortBy: this.sortBy ?? 'LastSeen',
      sortDesc: this.sortDesc,
      page: this.page,
      pageSize: this.pageSize,
    };
    return p;
  }

  load(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loading = true;
    this.cdr.markForCheck();
    const params = this.buildFilterParams();
    this.api.getStudentsFiltered(params).subscribe({
      next: (res) => {
        this.students = res.results;
        this.totalCount = res.totalCount;
        this.page = res.page;
        this.pageSize = res.pageSize;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.students = [];
        this.totalCount = 0;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  clearFilters(): void {
    this.search = '';
    this.activityStatus = '';
    this.totalTimeMinMinutes = null;
    this.totalTimeMaxMinutes = null;
    this.avgSessionMinMinutes = null;
    this.avgSessionMaxMinutes = null;
    this.sessionsCountMin = null;
    this.sessionsCountMax = null;
    this.purchaseStatus = '';
    this.purchaseFrom = '';
    this.purchaseTo = '';
    this.registeredFrom = '';
    this.registeredTo = '';
    this.repeatBuyer = null;
    this.totalSpentMin = null;
    this.totalSpentMax = null;
    this.progressBucket = '';
    this.courseIdFilter = '';
    this.quizAttemptsMin = null;
    this.quizAttemptsMax = null;
    this.quizScoreMin = null;
    this.quizScoreMax = null;
    this.funnelStage = '';
    this.funnelCourseId = '';
    this.page = 1;
    this.cdr.markForCheck();
    this.load();
  }

  onSortChange(): void {
    this.page = 1;
    this.load();
  }

  onPageSizeChange(): void {
    this.page = 1;
    this.load();
  }

  goToPage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.page = newPage;
    this.load();
  }

  totalPages(): number {
    if (this.pageSize <= 0) return 0;
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  startRow(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  endRow(): number {
    return this.totalCount === 0 ? 0 : Math.min(this.page * this.pageSize, this.totalCount);
  }

  goToStudent(id: string): void {
    this.router.navigate(['/app/admin/analytics/student', id], {
      queryParams: { from: this.fromDate, to: this.toDate },
    });
  }

  trackByUserId(_: number, row: AdminAnalyticsStudentSummary): string {
    return row?.userId ?? '';
  }

  formatDuration(seconds: number): string {
    if (seconds < 60) return seconds + 's';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return m + 'm ' + s + 's';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + 'h ' + mm + 'm';
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
}
