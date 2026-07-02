import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  StudentDashboardApiService,
  StudentPurchaseHistoryItem,
  StudentPurchaseHistoryResponse,
} from '../../modules/student/student-dashboard-api.service';
import { CommonPaginationComponent } from '../../shared/component/common-pagination/common-pagination.component';
import { StudentBreadcrumbService } from '../../core/services/student-breadcrumb.service';
import { AuthenticationService } from '../../modules/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-purchase-history',
  standalone: true,
  imports: [CommonModule, RouterModule, CommonPaginationComponent],
  templateUrl: './purchase-history.component.html',
  styleUrls: ['./purchase-history.component.scss'],
})
export class PurchaseHistoryComponent implements OnInit {
  loading = true;
  items: StudentPurchaseHistoryItem[] = [];
  totalCount = 0;
  page = 1;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 20, 25, 50];
  readonly skeletonRows = [1, 2, 3, 4, 5];
  selectedItem: StudentPurchaseHistoryItem | null = null;
  showReceiptModal = false;
  showInvoiceModal = false;
  readonly companyLegalName = 'OILANDGASCLUB EDUTECH (OPC) PRIVATE LIMITED';
  readonly companyCin = 'U85500TN2025OPC185436';
  readonly companyTan = 'CHEO07226C';
  readonly companyGst = '33AAECO9137B1ZP';
  readonly refundPolicyUrl = 'https://www.oilandgasclub.com/refund-cancellation-policy';
  readonly sellerWebsite = 'https://www.oilandgasclub.com/';
  readonly companyLogoUrl =
    (environment as { logoUrl?: string }).logoUrl || 'assets/img/oilandgas_club.svg';

  constructor(
    private api: StudentDashboardApiService,
    private studentBreadcrumb: StudentBreadcrumbService,
    private auth: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.studentBreadcrumb.setBreadcrumb([{ label: 'Purchase History' }]);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api.getPurchaseHistory(this.page, this.pageSize).subscribe({
      next: (res: StudentPurchaseHistoryResponse) => {
        this.items = res.items || [];
        this.totalCount = res.totalCount || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  onPageChange(page: number): void {
    this.page = page;
    this.load();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page = 1;
    this.load();
  }

  trackByItem(_index: number, item: StudentPurchaseHistoryItem): string {
    const type = (item.itemType || 'Course').toLowerCase();
    if (type === 'event' && item.eventId) return 'event-' + item.eventId + '-' + item.enrollmentId;
    if (type === 'membership' && item.membershipSubscriptionId) return 'membership-' + item.membershipSubscriptionId;
    if (type === 'membership' && item.enrollmentId) return 'membership-' + item.enrollmentId;
    return item.enrollmentId || item.courseId || '';
  }

  itemTitle(item: StudentPurchaseHistoryItem): string {
    const type = (item.itemType || 'Course').toLowerCase();
    if (type === 'event') return item.eventTitle || 'Event';
    if (type === 'membership') return item.membershipPlanName ? `${item.membershipPlanName} Membership` : (item.courseTitle || 'Membership');
    return item.courseTitle || '—';
  }

  itemIconClass(item: StudentPurchaseHistoryItem): string {
    const type = (item.itemType || 'Course').toLowerCase();
    if (type === 'event') return 'fa fa-calendar-check-o purchase-history__cart-icon';
    if (type === 'membership') return 'fa fa-id-card purchase-history__cart-icon';
    return 'fa fa-shopping-cart purchase-history__cart-icon';
  }

  isMembershipItem(item: StudentPurchaseHistoryItem): boolean {
    return (item.itemType || '').toLowerCase() === 'membership';
  }

  isEventItem(item: StudentPurchaseHistoryItem): boolean {
    return (item.itemType || '').toLowerCase() === 'event';
  }

  isCouponPurchase(item: StudentPurchaseHistoryItem): boolean {
    return !!(item.couponCode?.trim()) || (item.totalPrice === 0 && (item.paymentTypeName || '').toLowerCase().includes('coupon'));
  }

  paymentTypeLabel(item: StudentPurchaseHistoryItem): string {
    const code = item.couponCode?.trim();
    if (code) {
      return `${item.paymentTypeName || 'Coupon'} · ${code}`;
    }
    return item.paymentTypeName || '—';
  }

  priceDisplay(item: StudentPurchaseHistoryItem): string {
    if (item.totalPrice != null && item.totalPrice > 0) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(item.totalPrice);
    }
    return 'Free';
  }

  get buyerName(): string {
    const u = this.auth.currentUser();
    if (!u) return '—';
    const fn = u.firstName || u.FirstName || '';
    const ln = u.lastName || u.LastName || '';
    return [fn, ln].filter(Boolean).join(' ').trim() || u.userName || u.email || '—';
  }

  get buyerEmail(): string {
    const u = this.auth.currentUser();
    return u?.email || u?.Email || '—';
  }

  openReceipt(item: StudentPurchaseHistoryItem): void {
    this.selectedItem = item;
    this.showReceiptModal = true;
    this.showInvoiceModal = false;
  }

  openInvoice(item: StudentPurchaseHistoryItem): void {
    this.selectedItem = item;
    this.showInvoiceModal = true;
    this.showReceiptModal = false;
  }

  closeReceipt(): void {
    this.showReceiptModal = false;
    this.selectedItem = null;
  }

  closeInvoice(): void {
    this.showInvoiceModal = false;
    this.selectedItem = null;
  }

  /** For receipt: subtotal before tax (if 18% tax then total/1.18). */
  receiptSubtotal(item: StudentPurchaseHistoryItem): number {
    const total = item.totalPrice ?? 0;
    if (total <= 0) return 0;
    return Math.round((total / 1.18) * 100) / 100;
  }

  receiptTax(item: StudentPurchaseHistoryItem): number {
    const total = item.totalPrice ?? 0;
    if (total <= 0) return 0;
    return Math.round((total - this.receiptSubtotal(item)) * 100) / 100;
  }

  /** Invoice taxable value and IGST (18%) like reference. */
  invoiceTaxableValue(item: StudentPurchaseHistoryItem): number {
    return this.receiptSubtotal(item);
  }

  invoiceIgst(item: StudentPurchaseHistoryItem): number {
    return this.receiptTax(item);
  }

  onCompanyLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    if (!img.src.includes('assets/img/oilandgas_club.svg')) {
      img.src = 'assets/img/oilandgas_club.svg';
      return;
    }
    if (!img.src.includes('assets/s3/oilandgas_club.svg')) {
      img.src = 'assets/s3/oilandgas_club.svg';
    }
  }
}
