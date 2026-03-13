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
  ManagementDashboardApiService,
  ManagementDashboardSummary,
  ManagementDashboardChartPoint,
  ManagementDashboardActivityRow,
} from '../management-dashboard-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-management-dashboard',
  templateUrl: './management-dashboard.component.html',
  styleUrls: ['./management-dashboard.component.scss'],
  standalone: false,
})
export class ManagementDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('purchasesChartCanvas') purchasesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('registrationsChartCanvas') registrationsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activeTrainersChartCanvas') activeTrainersChartRef!: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';

  loadingSummary = true;
  loadingPurchasesChart = true;
  loadingRegistrationsChart = true;
  loadingActiveTrainersChart = true;
  loadingTable = true;
  summary: ManagementDashboardSummary | null = null;
  purchasesChartData: ManagementDashboardChartPoint[] = [];
  registrationsChartData: ManagementDashboardChartPoint[] = [];
  activeTrainersChartData: ManagementDashboardChartPoint[] = [];
  activityRows: ManagementDashboardActivityRow[] = [];
  activityTotalCount = 0;
  activityPage = 1;
  activityPageSize = 10;
  activitySearch = '';
  activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  private sub = new Subscription();
  private purchasesChart: Chart | null = null;
  private registrationsChart: Chart | null = null;
  private activeTrainersChart: Chart | null = null;

  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  constructor(
    private api: ManagementDashboardApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.setDateRangeFromPreset('last7');
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

  /** Total new registrations (students) in the selected date range (sum of registrations chart data). */
  get newRegistrationsInRange(): number {
    return (this.registrationsChartData || []).reduce((acc, d) => acc + (d.value ?? 0), 0);
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadSummary();
    this.loadPurchasesChart();
    this.loadRegistrationsChart();
    this.loadActiveTrainersChart();
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

  private loadPurchasesChart(): void {
    this.loadingPurchasesChart = true;
    this.destroyPurchasesChart();
    this.sub.add(
      this.api.getPurchasesChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.purchasesChartData = res.data || [];
          this.loadingPurchasesChart = false;
          this.cdr.detectChanges();
          this.renderPurchasesChart();
        },
        error: () => {
          this.loadingPurchasesChart = false;
          this.cdr.detectChanges();
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
          this.cdr.detectChanges();
          this.renderRegistrationsChart();
        },
        error: () => {
          this.registrationsChartData = [];
          this.loadingRegistrationsChart = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  private loadActiveTrainersChart(): void {
    this.loadingActiveTrainersChart = true;
    this.destroyActiveTrainersChart();
    this.sub.add(
      this.api.getActiveTrainersChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.activeTrainersChartData = res.data || [];
          this.loadingActiveTrainersChart = false;
          this.cdr.detectChanges();
          this.renderActiveTrainersChart();
        },
        error: () => {
          this.loadingActiveTrainersChart = false;
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
        datasets: [{ label: 'Registrations', data: values, backgroundColor: 'rgba(20, 127, 160, 0.8)' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    this.registrationsChart = new Chart(this.registrationsChartRef.nativeElement, config);
  }

  private renderActiveTrainersChart(): void {
    if (!this.activeTrainersChartRef?.nativeElement || !this.activeTrainersChartData?.length) return;
    this.destroyActiveTrainersChart();
    const labels = this.activeTrainersChartData.map((d) => d.label);
    const values = this.activeTrainersChartData.map((d) => d.value);
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Purchases', data: values, backgroundColor: 'rgba(20, 127, 160, 0.8)' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    this.activeTrainersChart = new Chart(this.activeTrainersChartRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    this.cdr.detectChanges();
    if (this.purchasesChartData?.length && !this.loadingPurchasesChart) this.renderPurchasesChart();
    if (this.registrationsChartData?.length && !this.loadingRegistrationsChart) this.renderRegistrationsChart();
    if (this.activeTrainersChartData?.length && !this.loadingActiveTrainersChart) this.renderActiveTrainersChart();
  }

  private destroyCharts(): void {
    this.destroyPurchasesChart();
    this.destroyRegistrationsChart();
    this.destroyActiveTrainersChart();
  }

  private destroyRegistrationsChart(): void {
    if (this.registrationsChart) {
      this.registrationsChart.destroy();
      this.registrationsChart = null;
    }
  }

  private destroyPurchasesChart(): void {
    if (this.purchasesChart) {
      this.purchasesChart.destroy();
      this.purchasesChart = null;
    }
  }

  private destroyActiveTrainersChart(): void {
    if (this.activeTrainersChart) {
      this.activeTrainersChart.destroy();
      this.activeTrainersChart = null;
    }
  }

  trackByActivity(index: number, row: ManagementDashboardActivityRow): string {
    return `${row.actionType}-${row.entityName}-${row.dateUtc}-${index}`;
  }
}
