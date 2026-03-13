import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RevenueByChannelItem,
  RevenueByInstructorItem,
  RevenueByCampaignItem,
  RevenueByAffiliateItem,
  AffiliatePayoutItem,
} from '../../../services/revenue-api.service';
import { AdminRevenueService } from './admin-revenue.service';

@Component({
  selector: 'app-admin-revenue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-revenue.component.html',
  styleUrls: ['./admin-revenue.component.scss'],
})
export class AdminRevenueComponent implements OnInit {
  fromDate = '';
  toDate = '';
  loadingChannel = false;
  loadingInstructor = false;
  loadingCampaign = false;
  loadingAffiliate = false;
  loadingPayouts = false;
  byChannel: RevenueByChannelItem[] = [];
  byInstructor: RevenueByInstructorItem[] = [];
  byCampaign: RevenueByCampaignItem[] = [];
  byAffiliate: RevenueByAffiliateItem[] = [];
  payouts: AffiliatePayoutItem[] = [];
  payoutStatus = '';
  errorChannel = '';
  errorInstructor = '';
  errorCampaign = '';
  errorAffiliate = '';
  errorPayouts = '';

  constructor(
    private revenueApi: AdminRevenueService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.loadAll();
  }

  applyRange(): void {
    this.loadAll();
  }

  loadAll(): void {
    if (!this.fromDate || !this.toDate) return;
    this.loadByChannel();
    this.loadByInstructor();
    this.loadByCampaign();
    this.loadByAffiliate();
    this.loadPayouts();
  }

  applyPayoutFilter(): void {
    this.loadPayouts();
  }

  private loadByChannel(): void {
    this.loadingChannel = true;
    this.errorChannel = '';
    this.revenueApi.getRevenueByChannel(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.byChannel = list || [];
        this.loadingChannel = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorChannel = err?.error?.message || err?.message || 'Failed to load revenue by channel.';
        this.byChannel = [];
        this.loadingChannel = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadByInstructor(): void {
    this.loadingInstructor = true;
    this.errorInstructor = '';
    this.revenueApi.getRevenueByInstructor(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.byInstructor = list || [];
        this.loadingInstructor = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorInstructor = err?.error?.message || err?.message || 'Failed to load revenue by instructor.';
        this.byInstructor = [];
        this.loadingInstructor = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadByCampaign(): void {
    this.loadingCampaign = true;
    this.errorCampaign = '';
    this.revenueApi.getRevenueByCampaign(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.byCampaign = list || [];
        this.loadingCampaign = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorCampaign = err?.error?.message || err?.message || 'Failed to load revenue by campaign.';
        this.byCampaign = [];
        this.loadingCampaign = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadByAffiliate(): void {
    this.loadingAffiliate = true;
    this.errorAffiliate = '';
    this.revenueApi.getRevenueByAffiliate(this.fromDate, this.toDate).subscribe({
      next: (list) => {
        this.byAffiliate = list || [];
        this.loadingAffiliate = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorAffiliate = err?.error?.message || err?.message || 'Failed to load revenue by affiliate.';
        this.byAffiliate = [];
        this.loadingAffiliate = false;
        this.cdr.detectChanges();
      },
    });
  }

  private loadPayouts(): void {
    this.loadingPayouts = true;
    this.errorPayouts = '';
    this.revenueApi.getAffiliatePayouts(this.payoutStatus || undefined).subscribe({
      next: (list) => {
        this.payouts = list || [];
        this.loadingPayouts = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorPayouts = err?.error?.message || err?.message || 'Failed to load affiliate payouts.';
        this.payouts = [];
        this.loadingPayouts = false;
        this.cdr.detectChanges();
      },
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  channelLabel(type: string): string {
    if (type === 'InstructorPromotion') return 'Instructor promotion';
    if (type === 'PaidAcquisition') return 'Paid acquisition';
    if (type === 'MarketingCampaign') return 'Marketing campaign';
    if (type === 'Affiliate') return 'Affiliate';
    return type || 'Organic';
  }

  trackByChannel(_index: number, row: RevenueByChannelItem): string {
    return row?.saleChannelType ?? '';
  }

  trackByInstructor(_index: number, row: RevenueByInstructorItem): string {
    return row?.instructorId ?? '';
  }

  trackByCampaign(_index: number, row: RevenueByCampaignItem): string {
    return row?.campaignId ?? row?.trackingCode ?? String(_index);
  }

  trackByAffiliate(_index: number, row: RevenueByAffiliateItem): string {
    return row?.affiliateId ?? row?.trackingCode ?? String(_index);
  }

  trackByPayoutId(_index: number, row: AffiliatePayoutItem): string {
    return row?.id ?? '';
  }
}
