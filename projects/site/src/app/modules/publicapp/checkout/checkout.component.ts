import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PublicAppService } from '../publicapp.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckoutComponent implements OnInit {
  courseId = '';
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private publicApp: PublicAppService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    const courseId = this.route.snapshot.paramMap.get('courseId') || '';
    this.courseId = courseId;
    if (!courseId) {
      this.loading = false;
      this.error = 'Course not found.';
      return;
    }
    if (!isPlatformBrowser(this.platformId)) {
      this.loading = false;
      return;
    }
    const q = this.route.snapshot.queryParamMap;
    const couponCode = q.get('coupon') || q.get('code') || '';
    const affiliateRef = q.get('ref') || '';
    const referralCode = q.get('referral') || '';
    const options = (couponCode || affiliateRef || referralCode)
      ? { couponCode: couponCode || undefined, referralCode: referralCode || undefined, affiliateRef: affiliateRef || undefined }
      : undefined;
    this.publicApp.createPaymentSessionByCourseId(courseId, options).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.paymentUrl) {
          window.location.href = res.paymentUrl;
        } else {
          this.error = 'Unable to start checkout. Course may be unavailable or you may already be enrolled.';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to start checkout. Please try again.';
      }
    });
  }
}
