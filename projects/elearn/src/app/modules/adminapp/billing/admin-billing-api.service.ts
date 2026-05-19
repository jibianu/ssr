import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, timeout, throwError } from 'rxjs';
import { getApiBaseUrl } from 'src/app/core/helpers/api-base-url.helper';

export interface LicenseChangeRequestRow {
  id: string;
  companyAdminUserId: string;
  companyName: string;
  subdomain?: string;
  currentEmployeeSeats: number;
  currentTrainerSeats: number;
  currentBlogsIncluded: number;
  requestedEmployeeSeats: number;
  requestedTrainerSeats: number;
  requestedBlogsIncluded: number;
  status: string;
  statusId: number;
  reviewNotes?: string;
  createdOn: string;
  reviewedOn?: string;
}

export interface AdminBillingOverview {
  totalArr: number;
  monthlyRecurringRevenue: number;
  activeCompanies: number;
  totalSeatsSold: number;
  totalBlogsUsed: number;
  pendingRenewals30Days: number;
  failedPayments: number;
  pendingLicenseChangeRequests: number;
  tenants: AdminTenantRow[];
  analytics?: AdminBillingAnalytics;
  licenseChangeRequests?: LicenseChangeRequestRow[];
}

export interface AdminBillingAnalytics {
  revenueByMonth: { label: string; value: number }[];
  seatUtilizationByCompany: { label: string; value: number }[];
  renewalsByMonth: { label: string; value: number }[];
}

export interface AdminTenantRow {
  companyAdminUserId: string;
  subscriptionId?: string;
  companyName: string;
  subdomain?: string;
  subscriptionPlan: string;
  subscriptionPlanId: number;
  billingModelId: number;
  employeeSeats: number;
  trainerSeats: number;
  employeeSeatsUsed: number;
  trainerSeatsUsed: number;
  seatsUsed: number;
  blogsIncluded: number;
  blogsUsed: number;
  blogsPublished: number;
  pricePerBlog: number;
  pricePerEmployeeSeat: number;
  pricePerTrainerSeat: number;
  annualSubtotal: number;
  discountAmount: number;
  discountApplied: string;
  discountType: number;
  discountValue: number;
  customAnnualOverride?: number;
  gstPercentage: number;
  annualAmount: number;
  renewalDate?: string;
  paymentStatus: string;
  paymentStatusId: number;
  utilizationPercent: number;
  allowOverage: boolean;
  overagePricePerSeat: number;
  isSuspended: boolean;
  hasSubscription: boolean;
}

export interface AdminUpdateBillingBody {
  subscriptionPlan?: number;
  billingModel?: number;
  employeeSeatsPurchased?: number;
  trainerSeatsPurchased?: number;
  pricePerEmployeeSeat?: number;
  pricePerTrainerSeat?: number;
  blogsIncluded?: number;
  pricePerBlog?: number;
  gstPercentage?: number;
  renewalDate?: string;
  paymentStatus?: number;
  allowOverage?: boolean;
  overagePricePerSeat?: number;
  discountType?: number;
  discountValue?: number;
  customAnnualOverride?: number;
  isSuspended?: boolean;
}

export interface AdminApplyDiscountBody {
  discountType: number;
  discountValue: number;
  customAnnualOverride?: number;
  notes?: string;
}

export interface BillingInvoiceRow {
  id: string;
  invoiceNumber: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: string;
  paidOn?: string;
  dueDate: string;
}

@Injectable({ providedIn: 'root' })
export class AdminBillingApiService {
  constructor(private http: HttpClient) {}

  private billingBase(): string {
    return `${getApiBaseUrl()}api/admin/billing`;
  }

  getDashboard(): Observable<AdminBillingOverview> {
    const url = this.billingBase();
    return this.http.get<AdminBillingOverview>(url).pipe(
      timeout({
        first: 120_000,
        with: () =>
          throwError(
            () =>
              new HttpErrorResponse({
                status: 408,
                statusText: 'Request Timeout',
                url,
                error: { message: 'Billing request timed out. The API may be slow or unavailable.' },
              })
          ),
      })
    );
  }

  getCompanies(): Observable<AdminTenantRow[]> {
    return this.http.get<AdminTenantRow[]>(`${this.billingBase()}/companies`);
  }

  updateCompany(companyAdminUserId: string, body: AdminUpdateBillingBody): Observable<AdminTenantRow> {
    return this.http.put<AdminTenantRow>(`${this.billingBase()}/company/${companyAdminUserId}`, body);
  }

  applyDiscount(companyAdminUserId: string, body: AdminApplyDiscountBody): Observable<AdminTenantRow> {
    return this.http.post<AdminTenantRow>(`${this.billingBase()}/company/${companyAdminUserId}/discount`, body);
  }

  getInvoices(companyAdminUserId: string): Observable<BillingInvoiceRow[]> {
    return this.http.get<BillingInvoiceRow[]>(`${this.billingBase()}/company/${companyAdminUserId}/invoices`);
  }

  suspend(companyAdminUserId: string, suspend = true): Observable<AdminTenantRow> {
    return this.http.post<AdminTenantRow>(`${this.billingBase()}/company/${companyAdminUserId}/suspend?suspend=${suspend}`, {});
  }

  renew(companyAdminUserId: string, years = 1): Observable<AdminTenantRow> {
    return this.http.post<AdminTenantRow>(`${this.billingBase()}/company/${companyAdminUserId}/renew?years=${years}`, {});
  }

  reviewLicenseChangeRequest(requestId: string, approve: boolean, notes?: string): Observable<LicenseChangeRequestRow> {
    return this.http.post<LicenseChangeRequestRow>(
      `${this.billingBase()}/license-requests/${requestId}/review`,
      { approve, notes: notes || undefined }
    );
  }
}

/** Normalize API PascalCase or camelCase */
export function mapAdminOverview(res: any): AdminBillingOverview {
  const rawTenants = res?.tenants ?? res?.Tenants ?? [];
  const tenants = (Array.isArray(rawTenants) ? rawTenants : []).map(mapTenant);
  const analyticsRaw = res?.analytics ?? res?.Analytics;
  return {
    totalArr: num(res, 'totalArr', 'TotalArr'),
    monthlyRecurringRevenue: num(res, 'monthlyRecurringRevenue', 'MonthlyRecurringRevenue'),
    activeCompanies: num(res, 'activeCompanies', 'ActiveCompanies'),
    totalSeatsSold: num(res, 'totalSeatsSold', 'TotalSeatsSold'),
    totalBlogsUsed: num(res, 'totalBlogsUsed', 'TotalBlogsUsed'),
    pendingRenewals30Days: num(res, 'pendingRenewals30Days', 'PendingRenewals30Days'),
    failedPayments: num(res, 'failedPayments', 'FailedPayments'),
    pendingLicenseChangeRequests: num(res, 'pendingLicenseChangeRequests', 'PendingLicenseChangeRequests'),
    licenseChangeRequests: mapLicenseChangeRequests(res?.licenseChangeRequests ?? res?.LicenseChangeRequests),
    tenants,
    analytics: analyticsRaw ? {
      revenueByMonth: mapChartPoints(analyticsRaw.revenueByMonth ?? analyticsRaw.RevenueByMonth),
      seatUtilizationByCompany: mapChartPoints(analyticsRaw.seatUtilizationByCompany ?? analyticsRaw.SeatUtilizationByCompany),
      renewalsByMonth: mapChartPoints(analyticsRaw.renewalsByMonth ?? analyticsRaw.RenewalsByMonth)
    } : undefined
  };
}

export function mapTenant(t: any): AdminTenantRow {
  return {
    companyAdminUserId: str(t, 'companyAdminUserId', 'CompanyAdminUserId'),
    subscriptionId: t.subscriptionId ?? t.SubscriptionId,
    companyName: str(t, 'companyName', 'CompanyName') || '—',
    subdomain: t.subdomain ?? t.Subdomain,
    subscriptionPlan: str(t, 'subscriptionPlan', 'SubscriptionPlan'),
    subscriptionPlanId: num(t, 'subscriptionPlanId', 'SubscriptionPlanId'),
    billingModelId: num(t, 'billingModelId', 'BillingModelId'),
    employeeSeats: num(t, 'employeeSeats', 'EmployeeSeats'),
    trainerSeats: num(t, 'trainerSeats', 'TrainerSeats'),
    employeeSeatsUsed: num(t, 'employeeSeatsUsed', 'EmployeeSeatsUsed'),
    trainerSeatsUsed: num(t, 'trainerSeatsUsed', 'TrainerSeatsUsed'),
    seatsUsed: num(t, 'seatsUsed', 'SeatsUsed'),
    blogsIncluded: num(t, 'blogsIncluded', 'BlogsIncluded'),
    blogsUsed: num(t, 'blogsUsed', 'BlogsUsed'),
    blogsPublished: num(t, 'blogsPublished', 'BlogsPublished'),
    pricePerBlog: num(t, 'pricePerBlog', 'PricePerBlog'),
    pricePerEmployeeSeat: num(t, 'pricePerEmployeeSeat', 'PricePerEmployeeSeat'),
    pricePerTrainerSeat: num(t, 'pricePerTrainerSeat', 'PricePerTrainerSeat'),
    annualSubtotal: num(t, 'annualSubtotal', 'AnnualSubtotal'),
    discountAmount: num(t, 'discountAmount', 'DiscountAmount'),
    discountApplied: str(t, 'discountApplied', 'DiscountApplied') || '—',
    discountType: num(t, 'discountType', 'DiscountType'),
    discountValue: num(t, 'discountValue', 'DiscountValue'),
    customAnnualOverride: t.customAnnualOverride ?? t.CustomAnnualOverride,
    gstPercentage: num(t, 'gstPercentage', 'GstPercentage'),
    annualAmount: num(t, 'annualAmount', 'AnnualAmount'),
    renewalDate: t.renewalDate ?? t.RenewalDate,
    paymentStatus: str(t, 'paymentStatus', 'PaymentStatus'),
    paymentStatusId: num(t, 'paymentStatusId', 'PaymentStatusId'),
    utilizationPercent: num(t, 'utilizationPercent', 'UtilizationPercent'),
    allowOverage: !!(t.allowOverage ?? t.AllowOverage),
    overagePricePerSeat: num(t, 'overagePricePerSeat', 'OveragePricePerSeat'),
    isSuspended: !!(t.isSuspended ?? t.IsSuspended),
    hasSubscription: t.hasSubscription ?? t.HasSubscription ?? true
  };
}

export function mapLicenseChangeRequest(r: any): LicenseChangeRequestRow {
  return {
    id: str(r, 'id', 'Id'),
    companyAdminUserId: str(r, 'companyAdminUserId', 'CompanyAdminUserId'),
    companyName: str(r, 'companyName', 'CompanyName') || '—',
    subdomain: r.subdomain ?? r.Subdomain,
    currentEmployeeSeats: num(r, 'currentEmployeeSeats', 'CurrentEmployeeSeats'),
    currentTrainerSeats: num(r, 'currentTrainerSeats', 'CurrentTrainerSeats'),
    currentBlogsIncluded: num(r, 'currentBlogsIncluded', 'CurrentBlogsIncluded'),
    requestedEmployeeSeats: num(r, 'requestedEmployeeSeats', 'RequestedEmployeeSeats'),
    requestedTrainerSeats: num(r, 'requestedTrainerSeats', 'RequestedTrainerSeats'),
    requestedBlogsIncluded: num(r, 'requestedBlogsIncluded', 'RequestedBlogsIncluded'),
    status: str(r, 'status', 'Status'),
    statusId: num(r, 'statusId', 'StatusId'),
    reviewNotes: r.reviewNotes ?? r.ReviewNotes,
    createdOn: str(r, 'createdOn', 'CreatedOn'),
    reviewedOn: r.reviewedOn ?? r.ReviewedOn
  };
}

function mapLicenseChangeRequests(arr: any): LicenseChangeRequestRow[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(mapLicenseChangeRequest);
}

function mapChartPoints(arr: any): { label: string; value: number }[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(p => ({ label: p.label ?? p.Label ?? '', value: Number(p.value ?? p.Value ?? 0) }));
}

function num(o: any, c: string, p: string): number {
  const v = o?.[c] ?? o?.[p];
  return v == null ? 0 : Number(v);
}

function str(o: any, c: string, p: string): string {
  return (o?.[c] ?? o?.[p] ?? '').toString();
}
