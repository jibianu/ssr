import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  AdminDashboardApiService,
  AdminDashboardSummary,
  AdminDashboardChartPoint,
  AdminDashboardRevenuePoint,
  AdminDashboardActivityRow,
} from './admin-dashboard-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CommonPaginationComponent } from '../../../shared/component/common-pagination/common-pagination.component';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';
import { NgxSpinnerService } from 'ngx-spinner';

Chart.register(...registerables);

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CommonPaginationComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('purchasesChartCanvas') purchasesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('registrationsChartCanvas') registrationsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChartCanvas') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';

  loadingSummary = true;
  loadingPurchasesChart = true;
  loadingRegistrationsChart = true;
  loadingRevenueChart = true;
  loadingTable = true;
  summary: AdminDashboardSummary | null = null;
  purchasesChartData: AdminDashboardChartPoint[] = [];
  registrationsChartData: AdminDashboardChartPoint[] = [];
  revenueChartData: AdminDashboardRevenuePoint[] = [];
  activityRows: AdminDashboardActivityRow[] = [];
  activityTotalCount = 0;
  activityPage = 1;
  activityPageSize = 10;
  activitySearch = '';
  activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  private sub = new Subscription();
  private purchasesChart: Chart | null = null;
  private registrationsChart: Chart | null = null;
  private revenueChart: Chart | null = null;

  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  private readonly defaultSummary: AdminDashboardSummary = {
    totalCompaniesRegistered: 0,
    totalTrainers: 0,
    totalStudents: 0,
    totalPurchases: 0,
    totalRevenue: 0,
  };

  /** Cached KPI cards (set when summary loads) to avoid getter running every change detection. */
  kpiCards: Array<{ key: string; label: string; value: number; format?: string; icon: string; iconClass: string; allTime: boolean; link?: string; queryParams?: Record<string, string> }> = [];

  constructor(
    private api: AdminDashboardApiService,
    private cdr: ChangeDetectorRef,
    private toaster: ToasterService,
    private spinner: NgxSpinnerService
  ) {}

  ngOnInit(): void {
    this.spinner.hide(); // clear any overlay from previous page so buttons are clickable
    this.setDateRangeFromPreset('last7');
    this.updateKpiCards(this.summary ?? this.defaultSummary);
    this.loadAll();
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

  applyCustomRange(): void {
    if (!this.customFrom || !this.customTo) return;
    this.fromDate = this.customFrom;
    this.toDate = this.customTo;
    this.dateRangePreset = 'custom';
    this.loadAll();
  }

  onPresetChange(preset: DateRangePreset): void {
    this.setDateRangeFromPreset(preset);
    this.cdr.detectChanges(); // ensure button active state updates immediately
    if (preset !== 'custom') this.loadAll();
  }

  get rangeSubtitle(): string {
    if (this.dateRangePreset === 'today') return 'Today';
    if (this.dateRangePreset === 'last7') return 'Last 7 days';
    if (this.dateRangePreset === 'last30') return 'Last 30 days';
    if (this.dateRangePreset === 'thisMonth') return 'This month';
    return this.fromDate && this.toDate ? `${this.fromDate} – ${this.toDate}` : 'Selected range';
  }

  /** Total new user registrations in the selected date range (sum of registrations chart data). */
  get newRegistrationsInRange(): number {
    return (this.registrationsChartData || []).reduce((acc, d) => acc + (d.value ?? 0), 0);
  }

  /** Query params for New Registrations card link – filter Student Analytics to users who registered in this range. */
  get newRegistrationsQueryParams(): Record<string, string> | null {
    if (!this.fromDate || !this.toDate) return null;
    return {
      from: this.fromDate,
      to: this.toDate,
      registeredFrom: this.fromDate,
      registeredTo: this.toDate,
    };
  }

  private readonly appAdmin = '/app/admin';

  private updateKpiCards(s: AdminDashboardSummary): void {
    this.kpiCards = [
      { key: 'companies', label: 'Total Companies Registered', value: s.totalCompaniesRegistered, icon: 'fa fa-building', iconClass: 'dashboard__card-icon--created', allTime: true, link: `${this.appAdmin}/companies` },
      { key: 'trainers', label: 'Total Trainers', value: s.totalTrainers, icon: 'fa fa-chalkboard-teacher', iconClass: 'dashboard__card-icon--edited', allTime: true, link: `${this.appAdmin}/trainers` },
      { key: 'students', label: 'Total Students', value: s.totalStudents, icon: 'fa fa-users', iconClass: 'dashboard__card-icon--purchases', allTime: true, link: `${this.appAdmin}/analytics` },
      { key: 'purchases', label: 'Total Purchases', value: s.totalPurchases, icon: 'fa fa-shopping-cart', iconClass: 'dashboard__card-icon--purchases', allTime: false, link: `${this.appAdmin}/analytics`, queryParams: this.fromDate && this.toDate ? { from: this.fromDate, to: this.toDate, purchaseStatus: 'HasPurchase', purchaseFrom: this.fromDate, purchaseTo: this.toDate } : undefined },
      { key: 'revenue', label: 'Total Revenue', value: s.totalRevenue, format: 'currency', icon: 'fa fa-dollar', iconClass: 'dashboard__card-icon--revenue', allTime: false },
    ];
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    // Load summary first so KPIs show quickly; then load charts and table
    this.loadSummaryThenRest();
  }

  /** Load summary first, then charts and activity table (so user sees KPIs within 1–2s). */
  private loadSummaryThenRest(): void {
    this.loadingSummary = true;
    this.sub.add(
      this.api.getSummary(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.summary = res;
          this.updateKpiCards(res);
          this.loadingSummary = false;
          this.cdr.markForCheck();
          this.loadChartsAndTable();
        },
        error: () => {
          this.summary = { ...this.defaultSummary };
          this.updateKpiCards(this.defaultSummary);
          this.loadingSummary = false;
          this.cdr.markForCheck();
          this.toaster.showError('Failed to load dashboard. Check that the API is running and you are logged in as Admin.');
          this.loadChartsAndTable();
        },
      })
    );
  }

  private loadChartsAndTable(): void {
    this.loadPurchasesChart();
    this.loadRegistrationsChart();
    this.loadRevenueChart();
    this.loadActivityTable();
  }

  private loadPurchasesChart(): void {
    this.loadingPurchasesChart = true;
    this.destroyPurchasesChart();
    this.sub.add(
      this.api.getPurchasesChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.purchasesChartData = res.data || [];
          this.loadingPurchasesChart = false;
          this.cdr.markForCheck();
          setTimeout(() => this.renderPurchasesChart(), 0);
        },
        error: () => {
          this.purchasesChartData = [];
          this.loadingPurchasesChart = false;
          this.destroyPurchasesChart();
          this.cdr.markForCheck();
        },
      })
    );
  }

  private loadRegistrationsChart(): void {
    this.loadingRegistrationsChart = true;
    this.destroyRegistrationsChart();
    this.sub.add(
      this.api.getRegistrationsChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.registrationsChartData = res.data || [];
          this.loadingRegistrationsChart = false;
          this.cdr.markForCheck();
          setTimeout(() => this.renderRegistrationsChart(), 0);
        },
        error: () => {
          this.registrationsChartData = [];
          this.loadingRegistrationsChart = false;
          this.destroyRegistrationsChart();
          this.cdr.markForCheck();
        },
      })
    );
  }

  private loadRevenueChart(): void {
    this.loadingRevenueChart = true;
    this.destroyRevenueChart();
    this.sub.add(
      this.api.getRevenueChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.revenueChartData = res.data || [];
          this.loadingRevenueChart = false;
          this.cdr.markForCheck();
          setTimeout(() => this.renderRevenueChart(), 0);
        },
        error: () => {
          this.revenueChartData = [];
          this.loadingRevenueChart = false;
          this.destroyRevenueChart();
          this.cdr.markForCheck();
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
            this.cdr.markForCheck();
          },
          error: () => {
            this.activityRows = [];
            this.activityTotalCount = 0;
            this.loadingTable = false;
            this.cdr.markForCheck();
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

  private renderPurchasesChart(): void {
    if (!this.purchasesChartRef?.nativeElement || !this.purchasesChartData?.length) return;
    this.destroyPurchasesChart();
    const labels = this.purchasesChartData.map((d) => d.label);
    const values = this.purchasesChartData.map((d) => d.value);
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Purchases',
            data: values,
            borderColor: 'rgb(245, 119, 34)',
            backgroundColor: 'rgba(245, 119, 34, 0.1)',
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
    this.purchasesChart = new Chart(this.purchasesChartRef.nativeElement, config);
  }

  private renderRegistrationsChart(): void {
    if (!this.registrationsChartRef?.nativeElement || !this.registrationsChartData?.length) return;
    this.destroyRegistrationsChart();
    const labels = this.registrationsChartData.map((d) => d.label);
    const values = this.registrationsChartData.map((d) => d.value);
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Registrations', data: values, backgroundColor: 'rgba(20, 127, 160, 0.8)' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    this.registrationsChart = new Chart(this.registrationsChartRef.nativeElement, config);
  }

  private renderRevenueChart(): void {
    if (!this.revenueChartRef?.nativeElement || !this.revenueChartData?.length) return;
    this.destroyRevenueChart();
    const labels = this.revenueChartData.map((d) => d.label);
    const values = this.revenueChartData.map((d) => d.value);
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: values,
            borderColor: 'rgb(139, 92, 246)',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    };
    this.revenueChart = new Chart(this.revenueChartRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    this.cdr.markForCheck();
    setTimeout(() => {
      if (this.purchasesChartData?.length && !this.loadingPurchasesChart) this.renderPurchasesChart();
      if (this.registrationsChartData?.length && !this.loadingRegistrationsChart) this.renderRegistrationsChart();
      if (this.revenueChartData?.length && !this.loadingRevenueChart) this.renderRevenueChart();
    }, 0);
  }

  private destroyCharts(): void {
    this.destroyPurchasesChart();
    this.destroyRegistrationsChart();
    this.destroyRevenueChart();
  }

  private destroyPurchasesChart(): void {
    if (this.purchasesChart) {
      this.purchasesChart.destroy();
      this.purchasesChart = null;
    }
  }

  private destroyRegistrationsChart(): void {
    if (this.registrationsChart) {
      this.registrationsChart.destroy();
      this.registrationsChart = null;
    }
  }

  private destroyRevenueChart(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
  }

  trackByActivity(index: number, row: AdminDashboardActivityRow): string {
    return `${row.actionType}-${row.entityName}-${row.dateUtc}-${index}`;
  }
}
