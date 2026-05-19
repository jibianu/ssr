import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface LicenseChangeRequest {
  id: string;
  companyAdminUserId: string;
  companyName?: string;
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

export interface CompanyBillingDashboard {
  overview: BillingOverview;
  licenseUsage: LicenseUsage;
  blogUsage?: BlogUsage;
  blogs?: CompanyBlogRow[];
  calculation: BillingCalculation;
  addons: BillingAddon[];
  invoices: BillingInvoiceRow[];
  insights: BillingInsight[];
  usageAnalytics: UsageAnalytics;
  pendingLicenseChangeRequest?: LicenseChangeRequest;
}

export interface BlogUsage {
  blogsIncluded: number;
  blogsUsed: number;
  blogsPublished: number;
  blogsPendingReview: number;
  blogsBillable: number;
  pricePerBlog: number;
}

export interface CompanyBlogRow {
  id: string;
  title: string;
  status: string;
  statusId: number;
  authorName: string;
  authorEmail: string;
  createdOn: string;
  publishedDate?: string;
}

export interface BillingOverview {
  companyName: string;
  subscriptionPlan: string;
  billingModel: string;
  totalPurchasedSeats: number;
  activeUsers: number;
  remainingSeats: number;
  trainerLicensesPurchased: number;
  trainerLicensesUsed: number;
  annualBillingAmount: number;
  annualBillingWithTax: number;
  gstPercentage: number;
  renewalDate?: string;
  monthlyActiveLearners: number;
  seatUtilizationPercent: number;
  paymentStatus: string;
  currency: string;
  blogsIncluded?: number;
  blogsUsed?: number;
  blogsPublished?: number;
  blogsPendingReview?: number;
}

export interface LicenseUsage {
  employeeSeatsPurchased: number;
  employeeSeatsUsed: number;
  employeeSeatsAvailable: number;
  trainerSeatsPurchased: number;
  trainerSeatsUsed: number;
  trainerSeatsAvailable: number;
  blogsIncluded?: number;
  blogsUsed?: number;
  blogsAvailable?: number;
  blogsBillable?: number;
  overageSeats: number;
  allowOverage: boolean;
}

export interface BillingCalculation {
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  gstPercentage: number;
  currency: string;
  lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
}

export interface BillingAddon {
  addonType: number;
  name: string;
  isActive: boolean;
  annualPrice: number;
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

export interface BillingInsight {
  severity: string;
  message: string;
}

export interface UsageAnalytics {
  monthlyActiveLearners: number;
  inactiveUsers60Days: number;
  courseCompletionPercent: number;
  learningHoursEstimate: number;
  seatUtilizationPercent: number;
}

export interface AdminBillingOverview {
  totalArr: number;
  monthlyRecurringRevenue: number;
  activeCompanies: number;
  totalSeatsSold: number;
  pendingRenewals30Days: number;
  failedPayments: number;
  tenants: AdminTenantRow[];
}

export interface AdminTenantRow {
  companyAdminUserId: string;
  companyName: string;
  subdomain?: string;
  subscriptionPlan: string;
  employeeSeats: number;
  seatsUsed: number;
  annualAmount: number;
  renewalDate?: string;
  paymentStatus: string;
  utilizationPercent: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyBillingApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getDashboard(): Observable<CompanyBillingDashboard> {
    return this.http.get<CompanyBillingDashboard>(`${this.apiUrl}api/company/billing`);
  }

  updateLicenses(body: {
    employeeSeatsPurchased?: number;
    trainerSeatsPurchased?: number;
    blogsIncluded?: number;
  }): Observable<LicenseUsage> {
    return this.http.post<LicenseUsage>(`${this.apiUrl}api/company/billing/licenses/update`, body);
  }

  submitLicenseChangeRequest(body: {
    employeeSeatsPurchased: number;
    trainerSeatsPurchased: number;
    blogsIncluded: number;
  }): Observable<LicenseChangeRequest> {
    return this.http.post<LicenseChangeRequest>(`${this.apiUrl}api/company/billing/licenses/request`, body);
  }

  getLicenseChangeRequests(): Observable<LicenseChangeRequest[]> {
    return this.http.get<LicenseChangeRequest[]>(`${this.apiUrl}api/company/billing/licenses/requests`);
  }

  requestQuote(message: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}api/company/billing/quote`, { message });
  }

  getAdminOverview(): Observable<AdminBillingOverview> {
    return this.http.get<AdminBillingOverview>(`${this.apiUrl}api/admin/billing`);
  }
}
