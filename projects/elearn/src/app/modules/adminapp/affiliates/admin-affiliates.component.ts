import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';
import {
  AdminAffiliateApiService,
  AdminAffiliateListItem,
  AdminAffiliateDetail,
  AdminAffiliateCourseCommission,
} from './admin-affiliate-api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-admin-affiliates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-affiliates.component.html',
  styleUrls: ['./admin-affiliates.component.scss'],
})
export class AdminAffiliatesComponent implements OnInit, OnDestroy {
  @ViewChild('detailTpl') detailTpl!: TemplateRef<any>;

  list: AdminAffiliateListItem[] = [];
  loading = false;
  error = '';
  actionId: string | null = null;
  detailModal: AdminAffiliateDetail | null = null;
  detailLoading = false;
  statusFilter = '';
  detailAffiliateId: string | null = null;
  editCommissionRate = 0;
  editCourseCommissions: { courseId: string; courseTitle: string; commissionPercent: number }[] = [];
  commissionSaving = false;
  courseCommissionsDirty = false;

  constructor(
    private api: AdminAffiliateApiService,
    private sharedService: SharedService,
    private toaster: ToasterService,
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Affiliates');
    this.load();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getList().subscribe({
      next: (data) => {
        this.list = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: (err) => {
        const status = err?.status;
        const msg = err?.error?.message ?? err?.error?.Message ?? (typeof err === 'string' ? err : err?.message) ?? '';
        this.error = status === 404
          ? 'Affiliate API not found (404). Ensure Elearn.Serverless is running on ' + (environment.apiUrl || 'the configured API URL') + ' and the endpoint api/admin/affiliate exists.'
          : (msg || 'Failed to load affiliates.');
        this.list = [];
        this.loading = false;
      },
    });
  }

  approve(item: AdminAffiliateListItem): void {
    if (item.status !== 'Pending') return;
    this.actionId = item.id;
    this.api.approve(item.id).subscribe({
      next: (res) => {
        this.actionId = null;
        if (res?.success) {
          this.toaster.showSuccess('Affiliate approved. Referral link is active.');
          this.load();
        } else {
          this.toaster.showError('Approval failed.');
        }
      },
      error: (err) => {
        this.actionId = null;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to approve.');
      },
    });
  }

  markPaid(item: AdminAffiliateListItem): void {
    if (!item.pendingEarnings || item.pendingEarnings <= 0) return;
    this.actionId = item.id;
    this.api.markPaid(item.id).subscribe({
      next: () => {
        this.actionId = null;
        this.toaster.showSuccess('Marked as paid.');
        this.load();
      },
      error: (err) => {
        this.actionId = null;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to mark paid.');
      },
    });
  }

  get filteredList(): AdminAffiliateListItem[] {
    if (!this.statusFilter) return this.list;
    return this.list.filter((item) => item.status === this.statusFilter);
  }

  get pendingCount(): number {
    return this.list.filter((item) => item.status === 'Pending').length;
  }

  get approvedCount(): number {
    return this.list.filter((item) => item.status === 'Approved').length;
  }

  get detailAddress(): string {
    if (!this.detailModal) return '—';
    const parts = [
      this.detailModal.streetAddress1,
      this.detailModal.streetAddress2,
      [this.detailModal.city, this.detailModal.stateProvince, this.detailModal.zip].filter(Boolean).join(', '),
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  applyFilter(): void {}

  openDetails(item: AdminAffiliateListItem): void {
    this.detailModal = null;
    this.detailAffiliateId = item.id;
    this.detailLoading = true;
    this.api.getDetails(item.id).pipe(first()).subscribe({
      next: (detail) => {
        this.detailModal = detail;
        this.editCommissionRate = detail.commissionRate ?? 0;
        this.editCourseCommissions = (detail.courseCommissions ?? []).map((c) => ({
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          commissionPercent: c.commissionPercent,
        }));
        this.courseCommissionsDirty = false;
        this.detailLoading = false;
        if (this.detailTpl) {
          this.modal.open(this.detailTpl, { size: 'xl', scrollable: true });
        }
      },
      error: () => {
        this.detailLoading = false;
        this.toaster.showError('Failed to load details.');
      },
    });
  }

  closeDetail(): void {
    this.detailModal = null;
    this.detailAffiliateId = null;
    this.modal.dismissAll();
  }

  markCourseCommissionDirty(): void {
    this.courseCommissionsDirty = true;
  }

  saveDefaultCommission(): void {
    if (!this.detailAffiliateId || this.commissionSaving) return;
    this.commissionSaving = true;
    this.api.updateCommission(this.detailAffiliateId, { commissionRate: this.editCommissionRate }).pipe(first()).subscribe({
      next: () => {
        this.commissionSaving = false;
        if (this.detailModal) this.detailModal.commissionRate = this.editCommissionRate;
        this.toaster.showSuccess('Default commission saved.');
      },
      error: () => {
        this.commissionSaving = false;
        this.toaster.showError('Failed to save commission.');
      },
    });
  }

  saveCourseCommissions(): void {
    if (!this.detailAffiliateId || this.commissionSaving || !this.courseCommissionsDirty) return;
    this.commissionSaving = true;
    const courseCommissions = this.editCourseCommissions.map((c) => ({
      courseId: c.courseId,
      commissionPercent: c.commissionPercent,
    }));
    this.api.updateCommission(this.detailAffiliateId, { courseCommissions }).pipe(first()).subscribe({
      next: () => {
        this.commissionSaving = false;
        this.courseCommissionsDirty = false;
        this.toaster.showSuccess('Per-course commission saved.');
      },
      error: () => {
        this.commissionSaving = false;
        this.toaster.showError('Failed to save per-course commission.');
      },
    });
  }
}
