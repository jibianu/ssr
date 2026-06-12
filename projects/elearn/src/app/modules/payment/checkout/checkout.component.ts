import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { StripePaymentService } from '../../../services/stripe-payment.service';
import { RazorpayPaymentService } from '../../../services/razorpay-payment.service';
import { UtmService } from '../../../services/utm.service';
import { AuthenticationService } from '../../auth/auth.service';
import { resolveCourseId, resolveCourseSlug } from 'src/app/core/helpers/course-id.helper';
import {
  getAbsoluteAppBaseUrlForStripeReturn,
  resolveToAbsoluteAppUrl
} from 'src/app/core/helpers/app-url.helper';
import { CouponApiService } from 'src/app/services/coupon-api.service';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
  standalone: false
})
export class CheckoutComponent implements OnInit, OnDestroy {
  courseId = '';
  data: any;
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  appName = (environment as { certificateBrandName?: string }).certificateBrandName || 'Oil and Gas Club';
  currentYear = new Date().getFullYear();

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  clientSecret: string | null = null;
  amountPaise = 0;
  paymentElementReady = false;
  paying = false;
  loadError: string | null = null;

  /** Display name for greeting (username or email) */
  userName = '';

  /** Optional discount code – applied when proceeding to payment */
  couponCode = '';
  couponApplying = false;
  couponMessage: string | null = null;
  couponValid = false;
  couponDiscountAmount = 0;
  couponFinalAmount: number | null = null;

  /** True while create-order request is in progress */
  creatingIntent = false;

  /** Selected payment gateway: 'stripe' (default) keeps existing behavior; 'razorpay' opens Razorpay Checkout. */
  selectedGateway: 'stripe' | 'razorpay' = 'stripe';

  /** Feature flag: only offer Razorpay when a public key id is configured for this environment. */
  razorpayEnabled = !!(environment as { razorpayKeyId?: string }).razorpayKeyId
    && !(environment as { razorpayKeyId?: string }).razorpayKeyId!.includes('xxxx');

  /** True while a Razorpay order is being created / checkout is opening. */
  razorpayLoading = false;

  private subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private stripePaymentService: StripePaymentService,
    private razorpayPaymentService: RazorpayPaymentService,
    private utmService: UtmService,
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private couponApi: CouponApiService
  ) {
    const id = this.route.snapshot.params['courseId'] ?? this.route.snapshot.params['id'];
    if (id) this.courseId = id;
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userName = user?.username || user?.email || user?.name || '';

    this.subscription.add(
      this.appService.startPurchase(this.courseId).subscribe({
        next: (res) => {
          if (res?.redirectUrl && (res.status === 'already_enrolled' || res.status === 'enrolled')) {
            window.location.href = resolveToAbsoluteAppUrl(res.redirectUrl);
            return;
          }
          if (res?.status === 'payment_required') {
            this.loadCheckoutData();
            return;
          }
          if (res?.status === 'error' || res?.status === 'not_found') {
            this.loadError = 'This course is not available for purchase.';
            this.cdr.detectChanges();
            return;
          }
          this.loadCheckoutData();
        },
        error: () => {
          this.router.navigate(['/login'], { queryParams: { redirect: `/checkout/${this.courseId}` } });
        }
      })
    );
  }

  private loadCheckoutData(): void {
    this.subscription.add(
      this.appService.getCheckout(this.courseId).subscribe(
        (res) => {
          // Only skip checkout when the user is already enrolled (code 0). Other messages = show error.
          if (res?.code === '0' || (res?.message && /already enrolled/i.test(res.message))) {
            this.router.navigate(['app/student/details/curriculum-list/', this.courseId]);
            return;
          }
          if (res?.message) {
            this.loadError = res.message;
            this.cdr.detectChanges();
            return;
          }
          this.data = res;
          this.cdr.detectChanges();
        },
        () => {
          this.router.navigate(['/login'], { queryParams: { redirect: `/checkout/${this.courseId}` } });
        }
      )
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /** Back to course marketing page (handles course.id vs Id from API). */
  get courseMarketingLink(): any[] {
    const cid = resolveCourseId(this.data?.course) || this.courseId;
    return ['/app/student/categories/course', cid];
  }

  /** So iframe loads site slug URL (e.g. /api-570-...) when returning from checkout. */
  get courseMarketingQueryParams(): Record<string, string> {
    const slug = resolveCourseSlug(this.data?.course);
    return slug ? { publicSlug: slug } : {};
  }

  /** Affiliate code for revenue share: UTM store (?ref= / ?aff=), localStorage from marketing site, or checkout URL. */
  private affiliateCodeForOrder(): string | undefined {
    const utm = this.utmService.getStoredUtm();
    if (utm.affiliateCode?.trim()) return utm.affiliateCode.trim();
    try {
      const ls = typeof localStorage !== 'undefined' ? localStorage.getItem('affiliate_ref') : null;
      if (ls?.trim()) return ls.trim();
    } catch {
      /* ignore */
    }
    const ref = this.route.snapshot.queryParamMap.get('ref')?.trim();
    if (ref) return ref;
    return this.route.snapshot.queryParamMap.get('aff')?.trim() || undefined;
  }

  get displayCourseFee(): number {
    return Number(this.data?.course?.discountedPrice ?? this.data?.course?.price ?? 0);
  }

  get displayPayableAmount(): number {
    return this.couponFinalAmount != null ? this.couponFinalAmount : this.displayCourseFee;
  }

  /** Strikethrough price in cart when a sale and/or coupon reduces the payable amount. */
  get cartStrikePrice(): number | null {
    const list = Number(this.data?.course?.price ?? 0);
    const payable = this.displayPayableAmount;
    if (this.couponValid && payable < this.displayCourseFee) {
      return this.displayCourseFee;
    }
    if (list > 0 && list !== Number(this.data?.course?.discountedPrice ?? list)) {
      return list;
    }
    return null;
  }

  /** Price shown as the current charge in cart and summaries. */
  get cartCurrentPrice(): number {
    return this.displayPayableAmount;
  }

  /** Course-level markdown (list → sale price), excluding promo coupon. */
  get courseSaleDiscountAmount(): number {
    const list = Number(this.data?.course?.price ?? 0);
    const sale = Number(this.data?.course?.discountedPrice ?? list);
    return list > sale ? list - sale : 0;
  }

  /** Amount sent to create-order: base course price; coupon is applied server-side. */
  get orderAmountPaise(): number {
    return Math.round(this.displayCourseFee * 100);
  }

  applyCoupon(): void {
    const code = this.couponCode?.trim();
    if (!code || !this.courseId) return;
    this.couponApplying = true;
    this.couponMessage = null;
    this.couponValid = false;
    this.couponApi.validateCoupon({
      couponCode: code,
      referenceId: this.courseId,
      referenceType: 'Course',
      amount: this.displayCourseFee
    }).subscribe({
      next: (res) => {
        this.couponApplying = false;
        this.couponValid = !!res.isValid;
        this.couponMessage = res.message;
        this.couponDiscountAmount = Number(res.discountAmount ?? 0);
        this.couponFinalAmount = res.isValid ? Number(res.finalAmount) : null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.couponApplying = false;
        this.couponValid = false;
        this.couponFinalAmount = null;
        this.couponMessage = err?.error?.message ?? 'Could not validate coupon.';
        this.cdr.detectChanges();
      }
    });
  }

  /** Build the shared create-order options (coupon + UTM/affiliate) used by both gateways. */
  private buildOrderOptions(): Record<string, string | undefined> {
    const user = this.authService.currentUser();
    const utm = this.utmService.getStoredUtm();
    return {
      userId: user?.userId ?? user?.id ?? undefined,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      campaignCode: utm.campaignCode,
      affiliateCode: this.affiliateCodeForOrder() ?? utm.affiliateCode,
      couponCode: this.couponCode?.trim() || undefined
    };
  }

  /** Dispatch to the selected gateway when the user clicks "Proceed to payment". */
  proceedToPayment(): void {
    const code = this.couponCode?.trim();
    if (code && !this.couponValid) {
      this.loadError = 'Please apply a valid coupon code before proceeding, or clear the coupon field.';
      this.cdr.detectChanges();
      return;
    }
    if (this.selectedGateway === 'razorpay') {
      this.payWithRazorpay();
    } else {
      this.createIntentAndMountPayment();
    }
  }

  /** Razorpay path: create order on backend, open Checkout, verify on success, then go to course. */
  async payWithRazorpay(): Promise<void> {
    if (this.data?.course?.discountedPrice == null) return;
    this.amountPaise = this.orderAmountPaise;
    this.razorpayLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    const options = this.buildOrderOptions();
    this.subscription.add(
      this.razorpayPaymentService.createOrder(this.amountPaise, this.courseId, options).subscribe({
        next: async (res) => {
          // Already enrolled / free after discounts: go straight to the course.
          if (res?.alreadyEnrolled || res?.enrolledFree) {
            this.razorpayLoading = false;
            this.router.navigate(['/app/student/details/curriculum-list', this.courseId]);
            return;
          }

          const ready = await this.razorpayPaymentService.loadCheckoutScript();
          if (!ready || !window.Razorpay) {
            this.razorpayLoading = false;
            this.loadError = 'Could not load Razorpay Checkout. Please try again.';
            this.cdr.detectChanges();
            return;
          }
          this.openRazorpayCheckout(res);
        },
        error: (err) => {
          this.razorpayLoading = false;
          const msg = err?.error?.error ?? err?.error?.message ?? err?.message;
          this.loadError = msg || 'Failed to initialize Razorpay payment.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  /**
   * Razorpay's modal is an HTTPS iframe, so the logo must be a PUBLIC, HTTPS URL.
   * A localhost/http image is blocked (mixed content) and unreachable by Razorpay, so we
   * never use the local origin here — prefer a configured absolute logo, else the public site logo.
   */
  private razorpayLogoUrl(): string {
    const configured = (environment as { logoUrl?: string }).logoUrl;
    if (configured && /^https:\/\//i.test(configured)) return configured;
    return 'https://oilandgasclub.com/assets/img/oilandgas_club.svg';
  }

  private openRazorpayCheckout(res: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    courseTitle?: string;
  }): void {
    const user = this.authService.currentUser();
    const checkout = new window.Razorpay!({
      key: res.keyId,
      amount: res.amount,
      currency: res.currency,
      // Empty name → Razorpay shows only the logo image (no business-name text) in the modal header.
      name: '',
      description: res.courseTitle || this.data?.course?.title || 'Course purchase',
      image: this.razorpayLogoUrl(),
      order_id: res.orderId,
      prefill: {
        name: user?.name || user?.username || '',
        email: user?.email || ''
      },
      theme: { color: '#f57722' },
      handler: (response: unknown) => {
        const r = response as { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
        this.razorpayLoading = true;
        this.cdr.detectChanges();
        this.subscription.add(
          this.razorpayPaymentService
            .verify({
              razorpayOrderId: r.razorpay_order_id,
              razorpayPaymentId: r.razorpay_payment_id,
              razorpaySignature: r.razorpay_signature,
              courseId: this.courseId
            })
            .subscribe({
              next: () => this.router.navigateByUrl(`/app/payment/success?entityId=${this.courseId}`),
              error: () => {
                this.razorpayLoading = false;
                this.loadError = 'Payment verification failed. If you were charged, contact support.';
                this.cdr.detectChanges();
              }
            })
        );
      },
      modal: {
        ondismiss: () => {
          this.razorpayLoading = false;
          this.subscription.add(this.razorpayPaymentService.cancel(res.orderId, this.courseId).subscribe({ next: () => {}, error: () => {} }));
          this.cdr.detectChanges();
        }
      }
    });

    checkout.on('payment.failed', (resp: unknown) => {
      const e = resp as { error?: { description?: string } };
      this.razorpayLoading = false;
      this.loadError = e?.error?.description || 'Payment failed. Please try again.';
      this.cdr.detectChanges();
    });

    this.razorpayLoading = false;
    this.cdr.detectChanges();
    checkout.open();
  }

  /** Call this when user clicks "Proceed to payment" so optional coupon is included. */
  createIntentAndMountPayment(): void {
    if (this.data?.course?.discountedPrice == null) return;
    this.amountPaise = this.orderAmountPaise;
    const user = this.authService.currentUser();
    const utm = this.utmService.getStoredUtm();
    const options = {
      userId: user?.userId ?? user?.id ?? undefined,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      campaignCode: utm.campaignCode,
      affiliateCode: this.affiliateCodeForOrder() ?? utm.affiliateCode,
      couponCode: this.couponCode?.trim() || undefined
    };
    this.creatingIntent = true;
    this.loadError = null;
    this.cdr.detectChanges();
    this.subscription.add(
      this.stripePaymentService.createOrder(this.amountPaise, this.courseId, options).subscribe({
        next: (res) => {
          this.creatingIntent = false;
          if (res?.enrolledFree) {
            this.router.navigate(['/app/student/details/curriculum-list', this.courseId]);
            return;
          }
          this.clientSecret = res.clientSecret;
          if (res.paymentIntentId) {
            sessionStorage.setItem('paymentIntentId_' + this.courseId, res.paymentIntentId);
          }
          this.cdr.detectChanges();
          this.initStripe();
        },
        error: (err) => {
          this.creatingIntent = false;
          const msg = err?.error?.message ?? err?.error?.error ?? err?.message;
          this.loadError = msg || 'Failed to initialize payment.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  /** Return URL for payment success – must include SPA mount path (e.g. /course) on unified domain. */
  private getReturnUrl(): string {
    if (typeof window !== 'undefined') {
      return `${getAbsoluteAppBaseUrlForStripeReturn()}/app/payment/success?entityId=${this.courseId}`;
    }
    const fallback = ((environment as { seoUrl?: string }).seoUrl || '').replace(/\/$/, '');
    return `${fallback}/app/payment/success?entityId=${this.courseId}`;
  }

  private async initStripe(): Promise<void> {
    if (!this.clientSecret || !environment.stripeKey) return;
    try {
      const stripe = await loadStripe(environment.stripeKey);
      if (!stripe) {
        this.loadError = 'Stripe failed to load.';
        return;
      }
      this.stripe = stripe;
      this.elements = stripe.elements({
        clientSecret: this.clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#f57722' } }
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      // Payment Element – shows cards, UPI (Google Pay, PhonePe, Paytm apps).
      // UPI: user enters UPI ID and Stripe triggers collect request to their UPI app.
      const paymentElement = this.elements.create('payment' as any, {
        layout: 'tabs',
        defaultCollapsed: false,
        radios: true,
        spacing: 'tight'
      } as any);

      paymentElement.on('ready', () => {
        this.paymentElementReady = true;
        this.cdr.detectChanges();
      });

      await paymentElement.mount('#payment-element');
    } catch (e) {
      this.loadError = (e as Error)?.message || 'Failed to load payment form.';
      this.cdr.detectChanges();
    }
  }

  async payNow(): Promise<void> {
    if (!this.stripe || !this.clientSecret || !this.elements) return;
    this.paying = true;
    this.loadError = null;

    const successUrl =
      typeof window !== 'undefined'
        ? `${getAbsoluteAppBaseUrlForStripeReturn()}/app/payment/success?entityId=${this.courseId}`
        : `${((environment as { seoUrl?: string }).seoUrl || '').replace(/\/$/, '')}/app/payment/success?entityId=${this.courseId}`;

    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: successUrl,
        receipt_email: this.authService.currentUser()?.email || undefined
      }
    });

    this.paying = false;
    if (error) {
      this.loadError = error.message || 'Payment could not be completed.';
    } else {
      this.router.navigateByUrl(`/app/payment/success?entityId=${this.courseId}`);
    }
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoFallback']) {
      (img as any).dataset['logoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }
}
