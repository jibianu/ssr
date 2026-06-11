import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../../auth/auth.service';
import { StudentDashboardApiService } from '../../student/student-dashboard-api.service';
import { RazorpayPaymentService } from '../../../services/razorpay-payment.service';
import { getAbsoluteAppBaseUrlForStripeReturn } from 'src/app/core/helpers/app-url.helper';
import { CouponApiService } from 'src/app/services/coupon-api.service';

@Component({
  selector: 'app-event-checkout',
  templateUrl: './event-checkout.component.html',
  styleUrls: ['./event-checkout.component.scss'],
  standalone: false
})
export class EventCheckoutComponent implements OnInit, OnDestroy {
  eventId = '';
  event: any = null;
  loading = true;
  loadError: string | null = null;
  creatingSession = false;
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  appName = (environment as { certificateBrandName?: string }).certificateBrandName || 'Oil and Gas Club';
  currentYear = new Date().getFullYear();
  userName = '';

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  clientSecret: string | null = null;
  paymentElementReady = false;
  paying = false;
  creatingIntent = false;

  /** Selected payment gateway: 'stripe' (default) or 'razorpay'. */
  selectedGateway: 'stripe' | 'razorpay' = 'stripe';

  razorpayEnabled = !!(environment as { razorpayKeyId?: string }).razorpayKeyId
    && !(environment as { razorpayKeyId?: string }).razorpayKeyId!.includes('xxxx');

  razorpayLoading = false;

  couponCode = '';
  couponApplying = false;
  couponMessage: string | null = null;
  couponValid = false;
  couponDiscountAmount = 0;
  couponFinalAmount: number | null = null;

  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentApi: StudentDashboardApiService,
    private razorpayPaymentService: RazorpayPaymentService,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef,
    private couponApi: CouponApiService
  ) {
    const id = this.route.snapshot.paramMap.get('eventId');
    if (id) this.eventId = id;
  }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userName = user?.username || user?.email || user?.name || '';

    if (!this.eventId) {
      this.loadError = 'Event not found.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.subscription.add(
      this.studentApi.getEventById(this.eventId).subscribe({
        next: (e) => {
          this.event = this.normalizeEvent(e);
          this.loading = false;
          this.loadError = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = 'Event not found or not available.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  private normalizeEvent(e: any): any {
    if (!e) return e;
    const amount = e.amount ?? e.Amount ?? 0;
    return {
      id: e.id ?? e.Id,
      title: e.title ?? e.Title,
      amount: Number(amount),
      finalAmount: Number(amount),
      isFree: !amount || amount === 0
    };
  }

  get displayPayableAmount(): number {
    return this.couponFinalAmount != null ? this.couponFinalAmount : (this.event?.finalAmount ?? this.event?.amount ?? 0);
  }

  applyCoupon(): void {
    const code = this.couponCode?.trim();
    if (!code || !this.eventId || !this.event) return;
    this.couponApplying = true;
    this.couponMessage = null;
    this.couponValid = false;
    this.couponApi.validateCoupon({
      couponCode: code,
      referenceId: this.eventId,
      referenceType: 'Event',
      amount: this.event.amount
    }).subscribe({
      next: (res) => {
        this.couponApplying = false;
        this.applyCouponResult(res);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.couponApplying = false;
        this.couponValid = false;
        this.couponFinalAmount = null;
        this.couponMessage = this.extractApiError(err, 'Could not validate coupon.');
        this.cdr.detectChanges();
      }
    });
  }

  private applyCouponAsync(): Promise<boolean> {
    const code = this.couponCode?.trim();
    if (!code || !this.eventId || !this.event) return Promise.resolve(true);
    if (this.couponValid) return Promise.resolve(true);

    this.couponApplying = true;
    this.couponMessage = null;
    this.couponValid = false;
    return new Promise((resolve) => {
      this.couponApi.validateCoupon({
        couponCode: code,
        referenceId: this.eventId,
        referenceType: 'Event',
        amount: this.event.amount
      }).subscribe({
        next: (res) => {
          this.couponApplying = false;
          this.applyCouponResult(res);
          this.cdr.detectChanges();
          resolve(!!res.isValid);
        },
        error: (err) => {
          this.couponApplying = false;
          this.couponValid = false;
          this.couponFinalAmount = null;
          this.couponMessage = this.extractApiError(err, 'Could not validate coupon.');
          this.cdr.detectChanges();
          resolve(false);
        }
      });
    });
  }

  private applyCouponResult(res: { isValid?: boolean; message?: string; discountAmount?: number; finalAmount?: number }): void {
    this.couponValid = !!res.isValid;
    this.couponMessage = res.message ?? null;
    this.couponDiscountAmount = Number(res.discountAmount ?? 0);
    this.couponFinalAmount = res.isValid ? Number(res.finalAmount) : null;
    if (res.isValid && this.event) {
      this.event.finalAmount = this.couponFinalAmount;
    }
  }

  private syncAmountsFromOrder(res: {
    originalAmountRupees?: number;
    discountAmountRupees?: number;
    finalAmountRupees?: number;
    appliedDiscounts?: string[];
  }): void {
    const original = Number(res.originalAmountRupees ?? this.event?.amount ?? 0);
    const discount = Number(res.discountAmountRupees ?? 0);
    const final = Number(res.finalAmountRupees ?? (original - discount));
    if (discount > 0 && this.event) {
      this.couponValid = true;
      this.couponDiscountAmount = discount;
      this.couponFinalAmount = final;
      this.event.finalAmount = final;
      if (res.appliedDiscounts?.length) {
        this.couponMessage = res.appliedDiscounts[0];
      }
    }
  }

  private extractApiError(err: any, fallback: string): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (body?.error) return String(body.error);
    return fallback;
  }

  get displayPrice(): string {
    if (!this.event) return '';
    if (this.event.isFree) return 'Free';
    const amt = this.event.finalAmount ?? this.event.amount;
    return amt ? '₹' + Number(amt).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' onwards' : '';
  }

  get hasDiscount(): boolean {
    return this.couponValid && this.couponDiscountAmount > 0;
  }

  get amountPaise(): number {
    if (!this.event || this.event.isFree) return 0;
    return Math.round(this.displayPayableAmount * 100);
  }

  goToEventDetail(): void {
    if (this.event?.id) {
      this.router.navigate(['/app/student/events/event', this.event.id]);
    } else {
      this.router.navigate(['/app/student/events']);
    }
  }

  /** Dispatch to Stripe or Razorpay when user clicks "Proceed to payment". */
  async proceedToPayment(): Promise<void> {
    if (!this.eventId || !this.event || this.event.isFree) return;
    if (this.couponCode?.trim()) {
      const ok = await this.applyCouponAsync();
      if (!ok) {
        this.loadError = this.couponMessage || 'Coupon could not be applied. Fix the coupon or remove the code.';
        this.cdr.detectChanges();
        return;
      }
    }
    this.loadError = null;
    if (this.selectedGateway === 'razorpay') {
      this.payWithRazorpay();
    } else {
      this.proceedToStripePayment();
    }
  }

  /** Stripe: create PaymentIntent and mount Payment Element. */
  proceedToStripePayment(): void {
    this.creatingIntent = true;
    this.loadError = null;
    this.cdr.detectChanges();
    this.subscription.add(
      this.studentApi.createEventPaymentIntent(this.eventId, this.couponCode?.trim() || undefined).subscribe({
        next: (res) => {
          this.creatingIntent = false;
          const secret = res?.clientSecret ?? (res as any)?.ClientSecret;
          const intentId = res?.paymentIntentId ?? (res as any)?.PaymentIntentId;
          if (secret && intentId) {
            this.clientSecret = secret;
            sessionStorage.setItem('paymentIntentId_' + this.eventId, intentId);
            this.cdr.detectChanges();
            this.initStripe();
          } else {
            this.loadError = 'Could not start payment. Please try again.';
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          this.creatingIntent = false;
          const msg = err?.error?.message ?? err?.error?.error ?? err?.message ?? 'Payment could not be started.';
          this.loadError = msg;
          this.cdr.detectChanges();
        }
      })
    );
  }

  /** Razorpay: create order on backend, open Checkout, verify on success, then redirect. */
  async payWithRazorpay(): Promise<void> {
    if (!this.event || this.event.isFree) return;
    this.razorpayLoading = true;
    this.loadError = null;
    this.cdr.detectChanges();

    const user = this.authService.currentUser();
    this.subscription.add(
      this.razorpayPaymentService
        .createOrder(this.amountPaise, '', {
          eventId: this.eventId,
          userId: user?.userId ?? user?.id,
          couponCode: this.couponCode?.trim() || undefined
        })
        .subscribe({
          next: async (res) => {
            if (res?.alreadyEnrolled || res?.enrolledFree) {
              this.razorpayLoading = false;
              this.router.navigate(['/app/student/events/event', this.eventId], { queryParams: { registered: 'true' } });
              return;
            }

            this.syncAmountsFromOrder(res);
            this.cdr.detectChanges();

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
      name: '',
      description: res.courseTitle || this.event?.title || 'Event registration',
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
              eventId: this.eventId
            })
            .subscribe({
              next: () =>
                this.router.navigateByUrl(`/app/payment/success?entityId=${this.eventId}&entityType=event`),
              error: (err) => {
                this.razorpayLoading = false;
                const reason = err?.error?.reason;
                this.loadError = reason
                  ? `Payment verification failed (${reason}). If you were charged, contact support.`
                  : 'Payment verification failed. If you were charged, contact support.';
                this.cdr.detectChanges();
              }
            })
        );
      },
      modal: {
        ondismiss: () => {
          this.razorpayLoading = false;
          this.subscription.add(
            this.razorpayPaymentService.cancel(res.orderId, this.eventId, 'event').subscribe({ next: () => {}, error: () => {} })
          );
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

  private getEventSuccessUrl(): string {
    const base =
      typeof window !== 'undefined'
        ? getAbsoluteAppBaseUrlForStripeReturn()
        : ((environment as { seoUrl?: string }).seoUrl || '').replace(/\/$/, '');
    return `${base}/app/payment/success?entityId=${this.eventId}&entityType=event`;
  }

  private async initStripe(): Promise<void> {
    if (!this.clientSecret || !environment.stripeKey) return;
    try {
      const stripe = await loadStripe(environment.stripeKey);
      if (!stripe) {
        this.loadError = 'Stripe failed to load.';
        this.cdr.detectChanges();
        return;
      }
      this.stripe = stripe;
      this.elements = stripe.elements({
        clientSecret: this.clientSecret,
        appearance: { theme: 'stripe', variables: { colorPrimary: '#f57722' } }
      });
      await new Promise<void>((r) => setTimeout(r, 50));
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
      await paymentElement.mount('#event-payment-element');
    } catch (e) {
      this.loadError = (e as Error)?.message || 'Failed to load payment form.';
      this.cdr.detectChanges();
    }
  }

  async payNow(): Promise<void> {
    if (!this.stripe || !this.clientSecret || !this.elements) return;
    this.paying = true;
    this.loadError = null;
    this.cdr.detectChanges();
    const successUrl = this.getEventSuccessUrl();
    const { error } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: successUrl,
        receipt_email: this.authService.currentUser()?.email || undefined
      }
    });
    this.paying = false;
    this.cdr.detectChanges();
    if (error) {
      this.loadError = error.message || 'Payment could not be completed.';
    } else {
      this.router.navigateByUrl(`/app/payment/success?entityId=${this.eventId}&entityType=event`);
    }
  }

  completePurchase(): void {
    if (!this.eventId || !this.event) return;
    if (this.event.isFree) {
      this.registerFree();
      return;
    }
    if (this.clientSecret) {
      this.payNow();
      return;
    }
    this.proceedToPayment();
  }

  registerFree(): void {
    this.creatingSession = true;
    this.loadError = null;
    this.cdr.detectChanges();
    this.subscription.add(
      this.studentApi.registerForEvent(this.eventId).subscribe({
        next: (res) => {
          this.creatingSession = false;
          if (res?.enrolled) {
            this.router.navigate(['/app/student/events/event', this.eventId], {
              queryParams: { registered: 'true' }
            });
            return;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.creatingSession = false;
          this.loadError = err?.error?.message ?? err?.message ?? 'Registration failed.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img && !(img as any).dataset['logoFallback']) {
      (img as any).dataset['logoFallback'] = '1';
      img.src = '/assets/img/oilandgas_club.svg';
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}
