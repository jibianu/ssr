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
  CompanyDashboardApiService,
  CompanyDashboardSummary,
  CompanyDashboardChartPoint,
  CompanyDashboardTrainersChart,
  CompanyDashboardActivityRow,
} from '../company-dashboard-api.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonPaginationComponent } from '../../../shared/component/common-pagination/common-pagination.component';

Chart.register(...registerables);

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'custom';

@Component({
  selector: 'app-company-analytics-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, CommonPaginationComponent],
  templateUrl: './company-analytics-dashboard.component.html',
  styleUrls: ['./company-analytics-dashboard.component.scss'],
})
export class CompanyAnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('purchasesChartCanvas') purchasesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('trainersChartCanvas') trainersChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topCoursesChartCanvas') topCoursesChartRef!: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last7';
  fromDate = '';
  toDate = '';
  customFrom = '';
  customTo = '';

  loadingSummary = true;
  loadingPurchasesChart = true;
  loadingTrainersChart = true;
  loadingTopCoursesChart = true;
  loadingTable = true;
  summary: CompanyDashboardSummary | null = null;
  purchasesChartData: CompanyDashboardChartPoint[] = [];
  trainersChart: CompanyDashboardTrainersChart | null = null;
  topCoursesChartData: CompanyDashboardChartPoint[] = [];
  activityRows: CompanyDashboardActivityRow[] = [];
  activityTotalCount = 0;
  activityPage = 1;
  activityPageSize = 10;
  activitySearch = '';
  activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  private sub = new Subscription();
  private purchasesChart: Chart | null = null;
  private trainersChartInstance: Chart | null = null;
  private topCoursesChart: Chart | null = null;

  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];

  constructor(
    private api: CompanyDashboardApiService,
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

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadSummary();
    this.loadPurchasesChart();
    this.loadTrainersChart();
    this.loadTopCoursesChart();
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

  private loadTrainersChart(): void {
    this.loadingTrainersChart = true;
    this.destroyTrainersChart();
    this.sub.add(
      this.api.getTrainersChart().subscribe({
        next: (res) => {
          this.trainersChart = res;
          this.loadingTrainersChart = false;
          this.cdr.detectChanges();
          this.renderTrainersChart();
        },
        error: () => {
          this.loadingTrainersChart = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  private loadTopCoursesChart(): void {
    this.loadingTopCoursesChart = true;
    this.destroyTopCoursesChart();
    this.sub.add(
      this.api.getTopCoursesChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.topCoursesChartData = res.data || [];
          this.loadingTopCoursesChart = false;
          this.cdr.detectChanges();
          this.renderTopCoursesChart();
        },
        error: () => {
          this.loadingTopCoursesChart = false;
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

  private renderTrainersChart(): void {
    if (!this.trainersChartRef?.nativeElement || !this.trainersChart) return;
    this.destroyTrainersChart();
    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Active', 'Inactive'],
        datasets: [
          {
            data: [this.trainersChart.activeTrainers, this.trainersChart.inactiveTrainers],
            backgroundColor: ['rgba(34, 197, 94, 0.8)', 'rgba(107, 114, 128, 0.8)'],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    };
    this.trainersChartInstance = new Chart(this.trainersChartRef.nativeElement, config);
  }

  private renderTopCoursesChart(): void {
    if (!this.topCoursesChartRef?.nativeElement || !this.topCoursesChartData?.length) return;
    this.destroyTopCoursesChart();
    const labels = this.topCoursesChartData.map((d) => d.label?.length > 20 ? d.label.slice(0, 20) + '…' : d.label);
    const values = this.topCoursesChartData.map((d) => d.value);
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Purchases', data: values, backgroundColor: 'rgba(20, 127, 160, 0.8)' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
      },
    };
    this.topCoursesChart = new Chart(this.topCoursesChartRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    this.cdr.detectChanges();
    if (this.purchasesChartData?.length && !this.loadingPurchasesChart) this.renderPurchasesChart();
    if (this.trainersChart && !this.loadingTrainersChart) this.renderTrainersChart();
    if (this.topCoursesChartData?.length && !this.loadingTopCoursesChart) this.renderTopCoursesChart();
  }

  private destroyCharts(): void {
    this.destroyPurchasesChart();
    this.destroyTrainersChart();
    this.destroyTopCoursesChart();
  }

  private destroyPurchasesChart(): void {
    if (this.purchasesChart) {
      this.purchasesChart.destroy();
      this.purchasesChart = null;
    }
  }

  private destroyTrainersChart(): void {
    if (this.trainersChartInstance) {
      this.trainersChartInstance.destroy();
      this.trainersChartInstance = null;
    }
  }

  private destroyTopCoursesChart(): void {
    if (this.topCoursesChart) {
      this.topCoursesChart.destroy();
      this.topCoursesChart = null;
    }
  }

  trackByActivity(index: number, row: CompanyDashboardActivityRow): string {
    return `${row.courseName}-${row.actionType}-${row.dateUtc}-${index}`;
  }
}
