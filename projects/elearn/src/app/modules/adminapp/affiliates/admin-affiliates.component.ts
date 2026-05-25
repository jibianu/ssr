import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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
import { AFFILIATE_PORTAL_PAGES } from './affiliate-portal-pages';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { environment } from '../../../../environments/environment';
import { first } from 'rxjs/operators';
import { Subscription, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-admin-affiliates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-affiliates.component.html',
  styleUrls: ['./admin-affiliates.component.scss'],
})
export class AdminAffiliatesComponent implements OnInit, OnDestroy {
  @ViewChild('detailTpl') detailTpl!: TemplateRef<any>;

  readonly ALL_USERS_ID = '__all__';

  /** Right sidenav: allow courses (topbar "Allow course" button). */
  allowCoursesDrawerOpen = false;
  allowDrawerCourseFilter = '';

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
  /** Set when opening detail — drives allowed-courses section (from API). */
  detailRestrictsCourses = false;
  detailPermittedCourses: AdminAffiliateCourseOption[] = [];

  /** Allow-courses modal (topbar button). */
  allowModalAffiliateId = '';
  allowModalAllowAll = true;
  allowModalCourseIds = new Set<string>();
  allowModalAllowAllPages = true;
  allowModalPageKeys = new Set<string>();
  readonly portalPages = AFFILIATE_PORTAL_PAGES;
  allowModalDirty = false;
  allowModalSaving = false;
  allowModalLoading = false;

  supportPhone = '';
  supportEmail = '';
  supportSettingsLoading = false;
  supportSettingsSaving = false;
  supportSettingsEditing = false;
  private supportPhoneDraft = '';
  private supportEmailDraft = '';

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
    this.loadSupportSettings();
    this.enableAllowCoursesTopbarButton();
    this.sub.add(
      this.sharedService.affiliateAllowCoursesClick$.subscribe(() => this.openAllowCoursesDrawer())
    );
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.allowCoursesDrawerOpen) {
      this.closeAllowCoursesDrawer();
    }
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

  loadSupportSettings(): void {
    this.supportSettingsLoading = true;
    this.api.getSupportSettings().pipe(first()).subscribe({
      next: (s) => {
        this.supportPhone = s.supportPhone ?? '';
        this.supportEmail = s.supportEmail ?? '';
        this.supportSettingsLoading = false;
      },
      error: () => {
        this.supportSettingsLoading = false;
      },
    });
  }

  startSupportSettingsEdit(): void {
    this.supportPhoneDraft = this.supportPhone;
    this.supportEmailDraft = this.supportEmail;
    this.supportSettingsEditing = true;
  }

  cancelSupportSettingsEdit(): void {
    this.supportPhone = this.supportPhoneDraft;
    this.supportEmail = this.supportEmailDraft;
    this.supportSettingsEditing = false;
  }

  saveSupportSettings(): void {
    const phone = (this.supportPhone ?? '').trim();
    const email = (this.supportEmail ?? '').trim();
    if (!phone || !email) {
      this.toaster.showError('Support phone and email are required.');
      return;
    }
    this.supportSettingsSaving = true;
    this.api.updateSupportSettings({ supportPhone: phone, supportEmail: email }).pipe(first()).subscribe({
      next: (s) => {
        this.supportPhone = s.supportPhone;
        this.supportEmail = s.supportEmail;
        this.supportSettingsSaving = false;
        this.supportSettingsEditing = false;
        this.toaster.showSuccess('Support contact saved. Affiliates will see the updated details.');
      },
      error: (err) => {
        this.supportSettingsSaving = false;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to save support settings.');
      },
    });
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

  private normCourseId(id: string | undefined | null): string {
    return String(id ?? '').trim().toLowerCase();
  }

  /** Course ids this affiliate may promote (explicit allowlist). */
  private getDetailPermittedIds(): Set<string> {
    if (this.allowedCourseIds.size > 0) {
      return new Set(Array.from(this.allowedCourseIds).map((x) => this.normCourseId(x)));
    }
    const fromApi = this.detailModal?.allowedCourseIds ?? [];
    if (fromApi.length > 0) return new Set(fromApi.map((x) => this.normCourseId(x)));
    return new Set();
  }

  /** True when affiliate has an explicit allowlist (not "allow all"). */
  get detailHasCourseRestriction(): boolean {
    return this.detailRestrictsCourses;
  }

  /** Courses shown in affiliate detail edit UI — only permitted courses when restricted. */
  get detailEditableCourses(): AdminAffiliateCourseOption[] {
    if (this.detailRestrictsCourses && this.detailPermittedCourses.length > 0) {
      return this.detailPermittedCourses;
    }
    const permitted = this.getDetailPermittedIds();
    const all = this.allCourses ?? [];
    if (!permitted.size) return all;
    const matched = all.filter((c) => permitted.has(this.normCourseId(c.id)));
    if (matched.length) return matched;
    return (this.editCourseCommissions ?? [])
      .filter((c) => permitted.has(this.normCourseId(c.courseId)))
      .map((c) => ({ id: c.courseId, title: c.courseTitle, slug: '' }));
  }

  applyFilter(): void {}

  openDetails(item: AdminAffiliateListItem): void {
    this.detailModal = null;
    this.detailAffiliateId = item.id;
    this.detailLoading = true;
    this.allowedCoursesDirty = false;
    this.allowedCourseIds = new Set<string>();

    const detail$ = this.api.getDetails(item.id);
    const courses$ =
      this.allCourses.length > 0
        ? of(this.allCourses)
        : this.api.getPublishedCoursesForSelection();

    forkJoin({ detail: detail$, courses: courses$ }).pipe(first()).subscribe({
      next: ({ detail, courses }) => {
        this.allCourses = Array.isArray(courses) ? courses : [];
        this.loadingCourses = false;
        this.detailModal = detail;
        this.editCommissionRate = detail.commissionRate ?? 0;

        this.detailRestrictsCourses = Boolean(detail.restrictsCourses);
        this.detailPermittedCourses = detail.permittedCourses ?? [];

        const ids = (detail.allowedCourseIds ?? []).map((x) => this.normCourseId(x));
        this.allowedCourseIds = new Set<string>(ids.filter(Boolean));
        this.syncDetailRestrictionFromApi(detail, courses);

        if (this.detailRestrictsCourses && this.detailPermittedCourses.length > 0) {
          this.allowedCourseIds = new Set(
            this.detailPermittedCourses.map((c) => this.normCourseId(c.id)).filter(Boolean)
          );
        }

        this.editCourseCommissions = (detail.courseCommissions ?? []).map((c) => ({
          courseId: c.courseId,
          courseTitle: c.courseTitle,
          commissionPercent: c.commissionPercent,
        }));
        if (this.detailHasCourseRestriction) {
          const permitted = this.getDetailPermittedIds();
          this.editCourseCommissions = this.editCourseCommissions.filter((c) =>
            permitted.has(this.normCourseId(c.courseId))
          );
        }

        this.allowedCoursesDirty = false;
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

  /** When API allowlist is missing, infer restriction from filtered commission list vs full catalog. */
  private syncDetailRestrictionFromApi(
    detail: AdminAffiliateDetail,
    allPublished: AdminAffiliateCourseOption[]
  ): void {
    if (this.detailRestrictsCourses) return;
    if (this.allowedCourseIds.size > 0) {
      this.detailRestrictsCourses = true;
      return;
    }
    const cc = detail.courseCommissions ?? [];
    const total = allPublished?.length ?? 0;
    if (cc.length > 0 && total > 0 && cc.length < total) {
      this.detailRestrictsCourses = true;
      this.allowedCourseIds = new Set(cc.map((c) => this.normCourseId(c.courseId)).filter(Boolean));
      this.detailPermittedCourses = cc.map((c) => ({
        id: c.courseId,
        title: c.courseTitle,
        slug: '',
      }));
    }
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
    this.detailRestrictsCourses = false;
    this.detailPermittedCourses = [];
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
    const id = this.normCourseId(courseId);
    if (this.detailHasCourseRestriction) return this.getDetailPermittedIds().has(id);
    if (!this.allowedCourseIds.size && !this.allowedCoursesDirty) return true;
    return this.allowedCourseIds.has(id);
  }

  toggleCourseAllowed(courseId: string, checked: boolean): void {
    const id = String(courseId);
    if (!this.allowedCoursesDirty && !this.allowedCourseIds.size) {
      if (!checked) {
        this.allowedCourseIds = new Set((this.allCourses ?? []).map((c) => String(c.id)));
        this.allowedCourseIds.delete(id);
      }
    } else {
      if (checked) this.allowedCourseIds.add(id);
      else this.allowedCourseIds.delete(id);
    }
    this.allowedCoursesDirty = true;
  }

  allowAllCourses(): void {
    this.allowedCourseIds.clear();
    this.allowedCoursesDirty = true;
  }

  get filteredDrawerCourses(): AdminAffiliateCourseOption[] {
    const q = (this.allowDrawerCourseFilter || '').trim().toLowerCase();
    if (!q) return this.allCourses ?? [];
    return (this.allCourses ?? []).filter(
      (c) =>
        (c.title || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q)
    );
  }

  openAllowCoursesDrawer(): void {
    this.allowCoursesDrawerOpen = true;
    this.allowDrawerCourseFilter = '';
    this.allowModalAffiliateId = this.ALL_USERS_ID;
    this.allowModalAllowAll = true;
    this.allowModalCourseIds.clear();
    this.allowModalPageKeys.clear();
    this.allowModalAllowAllPages = true;
    this.allowModalDirty = false;
    this.allowModalLoading = true;
    this.loadCoursesIfNeeded();
    if (!this.list.length) {
      this.api.getList().pipe(first()).subscribe({
        next: (data) => {
          this.list = Array.isArray(data) ? data : [];
          this.loadAllowModalSelection();
        },
        error: () => {
          this.allowModalLoading = false;
          this.toaster.showError('Failed to load affiliates.');
        },
      });
    } else {
      this.loadAllowModalSelection();
    }
  }

  private loadAllowModalSelection(): void {
    const firstId = this.list[0]?.id;
    if (!firstId) {
      this.allowModalLoading = false;
      return;
    }
    this.loadAllowModalSelectionForAffiliate(firstId);
  }

  private applyAllowModalFromDetail(detail: AdminAffiliateDetail): void {
    const ids = detail.allowedCourseIds ?? [];
    if (ids.length > 0) {
      this.allowModalAllowAll = false;
      this.allowModalCourseIds = new Set(ids.map((x) => String(x)));
    } else {
      this.allowModalAllowAll = true;
      this.allowModalCourseIds.clear();
    }
    const pageKeys = detail.allowedPageKeys ?? [];
    if (pageKeys.length > 0) {
      this.allowModalAllowAllPages = false;
      this.allowModalPageKeys = new Set(pageKeys.map((x) => String(x)));
    } else {
      this.allowModalAllowAllPages = true;
      this.allowModalPageKeys.clear();
    }
  }

  private loadAllowModalSelectionForAffiliate(affiliateId: string): void {
    this.allowModalLoading = true;
    this.api.getDetails(affiliateId).pipe(first()).subscribe({
      next: (detail) => {
        this.applyAllowModalFromDetail(detail);
        this.allowModalLoading = false;
      },
      error: () => {
        this.allowModalLoading = false;
      },
    });
  }

  onAllowModalAffiliateChange(): void {
    if (!this.allowModalAffiliateId || this.allowModalAffiliateId === this.ALL_USERS_ID) {
      this.allowModalDirty = false;
      const firstId = this.list[0]?.id;
      if (firstId) {
        this.loadAllowModalSelectionForAffiliate(firstId);
      } else {
        this.allowModalAllowAll = true;
        this.allowModalCourseIds.clear();
        this.allowModalAllowAllPages = true;
        this.allowModalPageKeys.clear();
        this.allowModalLoading = false;
      }
      return;
    }
    this.allowModalLoading = true;
    this.api.getDetails(this.allowModalAffiliateId).pipe(first()).subscribe({
      next: (detail) => {
        this.applyAllowModalFromDetail(detail);
        this.allowModalDirty = false;
        this.allowModalLoading = false;
      },
      error: () => {
        this.allowModalLoading = false;
        this.toaster.showError('Failed to load affiliate allowlist.');
      },
    });
  }

  isAllowModalCourseChecked(courseId: string): boolean {
    if (this.allowModalAllowAll) return true;
    return this.allowModalCourseIds.has(String(courseId));
  }

  toggleAllowModalCourse(courseId: string, checked: boolean): void {
    const id = String(courseId);
    if (this.allowModalAllowAll) {
      if (!checked) {
        this.allowModalAllowAll = false;
        this.allowModalCourseIds = new Set((this.allCourses ?? []).map((c) => String(c.id)));
        this.allowModalCourseIds.delete(id);
      }
      this.allowModalDirty = true;
      return;
    }
    if (checked) this.allowModalCourseIds.add(id);
    else this.allowModalCourseIds.delete(id);
    this.allowModalDirty = true;
  }

  allowModalSelectAll(): void {
    this.allowModalAllowAll = true;
    this.allowModalCourseIds.clear();
    this.allowModalAllowAllPages = true;
    this.allowModalPageKeys.clear();
    this.allowModalDirty = true;
  }

  isAllowModalPageChecked(pageKey: string): boolean {
    if (this.allowModalAllowAllPages) return true;
    return this.allowModalPageKeys.has(String(pageKey));
  }

  toggleAllowModalPage(pageKey: string, checked: boolean): void {
    const key = String(pageKey);
    if (this.allowModalAllowAllPages) {
      if (!checked) {
        this.allowModalAllowAllPages = false;
        this.allowModalPageKeys = new Set(this.portalPages.map((p) => p.pageKey));
        this.allowModalPageKeys.delete(key);
      }
      this.allowModalDirty = true;
      return;
    }
    if (checked) this.allowModalPageKeys.add(key);
    else this.allowModalPageKeys.delete(key);
    this.allowModalDirty = true;
  }

  allowModalSelectAllPages(): void {
    this.allowModalAllowAllPages = true;
    this.allowModalPageKeys.clear();
    this.allowModalDirty = true;
  }

  closeAllowCoursesDrawer(): void {
    this.allowCoursesDrawerOpen = false;
  }

  saveAllowModalCourses(): void {
    if (!this.allowModalAffiliateId || this.allowModalSaving) return;
    this.allowModalSaving = true;
    const ids = this.allowModalAllowAll ? [] : Array.from(this.allowModalCourseIds);
    const pageKeys = this.allowModalAllowAllPages ? [] : Array.from(this.allowModalPageKeys);
    const payload = { allowedCourseIds: ids, allowedPageKeys: pageKeys };

    if (this.allowModalAffiliateId === this.ALL_USERS_ID) {
      const targets = (this.list ?? []).map((a) => a.id).filter(Boolean);
      if (!targets.length) {
        this.allowModalSaving = false;
        this.toaster.showError('No affiliates found.');
        return;
      }
      forkJoin(targets.map((id) => this.api.updateCommission(id, payload))).pipe(first()).subscribe({
        next: () => {
          this.allowModalSaving = false;
          this.allowModalDirty = false;
          this.toaster.showSuccess('Saved. Checked courses and pages show on the affiliate dashboard.');
          this.closeAllowCoursesDrawer();
        },
        error: () => {
          this.allowModalSaving = false;
          this.toaster.showError('Failed to save.');
        },
      });
      return;
    }

    this.api.updateCommission(this.allowModalAffiliateId, payload).pipe(first()).subscribe({
      next: () => {
        this.allowModalSaving = false;
        this.allowModalDirty = false;
        this.toaster.showSuccess('Allowed courses and pages saved for this affiliate.');
        this.closeAllowCoursesDrawer();
      },
      error: () => {
        this.allowModalSaving = false;
        this.toaster.showError('Failed to save.');
      },
    });
  }

  displayAffiliateLabel(a: AdminAffiliateListItem): string {
    const name = (a?.name ?? '').trim();
    const email = (a?.email ?? '').trim();
    if (name && email) return `${name} (${email})`;
    return name || email || a?.id || '';
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
