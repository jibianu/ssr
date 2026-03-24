import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { StripePaymentService } from '../../../services/stripe-payment.service';
import { UtmService } from '../../../services/utm.service';
import { AuthenticationService } from '../../auth/auth.service';
import { resolveCourseId, resolveCourseSlug } from 'src/app/core/helpers/course-id.helper';

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

  /** Optional discount code from instructor (trainer) – applied when proceeding to payment */
  couponCode = '';

  /** True while create-order request is in progress */
  creatingIntent = false;

  private subscription = new Subscription();

  constructor(
    private appService: AdminAppService,
    private stripePaymentService: StripePaymentService,
    private utmService: UtmService,
    private authService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
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
            window.location.href = res.redirectUrl.startsWith('http') ? res.redirectUrl : (window.location.origin + res.redirectUrl);
            return;
          }
          if (res?.status === 'payment_required') {
            this.loadCheckoutData();
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
          if (res?.message) {
            this.router.navigate(['app/student/details/curriculum-list/', this.courseId]);
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

  /** Call this when user clicks "Proceed to payment" so optional coupon is included. */
  createIntentAndMountPayment(): void {
    if (this.data?.course?.discountedPrice == null) return;
    this.amountPaise = Math.round(Number(this.data.course.discountedPrice) * 100);
    const user = this.authService.currentUser();
    const utm = this.utmService.getStoredUtm();
    const options = {
      userId: user?.userId ?? user?.id ?? undefined,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      campaignCode: utm.campaignCode,
      affiliateCode: utm.affiliateCode,
      couponCode: this.couponCode?.trim() || undefined
    };
    this.creatingIntent = true;
    this.loadError = null;
    this.cdr.detectChanges();
    this.subscription.add(
      this.stripePaymentService.createOrder(this.amountPaise, this.courseId, options).subscribe({
        next: (res) => {
          this.creatingIntent = false;
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

  /** Return URL for payment success – use current origin so user stays on same host. */
  private getReturnUrl(): string {
    const base = (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin
      : ((environment as { seoUrl?: string }).seoUrl || '').replace(/\/$/, '');
    return `${base.replace(/\/$/, '')}/app/payment/success?entityId=${this.courseId}`;
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

    const base = (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin.replace(/\/$/, '')
      : ((environment as { seoUrl?: string }).seoUrl || '').replace(/\/$/, '');
    const successUrl = `${base}/app/payment/success?entityId=${this.courseId}`;

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
