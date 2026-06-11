import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CouponApiService, CouponUsageDto } from 'src/app/services/coupon-api.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-coupon-usage',
  templateUrl: './coupon-usage.component.html',
  styleUrls: ['./coupon-usage.component.scss'],
  standalone: false
})
export class CouponUsageComponent implements OnInit {
  usages: CouponUsageDto[] = [];
  couponId: string | null = null;
  loading = false;

  constructor(
    private couponApi: CouponApiService,
    private route: ActivatedRoute,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.couponId = this.route.snapshot.paramMap.get('couponId');
    this.fetch();
  }

  fetch(): void {
    this.loading = true;
    this.couponApi.getUsageHistory(this.couponId ?? undefined).subscribe({
      next: (list) => {
        this.usages = (list || []).map((u: any) => ({
          id: u.id ?? u.Id,
          couponCode: u.couponCode ?? u.CouponCode,
          userName: u.userName ?? u.UserName,
          userEmail: u.userEmail ?? u.UserEmail,
          orderId: u.orderId ?? u.OrderId,
          originalAmount: Number(u.originalAmount ?? u.OriginalAmount ?? 0),
          discountAmount: Number(u.discountAmount ?? u.DiscountAmount ?? 0),
          finalAmount: Number(u.finalAmount ?? u.FinalAmount ?? 0),
          usedDate: u.usedDate ?? u.UsedDate
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toaster.showError('Failed to load usage history.');
      }
    });
  }
}
