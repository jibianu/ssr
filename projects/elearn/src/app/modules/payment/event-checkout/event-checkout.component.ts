import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../../auth/auth.service';
import { StudentDashboardApiService } from '../../student/student-dashboard-api.service';

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

  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private studentApi: StudentDashboardApiService,
    private authService: AuthenticationService,
    private cdr: ChangeDetectorRef
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
    const discount = e.discount ?? e.Discount ?? 0;
    const finalAmount = amount - discount;
    return {
      id: e.id ?? e.Id,
      title: e.title ?? e.Title,
      amount: Number(amount),
      discount: Number(discount),
      finalAmount: finalAmount > 0 ? finalAmount : amount,
      isFree: !amount || amount === 0
    };
  }

  get displayPrice(): string {
    if (!this.event) return '';
    if (this.event.isFree) return 'Free';
    const amt = this.event.finalAmount ?? this.event.amount;
    return amt ? '₹' + Number(amt).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' onwards' : '';
  }

  get hasDiscount(): boolean {
    return !!(this.event && !this.event.isFree && this.event.discount > 0);
  }

  goToEventDetail(): void {
    if (this.event?.id) {
      this.router.navigate(['/app/student/events/event', this.event.id]);
    } else {
      this.router.navigate(['/app/student/events']);
    }
  }

  /** Proceed to payment: create PaymentIntent and mount Stripe Payment Element (mirror course checkout). */
  proceedToPayment(): void {
    if (!this.eventId || !this.event || this.event.isFree) return;
    this.creatingIntent = true;
    this.loadError = null;
    this.cdr.detectChanges();
    this.subscription.add(
      this.studentApi.createEventPaymentIntent(this.eventId).subscribe({
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

  private getEventSuccessUrl(): string {
    const base = (typeof window !== 'undefined' && window.location?.origin)
      ? window.location.origin.replace(/\/$/, '')
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
      this.router.navigateByUrl(successUrl);
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
