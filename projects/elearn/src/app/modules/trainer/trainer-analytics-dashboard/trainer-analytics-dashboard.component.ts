import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedService } from 'src/app/shared/service/shared-service.service';
import {
  TrainerDashboardApiService,
  TrainerDashboardSummary,
  TrainerDashboardPurchasesChart,
  TrainerDashboardCourseActivityChart,
  TrainerDashboardActivityRow,
} from '../trainer-dashboard-api.service';
import { PayoutApiService } from '../../../services/payout-api.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

export interface TrainerQuickLink {
  label: string;
  route: string;
  icon: string;
}

export type DateRangePreset = 'today' | 'last7' | 'last30' | 'thisMonth' | 'allTime' | 'custom';

@Component({
  selector: 'app-trainer-analytics-dashboard',
  templateUrl: './trainer-analytics-dashboard.component.html',
  styleUrls: ['./trainer-analytics-dashboard.component.scss'],
  standalone: false,
})
export class TrainerAnalyticsDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('purchasesChartCanvas') purchasesChartRef: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChartCanvas') activityChartRef: ElementRef<HTMLCanvasElement>;

  dateRangePreset: DateRangePreset = 'last7';
  fromDate: string;
  toDate: string;
  customFrom: string;
  customTo: string;

  loadingSummary = true;
  loadingPurchasesChart = true;
  loadingActivityChart = true;
  loadingTable = true;
  summary: TrainerDashboardSummary | null = null;
  purchasesChartData: TrainerDashboardPurchasesChart | null = null;
  courseActivityChartData: TrainerDashboardCourseActivityChart | null = null;
  activityRows: TrainerDashboardActivityRow[] = [];
  activityTotalCount = 0;
  activityPage = 1;
  activityPageSize = 10;
  activitySearch = '';
  activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  payoutMethodsCount = 0;
  payoutPendingCount = 0;
  payoutLoading = false;

  /** Content permissions (Course, Event, Blog) for "Request content access" section. */
  contentPermissions: string[] = [];
  contentPermissionsLoading = false;
  requestLoading: Record<string, boolean> = {};

  private sub = new Subscription();
  private purchasesChart: Chart | null = null;
  private activityChart: Chart | null = null;

  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  readonly quickLinks: TrainerQuickLink[] = [
    { label: 'My Courses', route: '/app/trainer/courses', icon: 'fa-th-list' },
    { label: 'Assigned course', route: '/app/trainer/course/list', icon: 'fa-book' },
    { label: 'Earnings', route: '/app/trainer/earnings', icon: 'fa-wallet' },
    { label: 'Payout & Tax', route: '/app/trainer/payout', icon: 'fa-money-check-alt' },
    { label: 'Profile', route: '/app/trainer/profile', icon: 'fa-user-circle' },
  ];

  constructor(
    private api: TrainerDashboardApiService,
    private sharedService: SharedService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private payoutApi: PayoutApiService,
    private appService: AdminAppService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Trainer Dashboard');
    this.sharedService.showTrainerDashboardToolbar.next(false);
    this.setDateRangeFromPreset('last7');
    this.loadAll();
    this.loadPayoutStatus();
    this.loadContentPermissions();
  }

  loadContentPermissions(): void {
    this.contentPermissionsLoading = true;
    this.sub.add(
      this.appService.getMyContentPermissions().subscribe({
        next: (list) => {
          this.contentPermissions = (list || []).map((s) => s.trim().toLowerCase());
          this.contentPermissionsLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.contentPermissionsLoading = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  hasContentPermission(type: string): boolean {
    return this.contentPermissions.includes(type.toLowerCase());
  }

  requestContentAccess(type: string): void {
    if (this.requestLoading[type]) return;
    this.requestLoading = { ...this.requestLoading, [type]: true };
    this.cdr.detectChanges();
    this.appService.requestContentPermission(type).subscribe({
      next: (res) => {
        this.requestLoading = { ...this.requestLoading, [type]: false };
        this.toaster.showSuccess(res?.message || 'Request submitted.');
        this.loadContentPermissions();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.requestLoading = { ...this.requestLoading, [type]: false };
        const msg = err?.error?.message ?? err?.message ?? 'Request failed.';
        this.toaster.showError(msg);
        this.cdr.detectChanges();
      },
    });
  }

  loadPayoutStatus(): void {
    this.payoutLoading = true;
    this.sub.add(
      this.payoutApi.getTrainerPayouts().subscribe({
        next: (list) => {
          this.payoutMethodsCount = list?.length ?? 0;
          this.payoutPendingCount = list?.filter((m) => m.status === 0).length ?? 0;
          this.payoutLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.payoutLoading = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  goTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  ngAfterViewInit(): void {
    this.renderChartsAfterData();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sharedService.showTrainerDashboardToolbar.next(false);
    this.sub.unsubscribe();
    if (this.activitySearchDebounce) clearTimeout(this.activitySearchDebounce);
    this.destroyCharts();
  }

  setDateRangeFromPreset(preset: DateRangePreset): void {
    this.dateRangePreset = preset;
    const now = new Date();
    let from: Date;
    let to: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

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
      case 'allTime':
        from = new Date(2000, 0, 1, 0, 0, 0);
        break;
      case 'custom':
        this.customFrom = this.fromDate ?? this.formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
        this.customTo = this.toDate ?? this.formatDateForInput(now);
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
    if (this.dateRangePreset === 'allTime') return 'All time';
    return this.fromDate && this.toDate ? `${this.fromDate} – ${this.toDate}` : 'Selected range';
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDateForInput(d: Date): string {
    return this.formatDate(d);
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadSummary();
    this.loadPurchasesChart();
    this.loadCourseActivityChart();
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
          this.purchasesChartData = res;
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

  private loadCourseActivityChart(): void {
    this.loadingActivityChart = true;
    this.destroyActivityChart();
    this.sub.add(
      this.api.getCourseActivityChart(this.fromDate, this.toDate).subscribe({
        next: (res) => {
          this.courseActivityChartData = res;
          this.loadingActivityChart = false;
          this.cdr.detectChanges();
          this.renderActivityChart();
        },
        error: () => {
          this.loadingActivityChart = false;
          this.cdr.detectChanges();
        },
      })
    );
  }

  loadActivityTable(): void {
    this.loadingTable = true;
    this.sub.add(
      this.api
        .getActivityTable(
          this.fromDate,
          this.toDate,
          this.activityPage,
          this.activityPageSize,
          this.activitySearch
        )
        .subscribe({
          next: (res) => {
            this.activityRows = res.results ?? [];
            this.activityTotalCount = res.totalCount ?? 0;
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
    if (!this.purchasesChartRef?.nativeElement || !this.purchasesChartData?.data?.length) return;
    this.destroyPurchasesChart();
    const labels = this.purchasesChartData.data.map((d) => d.label);
    const values = this.purchasesChartData.data.map((d) => d.value);
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
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };
    this.purchasesChart = new Chart(this.purchasesChartRef.nativeElement, config);
  }

  private renderActivityChart(): void {
    if (!this.activityChartRef?.nativeElement || !this.courseActivityChartData) return;
    this.destroyActivityChart();
    const created = this.courseActivityChartData.created ?? [];
    const edited = this.courseActivityChartData.edited ?? [];
    const allLabels = [...new Set([...created.map((c) => c.label), ...edited.map((e) => e.label)])].sort();
    const createdMap = new Map(created.map((c) => [c.label, c.value]));
    const editedMap = new Map(edited.map((e) => [e.label, e.value]));
    const createdValues = allLabels.map((l) => createdMap.get(l) ?? 0);
    const editedValues = allLabels.map((l) => editedMap.get(l) ?? 0);
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: allLabels,
        datasets: [
          { label: 'Created', data: createdValues, backgroundColor: 'rgba(245, 119, 34, 0.8)' },
          { label: 'Edited', data: editedValues, backgroundColor: 'rgba(20, 127, 160, 0.8)' },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { stacked: false },
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
        },
      },
    };
    this.activityChart = new Chart(this.activityChartRef.nativeElement, config);
  }

  private renderChartsAfterData(): void {
    this.cdr.detectChanges();
    if (this.purchasesChartData && !this.loadingPurchasesChart) this.renderPurchasesChart();
    if (this.courseActivityChartData && !this.loadingActivityChart) this.renderActivityChart();
  }

  private destroyCharts(): void {
    this.destroyPurchasesChart();
    this.destroyActivityChart();
  }

  private destroyPurchasesChart(): void {
    if (this.purchasesChart) {
      this.purchasesChart.destroy();
      this.purchasesChart = null;
    }
  }

  private destroyActivityChart(): void {
    if (this.activityChart) {
      this.activityChart.destroy();
      this.activityChart = null;
    }
  }

  trackByActivityId(index: number, row: TrainerDashboardActivityRow): string {
    return `${row.courseId}-${row.actionType}-${row.dateUtc}-${index}`;
  }
}
