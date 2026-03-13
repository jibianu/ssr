import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
  AdminAnalyticsApiService,
  AdminAnalyticsOverview,
  AdminAnalyticsTimeSeriesPoint,
  AdminAnalyticsTopSellingCourse,
  AdminAnalyticsTopDropOffLesson,
  AdminAnalyticsCourseSummary,
} from '../admin-analytics-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

Chart.register(...registerables);

export type DateRangePreset = 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('revenueChartCanvas') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersChartCanvas') ordersChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('dauChartCanvas') dauChartRef!: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last30';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';
  courseId = '';
  courses: AdminAnalyticsCourseSummary[] = [];

  loadingOverview = true;
  loadingTopSelling = true;
  loadingTopDropOff = true;
  overview: AdminAnalyticsOverview | null = null;
  topSelling: AdminAnalyticsTopSellingCourse[] = [];
  topDropOff: AdminAnalyticsTopDropOffLesson[] = [];

  private sub = new Subscription();
  private revenueChart: Chart | null = null;
  private ordersChart: Chart | null = null;
  private dauChart: Chart | null = null;

  kpiCards: Array<{ key: string; label: string; value: number | string; format?: string; icon: string; iconClass: string }> = [];

  constructor(
    private api: AdminAnalyticsApiService,
    private cdr: ChangeDetectorRef,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.setDateRangeFromPreset('last30');
    this.loadCourses();
    this.loadAll();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderChartsAfterData(), 0);
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.destroyCharts();
  }

  setDateRangeFromPreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const now = new Date();
    let from: Date;
    const to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    switch (preset) {
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
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
    }
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.cdr.markForCheck();
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

  onCourseFilterChange(): void {
    this.loadAll();
  }

  get rangeSubtitle(): string {
    if (this.dateRangePreset === 'last7') return 'Last 7 days';
    if (this.dateRangePreset === 'last30') return 'Last 30 days';
    if (this.dateRangePreset === 'thisMonth') return 'This month';
    return this.fromDate && this.toDate ? `${this.fromDate} – ${this.toDate}` : 'Selected range';
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadCourses(): void {
    this.sub.add(
      this.api.getCourses(this.fromDate || this.formatDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)), this.toDate || this.formatDate(new Date())).subscribe({
        next: (list) => {
          this.courses = list;
          this.cdr.markForCheck();
        },
        error: () => {},
      })
    );
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadOverview();
    this.loadTopSelling();
    this.loadTopDropOff();
  }

  private loadOverview(): void {
    this.loadingOverview = true;
    this.cdr.markForCheck();
    this.sub.add(
      this.api.getOverview(this.fromDate, this.toDate, this.courseId || undefined).subscribe({
        next: (res) => {
          this.overview = res ?? null;
          this.updateKpiCards();
          this.loadingOverview = false;
          this.cdr.markForCheck();
          setTimeout(() => this.renderChartsAfterData(), 0);
        },
        error: () => {
          this.overview = null;
          this.loadingOverview = false;
          this.toaster.showError('Failed to load analytics overview.');
          this.cdr.markForCheck();
        },
      })
    );
  }

  private updateKpiCards(): void {
    const o = this.overview;
    if (!o) {
      this.kpiCards = [];
      return;
    }
    this.kpiCards = [
      { key: 'revenue', label: 'Revenue (30d)', value: o.totalRevenue, format: 'currency', icon: 'fa fa-dollar', iconClass: 'dashboard__card-icon--revenue' },
      { key: 'orders', label: 'Orders (30d)', value: o.totalOrders, icon: 'fa fa-shopping-cart', iconClass: 'dashboard__card-icon--purchases' },
      { key: 'newUsers', label: 'New users', value: o.newUsers, icon: 'fa fa-user-plus', iconClass: 'dashboard__card-icon--registrations' },
      { key: 'dau', label: 'DAU', value: o.dau, icon: 'fa fa-users', iconClass: 'dashboard__card-icon--dau' },
      { key: 'mau', label: 'MAU', value: o.mau, icon: 'fa fa-users', iconClass: 'dashboard__card-icon--mau' },
      { key: 'conversion', label: 'Conversion %', value: o.conversionRateSignupToPurchase.toFixed(1) + '%', icon: 'fa fa-percent', iconClass: 'dashboard__card-icon--conversion' },
      { key: 'enrollments', label: 'Course enrollments', value: o.courseEnrollments, icon: 'fa fa-book', iconClass: 'dashboard__card-icon--enrollments' },
      { key: 'completion', label: 'Completion rate %', value: o.courseCompletionRate.toFixed(1) + '%', icon: 'fa fa-check-circle', iconClass: 'dashboard__card-icon--completion' },
      { key: 'avgSession', label: 'Avg session (sec)', value: Math.round(o.avgSessionDurationSeconds), icon: 'fa fa-clock', iconClass: 'dashboard__card-icon--session' },
      { key: 'failedPayments', label: 'Failed payments', value: o.failedPaymentsCount, icon: 'fa fa-times-circle', iconClass: 'dashboard__card-icon--danger' },
      { key: 'refundRate', label: 'Refund rate %', value: o.refundRatePercent.toFixed(1) + '%', icon: 'fa fa-undo', iconClass: 'dashboard__card-icon--refund' },
    ];
  }

  private loadTopSelling(): void {
    this.loadingTopSelling = true;
    this.cdr.markForCheck();
    this.sub.add(
      this.api.getTopSellingCourses(this.fromDate, this.toDate, 10, this.courseId || undefined).subscribe({
        next: (list) => {
          this.topSelling = list;
          this.loadingTopSelling = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.topSelling = [];
          this.loadingTopSelling = false;
          this.cdr.markForCheck();
        },
      })
    );
  }

  private loadTopDropOff(): void {
    this.loadingTopDropOff = true;
    this.cdr.markForCheck();
    this.sub.add(
      this.api.getTopDropOffLessons(this.fromDate, this.toDate, 10, this.courseId || undefined).subscribe({
        next: (list) => {
          this.topDropOff = list;
          this.loadingTopDropOff = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.topDropOff = [];
          this.loadingTopDropOff = false;
          this.cdr.markForCheck();
        },
      })
    );
  }

  private renderRevenueChart(): void {
    const data = this.overview?.dailyRevenueSeries ?? [];
    if (!this.revenueChartRef?.nativeElement) return;
    this.destroyRevenueChart();
    if (!data.length) return;
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Revenue', data: values, borderColor: 'rgb(139, 92, 246)', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.3 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    };
    this.revenueChart = new Chart(this.revenueChartRef.nativeElement, config);
  }

  private renderOrdersChart(): void {
    const data = this.overview?.dailyOrdersSeries ?? [];
    if (!this.ordersChartRef?.nativeElement) return;
    this.destroyOrdersChart();
    if (!data.length) return;
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Orders', data: values, borderColor: 'rgb(245, 119, 34)', backgroundColor: 'rgba(245, 119, 34, 0.1)', fill: true, tension: 0.3 },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    };
    this.ordersChart = new Chart(this.ordersChartRef.nativeElement, config);
  }

  private renderDauChart(): void {
    const data = this.overview?.dailyActiveUsersSeries ?? [];
    if (!this.dauChartRef?.nativeElement) return;
    this.destroyDauChart();
    if (!data.length) return;
    const labels = data.map((d) => d.label);
    const values = data.map((d) => d.value);
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Active users', data: values, backgroundColor: 'rgba(20, 127, 160, 0.8)' }],
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } },
    };
    this.dauChart = new Chart(this.dauChartRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    if (this.overview && !this.loadingOverview) {
      this.renderRevenueChart();
      this.renderOrdersChart();
      this.renderDauChart();
    }
  }

  private destroyCharts(): void {
    this.destroyRevenueChart();
    this.destroyOrdersChart();
    this.destroyDauChart();
  }

  private destroyRevenueChart(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
  }

  private destroyOrdersChart(): void {
    if (this.ordersChart) {
      this.ordersChart.destroy();
      this.ordersChart = null;
    }
  }

  private destroyDauChart(): void {
    if (this.dauChart) {
      this.dauChart.destroy();
      this.dauChart = null;
    }
  }
}
