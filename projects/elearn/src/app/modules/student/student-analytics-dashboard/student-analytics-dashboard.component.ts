import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  StudentDashboardApiService,
  StudentDashboardSummary,
  StudentDashboardChartPoint,
  StudentDashboardCompletedVsPending,
  StudentDashboardActivityRow,
} from '../student-dashboard-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonPaginationComponent } from '../../../shared/component/common-pagination/common-pagination.component';
import { StudentBreadcrumbService } from '../../../core/services/student-breadcrumb.service';
import { StudentSessionService, StudentSessionAnalyticsResponse } from '../../../core/services/student-session.service';

Chart.register(...registerables);

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-student-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CommonPaginationComponent],
  templateUrl: './student-analytics-dashboard.component.html',
  styleUrls: ['./student-analytics-dashboard.component.scss'],
})
export class StudentAnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('progressChartCanvas') progressChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('completedVsPendingCanvas') completedVsPendingRef!: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';

  loadingSummary = true;
  loadingProgressChart = true;
  loadingCompletedVsPending = true;
  loadingTable = true;
  summary: StudentDashboardSummary | null = null;
  progressChartData: StudentDashboardChartPoint[] = [];
  completedVsPending: StudentDashboardCompletedVsPending | null = null;
  activityRows: StudentDashboardActivityRow[] = [];
  activityTotalCount = 0;
  activityPage = 1;
  activityPageSize = 10;
  activitySearch = '';
  activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  sessionAnalytics: StudentSessionAnalyticsResponse | null = null;
  loadingSessionAnalytics = true;

  myEvents: any[] = [];
  loadingMyEvents = true;

  private sub = new Subscription();
  private progressChart: Chart | null = null;
  private completedVsPendingChart: Chart | null = null;

  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  constructor(
    private api: StudentDashboardApiService,
    private cdr: ChangeDetectorRef,
    private studentBreadcrumb: StudentBreadcrumbService,
    private studentSessionService: StudentSessionService
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Dashboard' }]);
    this.setDateRangeFromPreset('last7');
    this.loadAll();
    this.loadSessionAnalytics();
    this.loadMyEvents();
  }

  private loadMyEvents(): void {
    this.loadingMyEvents = true;
    this.sub.add(
      this.api.getMyEvents().subscribe({
        next: (list) => {
          this.myEvents = list ?? [];
          this.loadingMyEvents = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.myEvents = [];
          this.loadingMyEvents = false;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private loadSessionAnalytics(): void {
    this.loadingSessionAnalytics = true;
    this.sub.add(
      this.studentSessionService.getAnalytics().subscribe((res) => {
        this.sessionAnalytics = res ?? null;
        this.loadingSessionAnalytics = false;
        this.cdr.markForCheck();
      })
    );
  }

  /** Format total seconds as "Xh Ym" or "Xm" or "Xs". */
  formatTimeInApp(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
  }

  ngAfterViewInit(): void {
    this.renderChartsAfterData();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    if (this.activitySearchDebounce) clearTimeout(this.activitySearchDebounce);
    this.destroyCharts();
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
        this.cdr.detectChanges();
        return;
      default:
        from = new Date(now);
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
    }
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.cdr.detectChanges();
  }

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) return;
    this.fromDate = this.customFrom;
    this.toDate = this.customTo;
    this.dateRangePreset = 'custom';
    this.loadAll();
  }

  onPresetChange(preset: DateRangePreset): void {
    this.setDateRangeFromPreset(preset);
    if (preset !== 'custom') this.loadAll();
  }

  get rangeSubtitle(): string {
    if (this.dateRangePreset === 'today') return 'Today';
    if (this.dateRangePreset === 'last7') return 'Last 7 days';
    if (this.dateRangePreset === 'last30') return 'Last 30 days';
    if (this.dateRangePreset === 'thisMonth') return 'This month';
    return this.fromDate && this.toDate ? `${this.fromDate} – ${this.toDate}` : 'Selected range';
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadSummary();
    this.loadProgressChart();
    this.loadCompletedVsPending();
    this.loadActivityTable();
  }

  private loadSummary(): void {
    this.loadingSummary = true;
    this.sub.add(
      this.api.getSummary(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.summary = res;
          this.loadingSummary = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadingSummary = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  private loadProgressChart(): void {
    this.loadingProgressChart = true;
    this.destroyProgressChart();
    this.sub.add(
      this.api.getProgressChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.progressChartData = res.data || [];
          this.loadingProgressChart = false;
          this.cdr.detectChanges();
          this.renderProgressChart();
        },
        error: () => {
          this.loadingProgressChart = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  private loadCompletedVsPending(): void {
    this.loadingCompletedVsPending = true;
    this.destroyCompletedVsPendingChart();
    this.sub.add(
      this.api.getCompletedVsPending().subscribe({
        next: (res) => {
          this.completedVsPending = res;
          this.loadingCompletedVsPending = false;
          this.cdr.detectChanges();
          this.renderCompletedVsPendingChart();
        },
        error: () => {
          this.loadingCompletedVsPending = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  loadActivityTable(): void {
    this.loadingTable = true;
    this.sub.add(
      this.api
        .getActivityTable(this.fromDate, this.toDate, this.activityPage, this.activityPageSize, this.activitySearch)
        .subscribe({
          next: (res) => {
            this.activityRows = res.results || [];
            this.activityTotalCount = res.totalCount || 0;
            this.loadingTable = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loadingTable = false;
            this.cdr.detectChanges();
          },
        })
    );
  }

  onActivitySearchInput(): void {
    if (this.activitySearchDebounce) clearTimeout(this.activitySearchDebounce);
    this.activitySearchDebounce = setTimeout(() => {
      this.activityPage = 1;
      this.loadActivityTable();
    }, 350);
  }

  onActivityPageChange(page: number): void {
    this.activityPage = page;
    this.loadActivityTable();
  }

  onActivityPageSizeChange(size: number): void {
    this.activityPageSize = size;
    this.activityPage = 1;
    this.loadActivityTable();
  }

  private renderProgressChart(): void {
    if (!this.progressChartRef?.nativeElement || !this.progressChartData?.length) return;
    this.destroyProgressChart();
    const labels = this.progressChartData.map((d) => d.label);
    const values = this.progressChartData.map((d) => d.value);
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed',
            data: values,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    this.progressChart = new Chart(this.progressChartRef.nativeElement, config);
  }

  private renderCompletedVsPendingChart(): void {
    if (!this.completedVsPendingRef?.nativeElement || !this.completedVsPending) return;
    this.destroyCompletedVsPendingChart();
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'Pending'],
        datasets: [
          {
            data: [this.completedVsPending.completed, this.completedVsPending.pending],
            backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(107, 114, 128, 0.8)'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
    this.completedVsPendingChart = new Chart(this.completedVsPendingRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    this.cdr.detectChanges();
    if (this.progressChartData?.length && !this.loadingProgressChart) this.renderProgressChart();
    if (this.completedVsPending && !this.loadingCompletedVsPending) this.renderCompletedVsPendingChart();
  }

  private destroyCharts(): void {
    this.destroyProgressChart();
    this.destroyCompletedVsPendingChart();
  }

  private destroyProgressChart(): void {
    if (this.progressChart) {
      this.progressChart.destroy();
      this.progressChart = null;
    }
  }

  private destroyCompletedVsPendingChart(): void {
    if (this.completedVsPendingChart) {
      this.completedVsPendingChart.destroy();
      this.completedVsPendingChart = null;
    }
  }

  trackByEventId(_index: number, ev: { id?: string; canonicalUrl?: string }): string {
    return ev?.id ?? ev?.canonicalUrl ?? '';
  }

  trackByActivity(index: number, row: StudentDashboardActivityRow): string {
    return `${row.activityType}-${row.courseName}-${row.dateUtc}-${index}`;
  }
}
