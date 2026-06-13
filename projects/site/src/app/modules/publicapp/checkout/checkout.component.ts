import { ChangeDetectionStrategy, Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { resolveCourseCheckoutUrl, withQueryString } from 'src/app/core/helpers/course-checkout-url.helper';

/**
 * Legacy route: /checkout/:courseId on the public site.
 * On unified production, Elearn checkout is served at the same path (/checkout/:id).
 * On split dev (site 4200 + elearn 4201), redirects to the elearn origin checkout URL.
 */
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
    const params = new URLSearchParams();
    const ref = q.get('ref');
    const coupon = q.get('coupon') || q.get('code');
    const referral = q.get('referral');
    if (ref) params.set('ref', ref);
    if (coupon) params.set('coupon', coupon);
    if (referral) params.set('referral', referral);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const target = withQueryString(resolveCourseCheckoutUrl(courseId), qs);
    window.location.replace(target);
  }
}
