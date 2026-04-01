import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';
import { AdminAppService } from '../adminapp.service';
import {
  AdminAffiliateApiService,
  AdminAffiliateListItem,
  AdminAffiliateDetail,
  AdminAffiliateCourseCommission,
  AdminAffiliateCourseOption,
} from './admin-affiliate-api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { first } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
  /** Admin-selectable allowlist of promotable courses. */
  allCourses: AdminAffiliateCourseOption[] = [];
  loadingCourses = false;
  allowedCourseIds = new Set<string>();
  allowedCoursesDirty = false;
  private sub = new Subscription();

  constructor(
    private api: AdminAffiliateApiService,
    private sharedService: SharedService,
    private toaster: ToasterService,
    private modal: NgbModal,
    private adminAppService: AdminAppService
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Affiliates');
    this.load();
    this.enableAllowCoursesTopbarButton();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
    this.sharedService.showAffiliateAllowCoursesButton.next(false);
    this.sub.unsubscribe();
  }

  private enableAllowCoursesTopbarButton(): void {
    // This permission endpoint returns true for Admin/Management; keeps the intent explicit.
    this.adminAppService.GetPermissionByAction('CourseList').pipe(first()).subscribe({
      next: (allowed) => this.sharedService.showAffiliateAllowCoursesButton.next(!!allowed),
      error: () => this.sharedService.showAffiliateAllowCoursesButton.next(false),
    });
  }

  // Topbar button navigates to /app/admin/affiliates/allow-courses (handled in topbar).

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
    this.allowedCoursesDirty = false;
    this.allowedCourseIds = new Set<string>();
    this.api.getDetails(item.id).pipe(first()).subscribe({
      next: (detail) => {
        this.detailModal = detail;
        this.editCommissionRate = detail.commissionRate ?? 0;
        this.editCourseCommissions = (detail.courseCommissions ?? []).map((c) => ({
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          commissionPercent: c.commissionPercent,
        }));
        // Init allowlist set from API if present; fallback to "all allowed" (empty set means no restriction).
        const ids = detail.allowedCourseIds ?? [];
        this.allowedCourseIds = new Set<string>(ids.map((x) => String(x)));
        this.allowedCoursesDirty = false;
        this.courseCommissionsDirty = false;
        this.detailLoading = false;
        if (this.detailTpl) {
          this.modal.open(this.detailTpl, { size: 'xl', scrollable: true });
        }
        this.loadCoursesIfNeeded();
      },
      error: () => {
        this.detailLoading = false;
        this.toaster.showError('Failed to load details.');
      },
    });
  }

  private loadCoursesIfNeeded(): void {
    if (this.loadingCourses || this.allCourses.length) return;
    this.loadingCourses = true;
    this.api.getPublishedCoursesForSelection().pipe(first()).subscribe({
      next: (list) => {
        this.allCourses = list ?? [];
        this.loadingCourses = false;
      },
      error: () => {
        this.loadingCourses = false;
        this.allCourses = [];
      }
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

  isCourseAllowed(courseId: string): boolean {
    // Empty set means "no restriction" (all allowed) unless admin starts editing.
    if (!this.allowedCourseIds.size && !this.allowedCoursesDirty) return true;
    return this.allowedCourseIds.has(courseId);
  }

  toggleCourseAllowed(courseId: string, checked: boolean): void {
    if (checked) this.allowedCourseIds.add(courseId);
    else this.allowedCourseIds.delete(courseId);
    this.allowedCoursesDirty = true;
  }

  allowAllCourses(): void {
    // Represent "all" by clearing set and marking dirty.
    this.allowedCourseIds.clear();
    this.allowedCoursesDirty = true;
  }

  saveAllowedCourses(): void {
    if (!this.detailAffiliateId || this.commissionSaving || !this.allowedCoursesDirty) return;
    this.commissionSaving = true;
    const ids = Array.from(this.allowedCourseIds);
    this.api.updateCommission(this.detailAffiliateId, { allowedCourseIds: ids }).pipe(first()).subscribe({
      next: () => {
        this.commissionSaving = false;
        this.allowedCoursesDirty = false;
        this.toaster.showSuccess('Allowed courses saved.');
      },
      error: () => {
        this.commissionSaving = false;
        this.toaster.showError('Failed to save allowed courses.');
      }
    });
  }
}
