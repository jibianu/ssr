import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CompanyBillingApiService,
  CompanyBillingDashboard,
  CompanyBlogRow,
  BillingAddon
} from '../company-billing-api.service';

@Component({
  selector: 'app-company-billing-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company-billing-dashboard.component.html',
  styleUrls: ['./company-billing-dashboard.component.scss']
})
export class CompanyBillingDashboardComponent implements OnInit {
  loading = true;
  data: CompanyBillingDashboard | null = null;
  quoteMessage = '';
  seatForm = { employeeSeatsPurchased: 0, trainerSeatsPurchased: 0, blogsIncluded: 0 };
  savingSeats = false;
  seatMessage = '';
  seatError = '';

  constructor(private api: CompanyBillingApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getDashboard().subscribe({
      next: (res) => {
        this.data = this.normalize(res);
        if (this.data?.licenseUsage) {
          this.seatForm.employeeSeatsPurchased = this.data.licenseUsage.employeeSeatsPurchased;
          this.seatForm.trainerSeatsPurchased = this.data.licenseUsage.trainerSeatsPurchased;
          this.seatForm.blogsIncluded = this.data.licenseUsage.blogsIncluded
            ?? this.data.blogUsage?.blogsIncluded
            ?? this.data.overview?.blogsIncluded
            ?? 0;
        }
        if (this.data?.pendingLicenseChangeRequest) {
          const p = this.data.pendingLicenseChangeRequest;
          this.seatForm.employeeSeatsPurchased = p.requestedEmployeeSeats;
          this.seatForm.trainerSeatsPurchased = p.requestedTrainerSeats;
          this.seatForm.blogsIncluded = p.requestedBlogsIncluded;
        }
        this.seatMessage = '';
        this.seatError = '';
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  employeeUtilPercent(): number {
    const u = this.data?.licenseUsage;
    if (!u?.employeeSeatsPurchased) return 0;
    return Math.min(100, Math.round((u.employeeSeatsUsed / u.employeeSeatsPurchased) * 100));
  }

  trainerUtilPercent(): number {
    const u = this.data?.licenseUsage;
    if (!u?.trainerSeatsPurchased) return 0;
    return Math.min(100, Math.round((u.trainerSeatsUsed / u.trainerSeatsPurchased) * 100));
  }

  blogUtilPercent(): number {
    const u = this.data?.licenseUsage;
    const included = u?.blogsIncluded ?? this.data?.blogUsage?.blogsIncluded ?? 0;
    const used = u?.blogsUsed ?? this.data?.blogUsage?.blogsUsed ?? 0;
    if (!included) return 0;
    return Math.min(100, Math.round((used / included) * 100));
  }

  hasPendingLicenseRequest(): boolean {
    return !!this.data?.pendingLicenseChangeRequest;
  }

  saveSeats(): void {
    if (this.hasPendingLicenseRequest()) {
      this.seatError = 'A change request is already pending super admin approval.';
      return;
    }
    this.savingSeats = true;
    this.seatMessage = '';
    this.seatError = '';
    this.api.submitLicenseChangeRequest({
      employeeSeatsPurchased: this.seatForm.employeeSeatsPurchased,
      trainerSeatsPurchased: this.seatForm.trainerSeatsPurchased,
      blogsIncluded: this.seatForm.blogsIncluded
    }).subscribe({
      next: () => {
        this.savingSeats = false;
        this.seatMessage = 'Request submitted. Super admin will review and apply changes.';
        this.load();
      },
      error: (err) => {
        this.savingSeats = false;
        this.seatError = err?.error?.message || 'Could not submit request.';
      }
    });
  }

  submitQuote(): void {
    this.api.requestQuote(this.quoteMessage || 'Enterprise quote request').subscribe({
      next: () => { this.quoteMessage = ''; alert('Quote request submitted.'); }
    });
  }

  toggleAddon(addon: BillingAddon): void {
    addon.isActive = !addon.isActive;
  }

  formatCurrency(v: number | undefined): string {
    const c = this.data?.overview?.currency || 'INR';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v ?? 0);
  }

  private mapBlogUsage(raw: any) {
    if (!raw) return undefined;
    return {
      blogsIncluded: raw.blogsIncluded ?? raw.BlogsIncluded ?? 0,
      blogsUsed: raw.blogsUsed ?? raw.BlogsUsed ?? 0,
      blogsPublished: raw.blogsPublished ?? raw.BlogsPublished ?? 0,
      blogsPendingReview: raw.blogsPendingReview ?? raw.BlogsPendingReview ?? 0,
      blogsBillable: raw.blogsBillable ?? raw.BlogsBillable ?? 0,
      pricePerBlog: raw.pricePerBlog ?? raw.PricePerBlog ?? 0
    };
  }

  private mapBlogs(arr: any): CompanyBlogRow[] {
    if (!Array.isArray(arr)) return [];
    return arr.map(b => ({
      id: String(b.id ?? b.Id ?? ''),
      title: b.title ?? b.Title ?? '—',
      status: b.status ?? b.Status ?? '',
      statusId: b.statusId ?? b.StatusId ?? 0,
      authorName: b.authorName ?? b.AuthorName ?? '',
      authorEmail: b.authorEmail ?? b.AuthorEmail ?? '',
      createdOn: b.createdOn ?? b.CreatedOn,
      publishedDate: b.publishedDate ?? b.PublishedDate
    }));
  }

  private normalize(raw: any): CompanyBillingDashboard {
    const o = raw?.overview ?? raw?.Overview;
    const lu = raw?.licenseUsage ?? raw?.LicenseUsage;
    const calc = raw?.calculation ?? raw?.Calculation;
    return {
      overview: o ? {
        companyName: o.companyName ?? o.CompanyName,
        subscriptionPlan: o.subscriptionPlan ?? o.SubscriptionPlan,
        billingModel: o.billingModel ?? o.BillingModel,
        totalPurchasedSeats: o.totalPurchasedSeats ?? o.TotalPurchasedSeats ?? 0,
        activeUsers: o.activeUsers ?? o.ActiveUsers ?? 0,
        remainingSeats: o.remainingSeats ?? o.RemainingSeats ?? 0,
        trainerLicensesPurchased: o.trainerLicensesPurchased ?? o.TrainerLicensesPurchased ?? 0,
        trainerLicensesUsed: o.trainerLicensesUsed ?? o.TrainerLicensesUsed ?? 0,
        annualBillingAmount: o.annualBillingAmount ?? o.AnnualBillingAmount ?? 0,
        annualBillingWithTax: o.annualBillingWithTax ?? o.AnnualBillingWithTax ?? 0,
        gstPercentage: o.gstPercentage ?? o.GstPercentage ?? 18,
        renewalDate: o.renewalDate ?? o.RenewalDate,
        monthlyActiveLearners: o.monthlyActiveLearners ?? o.MonthlyActiveLearners ?? 0,
        seatUtilizationPercent: o.seatUtilizationPercent ?? o.SeatUtilizationPercent ?? 0,
        paymentStatus: o.paymentStatus ?? o.PaymentStatus,
        currency: o.currency ?? o.Currency ?? 'INR',
        blogsIncluded: o.blogsIncluded ?? o.BlogsIncluded ?? 0,
        blogsUsed: o.blogsUsed ?? o.BlogsUsed ?? 0,
        blogsPublished: o.blogsPublished ?? o.BlogsPublished ?? 0,
        blogsPendingReview: o.blogsPendingReview ?? o.BlogsPendingReview ?? 0
      } : {} as any,
      licenseUsage: lu ? {
        ...lu,
        blogsIncluded: lu.blogsIncluded ?? lu.BlogsIncluded ?? raw?.blogUsage?.blogsIncluded ?? raw?.BlogUsage?.BlogsIncluded ?? 0,
        blogsUsed: lu.blogsUsed ?? lu.BlogsUsed ?? raw?.blogUsage?.blogsUsed ?? raw?.BlogUsage?.BlogsUsed ?? 0,
        blogsAvailable: lu.blogsAvailable ?? lu.BlogsAvailable ?? 0,
        blogsBillable: lu.blogsBillable ?? lu.BlogsBillable ?? 0
      } : {},
      blogUsage: this.mapBlogUsage(raw?.blogUsage ?? raw?.BlogUsage),
      blogs: this.mapBlogs(raw?.blogs ?? raw?.Blogs),
      calculation: calc ?? { lineItems: [] },
      addons: raw?.addons ?? raw?.Addons ?? [],
      invoices: raw?.invoices ?? raw?.Invoices ?? [],
      insights: raw?.insights ?? raw?.Insights ?? [],
      usageAnalytics: raw?.usageAnalytics ?? raw?.UsageAnalytics ?? {},
      pendingLicenseChangeRequest: this.mapLicenseRequest(raw?.pendingLicenseChangeRequest ?? raw?.PendingLicenseChangeRequest)
    };
  }

  private mapLicenseRequest(raw: any) {
    if (!raw) return undefined;
    return {
      id: String(raw.id ?? raw.Id ?? ''),
      companyAdminUserId: String(raw.companyAdminUserId ?? raw.CompanyAdminUserId ?? ''),
      companyName: raw.companyName ?? raw.CompanyName,
      subdomain: raw.subdomain ?? raw.Subdomain,
      currentEmployeeSeats: raw.currentEmployeeSeats ?? raw.CurrentEmployeeSeats ?? 0,
      currentTrainerSeats: raw.currentTrainerSeats ?? raw.CurrentTrainerSeats ?? 0,
      currentBlogsIncluded: raw.currentBlogsIncluded ?? raw.CurrentBlogsIncluded ?? 0,
      requestedEmployeeSeats: raw.requestedEmployeeSeats ?? raw.RequestedEmployeeSeats ?? 0,
      requestedTrainerSeats: raw.requestedTrainerSeats ?? raw.RequestedTrainerSeats ?? 0,
      requestedBlogsIncluded: raw.requestedBlogsIncluded ?? raw.RequestedBlogsIncluded ?? 0,
      status: raw.status ?? raw.Status ?? '',
      statusId: raw.statusId ?? raw.StatusId ?? 0,
      reviewNotes: raw.reviewNotes ?? raw.ReviewNotes,
      createdOn: raw.createdOn ?? raw.CreatedOn,
      reviewedOn: raw.reviewedOn ?? raw.ReviewedOn
    };
  }
}
