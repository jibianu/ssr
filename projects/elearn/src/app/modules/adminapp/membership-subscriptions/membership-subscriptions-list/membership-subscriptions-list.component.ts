import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MembershipApiService, MembershipPlanApi, UpdateMembershipPlanRequest } from 'src/app/services/membership-api.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

interface MembershipSubscriptionRow {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userCompanyName: string;
  userDesignation: string;
  userDepartment: string;
  planName: string;
  planCode: string;
  amount: number;
  gateway: string;
  paymentStatus: string;
  subscriptionStatus: string;
  startDate: string;
  endDate: string;
  couponCode: string;
  couponStatus: string;
  createdOn: string;
}

interface PlanEditRow {
  planCode: string;
  planName: string;
  sixMonthPrice: number;
  yearlyDiscountPercent: number;
  isActive: boolean;
  displayOrder: number;
  yearlyPrice: number;
  yearlyOriginalPrice: number;
  saving: boolean;
}

@Component({
  selector: 'app-membership-subscriptions-list',
  templateUrl: './membership-subscriptions-list.component.html',
  styleUrls: ['./membership-subscriptions-list.component.scss'],
  standalone: false
})
export class MembershipSubscriptionsListComponent implements OnInit {
  activeTab: 'pricing' | 'subscriptions' = 'pricing';

  rows: MembershipSubscriptionRow[] = [];
  loading = false;
  loadError: string | null = null;
  pageNumber = 1;
  pageSize = 20;
  totalNumberOfRecords = 0;
  search = '';
  planCode = '';
  subscriptionStatus = '';
  gateway = '';
  selectedDetail: any = null;
  detailLoading = false;

  planRows: PlanEditRow[] = [];
  plansLoading = false;
  plansLoadError: string | null = null;

  constructor(
    private membershipApi: MembershipApiService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadPlans();
    this.fetch();
  }

  setTab(tab: 'pricing' | 'subscriptions'): void {
    this.activeTab = tab;
  }

  loadPlans(): void {
    this.plansLoading = true;
    this.plansLoadError = null;
    this.membershipApi.getAdminPlans().subscribe({
      next: (plans) => {
        this.planRows = (plans || []).map((p) => this.mapPlanToEditRow(p));
        this.plansLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.plansLoadError = 'Could not load membership plan pricing.';
        this.plansLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private mapPlanToEditRow(p: MembershipPlanApi): PlanEditRow {
    return {
      planCode: p.planCode,
      planName: p.planName,
      sixMonthPrice: Number(p.sixMonthPrice ?? 0),
      yearlyDiscountPercent: Number(p.yearlyDiscountPercent ?? 30),
      isActive: p.isActive !== false,
      displayOrder: Number(p.displayOrder ?? 0),
      yearlyPrice: Number(p.yearlyPrice ?? 0),
      yearlyOriginalPrice: Number(p.yearlyOriginalPrice ?? 0),
      saving: false
    };
  }

  previewYearlyOriginal(plan: PlanEditRow): number {
    return Math.round(plan.sixMonthPrice * 2);
  }

  previewYearlyPrice(plan: PlanEditRow): number {
    const original = plan.sixMonthPrice * 2;
    return Math.round(original * (100 - plan.yearlyDiscountPercent) / 100);
  }

  savePlan(plan: PlanEditRow): void {
    if (plan.sixMonthPrice <= 0) {
      this.toaster.showError('Six-month price must be greater than zero.');
      return;
    }
    if (plan.yearlyDiscountPercent < 0 || plan.yearlyDiscountPercent > 90) {
      this.toaster.showError('Yearly discount must be between 0 and 90.');
      return;
    }

    plan.saving = true;
    const body: UpdateMembershipPlanRequest = {
      planName: plan.planName.trim(),
      sixMonthPrice: plan.sixMonthPrice,
      yearlyDiscountPercent: plan.yearlyDiscountPercent,
      isActive: plan.isActive,
      displayOrder: plan.displayOrder
    };

    this.membershipApi.updateAdminPlan(plan.planCode, body).subscribe({
      next: (updated) => {
        Object.assign(plan, this.mapPlanToEditRow(updated));
        plan.saving = false;
        this.toaster.showSuccess(`${plan.planName} pricing updated.`);
        this.cdr.detectChanges();
      },
      error: (err) => {
        plan.saving = false;
        this.toaster.showError(err?.error?.message ?? 'Could not save plan pricing.');
        this.cdr.detectChanges();
      }
    });
  }

  fetch(): void {
    this.loading = true;
    this.loadError = null;
    this.membershipApi.getAdminSubscriptions(
      this.pageNumber,
      this.pageSize,
      this.search,
      this.planCode,
      this.subscriptionStatus,
      this.gateway
    ).subscribe({
      next: (res) => {
        const list = res?.results ?? [];
        this.rows = list.map((x: any) => ({
          id: String(x?.id ?? ''),
          userName: x?.userName ?? '',
          userEmail: x?.userEmail ?? '',
          userPhone: x?.userPhone ?? '',
          userCompanyName: x?.userCompanyName ?? '',
          userDesignation: x?.userDesignation ?? '',
          userDepartment: x?.userDepartment ?? '',
          planName: x?.planName ?? '',
          planCode: x?.planCode ?? '',
          amount: Number(x?.amount ?? 0),
          gateway: x?.gateway ?? '',
          paymentStatus: x?.paymentStatus ?? '',
          subscriptionStatus: x?.subscriptionStatus ?? '',
          startDate: x?.startDate ?? '',
          endDate: x?.endDate ?? '',
          couponCode: x?.couponCode ?? '',
          couponStatus: x?.couponStatus ?? '',
          createdOn: x?.createdOn ?? ''
        }));
        this.totalNumberOfRecords = Number(res?.totalNumberOfRecords ?? 0);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadError = 'Could not load membership subscriptions.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetch();
  }

  onPageChange(page: number): void {
    this.pageNumber = page;
    this.fetch();
  }

  onPageSizeChange(): void {
    this.pageNumber = 1;
    this.fetch();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalNumberOfRecords / this.pageSize));
  }

  viewDetail(row: MembershipSubscriptionRow): void {
    this.detailLoading = true;
    this.selectedDetail = null;
    this.membershipApi.getAdminSubscriptionDetail(row.id).subscribe({
      next: (detail) => {
        this.selectedDetail = detail;
        this.detailLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.detailLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeDetail(): void {
    this.selectedDetail = null;
  }

  formatDate(value: string): string {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
  }
}
