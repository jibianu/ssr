import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CouponAnalyticsDto, CouponApiService, CouponDto } from 'src/app/services/coupon-api.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-coupon-list',
  templateUrl: './coupon-list.component.html',
  styleUrls: ['./coupon-list.component.scss'],
  standalone: false
})
export class CouponListComponent implements OnInit {
  coupons: CouponDto[] = [];
  analytics: CouponAnalyticsDto | null = null;
  loading = false;
  pageNumber = 1;
  pageSize = 20;
  total = 0;
  filterCode = '';
  filterStatus: '' | 'true' | 'false' = '';
  filterEventId = '';
  filterCourseId = '';

  constructor(
    private couponApi: CouponApiService,
    private toaster: ToasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
    this.fetch();
  }

  loadAnalytics(): void {
    this.couponApi.getAnalytics().subscribe({
      next: (a) => this.analytics = a,
      error: () => {}
    });
  }

  fetch(): void {
    this.loading = true;
    const params: Record<string, string | number> = {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize
    };
    if (this.filterCode.trim()) params.couponCode = this.filterCode.trim();
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterEventId.trim()) params.eventId = this.filterEventId.trim();
    if (this.filterCourseId.trim()) params.courseId = this.filterCourseId.trim();

    this.couponApi.getCoupons(params).subscribe({
      next: (res) => {
        this.coupons = (res?.results ?? []).map((c: any) => this.normalize(c));
        this.total = res?.totalNumberOfRecords ?? 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toaster.showError('Failed to load coupons.');
      }
    });
  }

  private normalize(c: any): CouponDto {
    return {
      id: c.id ?? c.Id,
      couponCode: c.couponCode ?? c.CouponCode,
      couponName: c.couponName ?? c.CouponName,
      couponType: c.couponType ?? c.CouponType,
      discountValue: Number(c.discountValue ?? c.DiscountValue ?? 0),
      minimumPurchaseAmount: Number(c.minimumPurchaseAmount ?? c.MinimumPurchaseAmount ?? 0),
      startDate: c.startDate ?? c.StartDate,
      endDate: c.endDate ?? c.EndDate,
      usageLimit: Number(c.usageLimit ?? c.UsageLimit ?? 0),
      usedCount: Number(c.usedCount ?? c.UsedCount ?? 0),
      status: !!(c.status ?? c.Status),
      applicableType: c.applicableType ?? c.ApplicableType ?? 'Both',
      eventNames: (c.eventNames ?? c.EventNames ?? []).map((x: any) => String(x)),
      courseNames: (c.courseNames ?? c.CourseNames ?? []).map((x: any) => String(x))
    };
  }

  formatApplicableTo(coupon: CouponDto): string {
    const names = [...(coupon.eventNames ?? []), ...(coupon.courseNames ?? [])];
    return names.length ? names.join(', ') : '—';
  }

  onSearch(): void {
    this.pageNumber = 1;
    this.fetch();
  }

  onPageChange(delta: number): void {
    const next = this.pageNumber + delta;
    if (next < 1 || (next - 1) * this.pageSize >= this.total) return;
    this.pageNumber = next;
    this.fetch();
  }

  createCoupon(): void {
    this.router.navigate(['/app/admin/coupons/create']);
  }

  editCoupon(id: string): void {
    this.router.navigate(['/app/admin/coupons/edit', id]);
  }

  viewUsage(id?: string): void {
    if (id) {
      this.router.navigate(['/app/admin/coupons/usage', id]);
    } else {
      this.router.navigate(['/app/admin/coupons/usage']);
    }
  }

  toggleStatus(coupon: CouponDto): void {
    this.couponApi.setCouponStatus(coupon.id, !coupon.status).subscribe({
      next: () => {
        coupon.status = !coupon.status;
        this.toaster.showSuccess(coupon.status ? 'Coupon activated.' : 'Coupon deactivated.');
        this.loadAnalytics();
      },
      error: () => this.toaster.showError('Failed to update coupon status.')
    });
  }

  deleteCoupon(coupon: CouponDto): void {
    if (!confirm(`Delete coupon "${coupon.couponCode}"?`)) return;
    this.couponApi.deleteCoupon(coupon.id).subscribe({
      next: () => {
        this.toaster.showSuccess('Coupon deleted.');
        this.fetch();
        this.loadAnalytics();
      },
      error: (err) => {
        const body = err?.error;
        const msg = typeof body === 'string' ? body : body?.message;
        this.toaster.showError(msg || 'Failed to delete coupon.');
      }
    });
  }

  formatDiscount(coupon: CouponDto): string {
    if ((coupon.couponType || '').toLowerCase().includes('fixed')) {
      return `₹${coupon.discountValue}`;
    }
    return `${coupon.discountValue}%`;
  }
}
