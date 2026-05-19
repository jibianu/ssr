import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AdminBillingApiService,
  AdminBillingOverview,
  AdminTenantRow,
  BillingInvoiceRow,
  LicenseChangeRequestRow,
  mapAdminOverview,
  mapTenant
} from './admin-billing-api.service';
import { CompanyPricingModalComponent } from './company-pricing-modal.component';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { getApiBaseUrl } from 'src/app/core/helpers/api-base-url.helper';
import { TimeoutError } from 'rxjs';
import { BILLING_PAYMENT_STATUS_PAID, isBillingPaid } from './billing-payment-status';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-billing-dashboard',
  standalone: true,
  imports: [CommonModule, CompanyPricingModalComponent],
  templateUrl: './admin-billing-dashboard.component.html',
  styleUrls: ['./admin-billing-dashboard.component.scss']
})
export class AdminBillingDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('utilChartCanvas') utilChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  error = '';
  data: AdminBillingOverview | null = null;
  modalOpen = false;
  selectedTenant: AdminTenantRow | null = null;
  invoiceModalOpen = false;
  invoiceRows: BillingInvoiceRow[] = [];
  invoiceLoading = false;
  reviewingRequestId: string | null = null;

  private utilChart: Chart | null = null;

  constructor(private api: AdminBillingApiService) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.utilChart?.destroy();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getDashboard().pipe(
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: (res) => {
        try {
          this.data = mapAdminOverview(res);
          setTimeout(() => this.renderCharts(), 100);
        } catch (e) {
          this.data = null;
          this.error = this.formatLoadError(e);
        }
      },
      error: (err: unknown) => {
        this.data = null;
        this.error = this.formatLoadError(err);
      }
    });
  }

  private formatLoadError(err: unknown): string {
    const api = getApiBaseUrl();

    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Session expired or invalid. Please log in again.';
      }
      if (err.status === 403) {
        return 'You do not have permission to view platform billing.';
      }
      if (err.status === 408) {
        return String(err.error?.message ?? 'Billing request timed out. Check the API console and refresh.');
      }
      if (err.status === 0) {
        return `Cannot reach the API at ${api}. Start Elearn.Serverless (http://localhost:52288) and refresh.`;
      }
      if (err.status === 404 && String(err.url ?? '').toLowerCase().includes('account/login')) {
        return `Billing API returned 404 (wrong server or URL). Expected ${api}api/admin/billing — rebuild with ng build elearn --configuration unified-local and npm run dev:ssr.`;
      }
      const msgs = err.error?.messages ?? err.error?.Messages;
      if (Array.isArray(msgs) && msgs.length > 0) {
        return String(msgs[0]);
      }
      const msg = err.error?.message ?? err.error?.Message;
      if (msg) {
        return String(msg);
      }
      if (typeof err.error === 'string' && err.error.trim()) {
        return err.error.trim().slice(0, 300);
      }
      if (err.status === 500) {
        return 'Server error while loading billing. Check the API console for details.';
      }
      return `Could not load billing data (HTTP ${err.status}). Confirm the API is running at ${api}.`;
    }

    if (err instanceof TimeoutError) {
      return `Billing request timed out. Confirm the API is running at ${api}.`;
    }

    if (err instanceof Error && err.message) {
      return err.message;
    }

    return `Could not load billing data. Confirm the API is running at ${api}.`;
  }

  openPricing(t: AdminTenantRow): void {
    this.selectedTenant = { ...t };
    this.modalOpen = true;
  }

  onPricingSaved(row: any): void {
    const mapped = mapTenant(row);
    if (this.data) {
      const idx = this.data.tenants.findIndex(x => x.companyAdminUserId === mapped.companyAdminUserId);
      if (idx >= 0) {
        this.data.tenants[idx] = mapped;
        this.data.tenants = [...this.data.tenants];
      }
      this.recalcSummary();
      setTimeout(() => this.renderCharts(), 50);
    }
  }

  viewInvoices(t: AdminTenantRow): void {
    this.selectedTenant = t;
    this.invoiceModalOpen = true;
    this.invoiceLoading = true;
    this.invoiceRows = [];
    this.api.getInvoices(t.companyAdminUserId).subscribe({
      next: (rows) => {
        this.invoiceRows = (rows as any[]).map(r => ({
          id: r.id ?? r.Id,
          invoiceNumber: r.invoiceNumber ?? r.InvoiceNumber,
          billingPeriodStart: r.billingPeriodStart ?? r.BillingPeriodStart,
          billingPeriodEnd: r.billingPeriodEnd ?? r.BillingPeriodEnd,
          subtotal: Number(r.subtotal ?? r.Subtotal ?? 0),
          taxAmount: Number(r.taxAmount ?? r.TaxAmount ?? 0),
          totalAmount: Number(r.totalAmount ?? r.TotalAmount ?? 0),
          paymentStatus: r.paymentStatus ?? r.PaymentStatus,
          paidOn: r.paidOn ?? r.PaidOn,
          dueDate: r.dueDate ?? r.DueDate
        }));
        this.invoiceLoading = false;
      },
      error: () => { this.invoiceLoading = false; }
    });
  }

  renew(t: AdminTenantRow): void {
    if (!confirm(`Renew subscription for ${t.companyName} for 1 year?`)) return;
    this.api.renew(t.companyAdminUserId, 1).subscribe({
      next: (row) => this.patchTenant(row),
      error: () => alert('Renewal failed.')
    });
  }

  approveLicenseRequest(req: LicenseChangeRequestRow): void {
    if (!confirm(`Approve license change for ${req.companyName}?`)) return;
    this.reviewLicenseRequest(req, true);
  }

  rejectLicenseRequest(req: LicenseChangeRequestRow): void {
    const notes = prompt('Rejection reason (optional):') ?? '';
    if (notes === null) return;
    this.reviewLicenseRequest(req, false, notes);
  }

  private reviewLicenseRequest(req: LicenseChangeRequestRow, approve: boolean, notes?: string): void {
    this.reviewingRequestId = req.id;
    this.api.reviewLicenseChangeRequest(req.id, approve, notes).subscribe({
      next: () => {
        this.reviewingRequestId = null;
        this.load();
      },
      error: (err) => {
        this.reviewingRequestId = null;
        alert(err?.error?.message || 'Could not review request.');
      }
    });
  }

  suspend(t: AdminTenantRow): void {
    const suspend = !t.isSuspended;
    const msg = suspend ? `Suspend ${t.companyName}?` : `Reactivate ${t.companyName}?`;
    if (!confirm(msg)) return;
    this.api.suspend(t.companyAdminUserId, suspend).subscribe({
      next: (row) => this.patchTenant(row),
      error: () => alert('Could not update subscription status.')
    });
  }

  isPaid(t: AdminTenantRow): boolean {
    return isBillingPaid(t.paymentStatusId, t.paymentStatus);
  }

  markPaid(t: AdminTenantRow): void {
    if (!t.hasSubscription || this.isPaid(t)) return;
    if (!confirm(`Mark ${t.companyName} as paid?`)) return;
    this.api.updateCompany(t.companyAdminUserId, { paymentStatus: BILLING_PAYMENT_STATUS_PAID }).subscribe({
      next: (row) => this.patchTenant(row),
      error: () => alert('Could not update payment status.')
    });
  }

  private patchTenant(row: any): void {
    const mapped = mapTenant(row);
    if (!this.data) return;
    const idx = this.data.tenants.findIndex(x => x.companyAdminUserId === mapped.companyAdminUserId);
    if (idx >= 0) {
      this.data.tenants[idx] = mapped;
      this.data.tenants = [...this.data.tenants];
      this.recalcSummary();
    }
  }

  private recalcSummary(): void {
    if (!this.data) return;
    const active = this.data.tenants.filter(t => t.hasSubscription && !t.isSuspended);
    this.data.totalArr = active.reduce((s, t) => s + t.annualAmount, 0);
    this.data.monthlyRecurringRevenue = Math.round(this.data.totalArr / 12);
    this.data.activeCompanies = active.length;
    this.data.totalSeatsSold = active.reduce((s, t) => s + t.employeeSeats + t.trainerSeats, 0);
  }

  private renderCharts(): void {
    const points = this.data?.analytics?.seatUtilizationByCompany ?? [];
    if (!this.utilChartRef?.nativeElement || !points.length) return;
    this.utilChart?.destroy();
    const cfg: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: points.map(p => p.label),
        datasets: [{
          label: 'Seat utilization %',
          data: points.map(p => p.value),
          backgroundColor: '#f57722'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    };
    this.utilChart = new Chart(this.utilChartRef.nativeElement, cfg);
  }

  statusClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return 'badge--success';
    if (s === 'failed' || s === 'overdue') return 'badge--danger';
    if (s === 'pending') return 'badge--warn';
    return 'badge--muted';
  }

  formatInr(v: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v ?? 0);
  }
}
