import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PayoutApiService,
  AdminPayoutListItemDto,
  AdminPayoutStatsDto,
  PayoutReportItemDto,
  PAYOUT_STATUS,
} from '../../../services/payout-api.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';

@Component({
  selector: 'app-admin-trainer-payouts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-trainer-payouts.component.html',
  styleUrls: ['./admin-trainer-payouts.component.scss'],
})
export class AdminTrainerPayoutsComponent implements OnInit {
  list: AdminPayoutListItemDto[] = [];
  stats: AdminPayoutStatsDto | null = null;
  loading = false;
  loadingStats = false;
  error = '';
  actionId: string | null = null;
  showProcessModal = false;
  processItem: AdminPayoutListItemDto | null = null;
  processAmount: number | null = null;
  processCurrency = 'INR';
  processTdsPercent: number | null = null;
  processNotes = '';
  processError = '';
  processing = false;

  reportFrom = '';
  reportTo = '';
  reportList: PayoutReportItemDto[] = [];
  reportLoading = false;
  reportError = '';

  recentPayouts: PayoutReportItemDto[] = [];
  recentLoading = false;

  constructor(
    private payoutApi: PayoutApiService,
    private sharedService: SharedService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Trainer Payouts');
    this.loadStats();
    this.load();
    this.loadRecentPayouts();
    const now = new Date();
    this.reportFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    this.reportTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.payoutApi.getAdminPayouts().subscribe({
      next: (data) => {
        this.list = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load payouts.';
        this.list = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadStats(): void {
    this.loadingStats = true;
    this.payoutApi.getAdminPayoutStats().subscribe({
      next: (data) => {
        this.stats = data;
        this.loadingStats = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.stats = null;
        this.loadingStats = false;
        this.cdr.detectChanges();
      },
    });
  }

  approve(id: string): void {
    if (this.actionId) return;
    this.actionId = id;
    this.payoutApi.approvePayout(id).subscribe({
      next: () => {
        this.actionId = null;
        this.toaster.showSuccess('Payout approved.');
        this.load();
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.actionId = null;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to approve.');
        this.cdr.detectChanges();
      },
    });
  }

  reject(id: string): void {
    if (this.actionId) return;
    this.actionId = id;
    this.payoutApi.rejectPayout(id).subscribe({
      next: () => {
        this.actionId = null;
        this.toaster.showSuccess('Payout rejected.');
        this.load();
        this.loadStats();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.actionId = null;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to reject.');
        this.cdr.detectChanges();
      },
    });
  }

  isPending(item: AdminPayoutListItemDto): boolean {
    return item.status === PAYOUT_STATUS.Pending;
  }

  isApproved(item: AdminPayoutListItemDto): boolean {
    return item.status === PAYOUT_STATUS.Approved;
  }

  openProcessModal(item: AdminPayoutListItemDto): void {
    this.processItem = item;
    this.processAmount = null;
    this.processCurrency = 'INR';
    this.processTdsPercent = null;
    this.processNotes = '';
    this.processError = '';
    this.showProcessModal = true;
    this.cdr.detectChanges();
  }

  closeProcessModal(): void {
    this.showProcessModal = false;
    this.processItem = null;
    this.processAmount = null;
    this.processError = '';
    this.cdr.detectChanges();
  }

  submitProcess(): void {
    if (!this.processItem) return;
    this.processError = '';
    const amount = this.processAmount != null ? Number(this.processAmount) : 0;
    if (amount <= 0) {
      this.processError = 'Enter a valid amount greater than 0.';
      this.cdr.detectChanges();
      return;
    }
    const tdsPercent = this.processTdsPercent != null && this.processTdsPercent >= 0 ? this.processTdsPercent : undefined;
    this.processing = true;
    this.payoutApi.processPayout(this.processItem.id, amount, this.processCurrency, this.processNotes, tdsPercent).subscribe({
      next: (res) => {
        this.processing = false;
        this.closeProcessModal();
        this.toaster.showSuccess(res?.message || 'Payout recorded.');
        this.loadRecentPayouts();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.processing = false;
        this.processError = err?.error?.message || err?.message || 'Failed to record payout.';
        this.cdr.detectChanges();
      },
    });
  }

  loadRecentPayouts(): void {
    this.recentLoading = true;
    this.payoutApi.getRecentPayouts(20).subscribe({
      next: (data) => {
        this.recentPayouts = data || [];
        this.recentLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.recentPayouts = [];
        this.recentLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadReport(): void {
    if (!this.reportFrom || !this.reportTo) return;
    this.reportLoading = true;
    this.reportError = '';
    this.payoutApi.getPayoutReport(this.reportFrom, this.reportTo).subscribe({
      next: (data) => {
        this.reportList = data || [];
        this.reportLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.reportError = err?.error?.message || err?.message || 'Failed to load report.';
        this.reportList = [];
        this.reportLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportReportCsv(): void {
    if (!this.reportFrom || !this.reportTo) return;
    this.payoutApi.getPayoutReportCsv(this.reportFrom, this.reportTo).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payout-report-${this.reportFrom}-to-${this.reportTo}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.toaster.showSuccess('CSV downloaded.');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to export CSV.');
        this.cdr.detectChanges();
      },
    });
  }

  trackById(_index: number, item: AdminPayoutListItemDto): string {
    return item.id;
  }

  trackByTransactionId(_index: number, item: PayoutReportItemDto): string {
    return item.transactionId;
  }

  get reportSummary(): { totalGross: number; totalTds: number; totalNet: number } {
    const list = this.reportList || [];
    let totalGross = 0;
    let totalTds = 0;
    let totalNet = 0;
    list.forEach((r) => {
      totalGross += r.grossAmount ?? 0;
      totalTds += r.tdsAmount ?? 0;
      totalNet += r.netAmount ?? r.grossAmount ?? 0;
    });
    return { totalGross, totalTds, totalNet };
  }
}
