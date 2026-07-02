import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../../auth/auth.service';
import { MembershipApiService } from 'src/app/services/membership-api.service';
import { RazorpayPaymentService } from 'src/app/services/razorpay-payment.service';
import { confirmStripePaymentWith3ds, stripePaymentElementOptions, stripePaymentReturnUrl } from 'src/app/core/helpers/stripe-confirm.helper';

@Component({
  selector: 'app-membership-checkout',
  templateUrl: './membership-checkout.component.html',
  styleUrls: ['./membership-checkout.component.scss'],
  standalone: false
})
export class MembershipCheckoutComponent implements OnInit, OnDestroy {
  planCode = '';
  billingCycle = 'yearly';
  planName = '';
  amountRupees = 0;
  loading = true;
  loadError: string | null = null;
  userName = '';
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';
  appName = (environment as { certificateBrandName?: string }).certificateBrandName || 'Oil and Gas Club';
  currentYear = new Date().getFullYear();

  selectedGateway: 'stripe' | 'razorpay' = 'stripe';
  razorpayEnabled = !!(environment as { razorpayKeyId?: string }).razorpayKeyId
    && !(environment as { razorpayKeyId?: string }).razorpayKeyId!.includes('xxxx');

  stripe: Stripe | null = null;
  elements: StripeElements | null = null;
  clientSecret: string | null = null;
  paymentElementReady = false;
  paying = false;
  creatingIntent = false;
  razorpayLoading = false;

  registrationForm!: FormGroup;
  registrationDetailsComplete = false;
  savingRegistrationDetails = false;
  editingRegistration = false;

  private subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private membershipApi: MembershipApiService,
    private razorpayPaymentService: RazorpayPaymentService,
    private cdr: ChangeDetectorRef,
    private formBuilder: FormBuilder
  ) {}

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userName = user?.username || user?.email || user?.name || '';
    if (this.razorpayEnabled) {
      this.selectedGateway = 'razorpay';
    }

    this.registrationForm = this.formBuilder.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      mobile: ['', Validators.required],
      companyName: ['', Validators.required],
      designation: ['', Validators.required],
      department: ['', Validators.required]
    });
    this.prefillRegistrationFromUser();

    this.planCode = (this.route.snapshot.paramMap.get('planId') || '').trim().toLowerCase();
    this.billingCycle = (this.route.snapshot.queryParamMap.get('cycle') || 'yearly').trim();

    if (!this.planCode || this.planCode === 'business') {
      this.loadError = 'Invalid membership plan.';
      this.loading = false;
      return;
    }

    this.subscription.add(
      this.membershipApi.getPlans().subscribe({
        next: (plans) => {
          const plan = (plans || []).find(p => (p.planCode || '').toLowerCase() === this.planCode);
          if (!plan) {
            this.loadError = 'Membership plan not found.';
            this.loading = false;
            this.cdr.detectChanges();
            return;
          }
          this.planName = plan.planName;
          this.amountRupees = this.billingCycle === 'sixMonth'
            ? plan.sixMonthPrice
            : plan.yearlyPrice;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loadError = 'Could not load membership plan.';
          this.loading = false;
          this.cdr.detectChanges();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get billingCycleLabel(): string {
    return this.billingCycle === 'yearly' ? 'Yearly billing' : '6-month billing';
  }

  goToMembershipPage(): void {
    this.router.navigate(['/app/student/membership']);
  }

  private prefillRegistrationFromUser(): void {
    const u = this.authService.currentUser();
    if (!u) return;
    const name = (u.name || u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim() || '').trim();
    const email = (u.email || u.Email || '').trim();
    const hasProfile = !!(u.phone || u.Phone || u.mobile || u.Mobile)
      && !!(u.companyName || u.CompanyName)
      && !!(u.designation || u.Designation)
      && !!(u.department || u.Department);

    this.registrationForm.patchValue({
      name,
      email,
      mobile: u.phone || u.Phone || u.mobile || u.Mobile || '',
      companyName: u.companyName || u.CompanyName || '',
      designation: u.designation || u.Designation || '',
      department: u.department || u.Department || ''
    });
    if (email) {
      this.registrationForm.get('email')?.disable({ emitEvent: false });
    }
    if (hasProfile) {
      this.registrationDetailsComplete = true;
    }
  }

  private getRegistrationBody(): {
    name: string;
    email: string;
    mobile: string;
    companyName: string;
    designation: string;
    department: string;
  } {
    const v = this.registrationForm.getRawValue();
    const authEmail = (this.authService.currentUser()?.email || this.authService.currentUser()?.Email || '').trim();
    return {
      name: String(v.name ?? '').trim(),
      email: String(v.email ?? authEmail ?? '').trim(),
      mobile: String(v.mobile ?? '').trim(),
      companyName: String(v.companyName ?? '').trim(),
      designation: String(v.designation ?? '').trim(),
      department: String(v.department ?? '').trim()
    };
  }

  editRegistrationDetails(): void {
    this.editingRegistration = true;
    this.cdr.detectChanges();
  }

  saveRegistrationDetails(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.loadError = 'Please fill in all required details, including your mobile number and company name.';
      this.cdr.detectChanges();
      return;
    }
    this.savingRegistrationDetails = true;
    this.loadError = null;
    this.cdr.detectChanges();
    const body = this.getRegistrationBody();
    this.subscription.add(
      this.membershipApi.saveCheckoutDetails(body).subscribe({
        next: () => {
          this.savingRegistrationDetails = false;
          this.registrationDetailsComplete = true;
          this.editingRegistration = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.savingRegistrationDetails = false;
          this.loadError = err?.error?.message ?? err?.message ?? 'Could not save your details.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  private ensureRegistrationDetailsSaved(): Promise<boolean> {
    if (this.registrationDetailsComplete && !this.editingRegistration) {
      return Promise.resolve(true);
    }
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      this.loadError = 'Please fill in all required details, including your mobile number and company name.';
      this.cdr.detectChanges();
      return Promise.resolve(false);
    }
    this.savingRegistrationDetails = true;
    this.loadError = null;
    this.cdr.detectChanges();
    const body = this.getRegistrationBody();
    return new Promise((resolve) => {
      this.membershipApi.saveCheckoutDetails(body).subscribe({
        next: () => {
          this.savingRegistrationDetails = false;
          this.registrationDetailsComplete = true;
          this.editingRegistration = false;
          this.cdr.detectChanges();
          resolve(true);
        },
        error: (err) => {
          this.savingRegistrationDetails = false;
          this.loadError = err?.error?.message ?? err?.message ?? 'Could not save your details.';
          this.cdr.detectChanges();
          resolve(false);
        }
      });
    });
  }

  async proceedToPayment(): Promise<void> {
    const detailsOk = await this.ensureRegistrationDetailsSaved();
    if (!detailsOk) return;
    if (this.selectedGateway === 'razorpay') {
      this.payWithRazorpay();
    } else {
      this.createIntentAndMountPayment();
    }
  }

  private createIntentAndMountPayment(): void {
    this.creatingIntent = true;
    this.loadError = null;
    this.subscription.add(
      this.membershipApi.createStripeOrder(this.planCode, this.billingCycle).subscribe({
        next: async (res) => {
          this.creatingIntent = false;
          if (res?.alreadyActive) {
            this.router.navigate(['/app/student/profile']);
            return;
          }
          if (!res?.clientSecret) {
            this.loadError = 'Could not start payment.';
            this.cdr.detectChanges();
            return;
          }
          this.clientSecret = res.clientSecret;
          const pk = environment.stripeKey;
          if (!pk) {
            this.loadError = 'Stripe is not configured.';
            this.cdr.detectChanges();
            return;
          }
          this.stripe = await loadStripe(pk);
          if (!this.stripe) {
            this.loadError = 'Could not load Stripe.';
            this.cdr.detectChanges();
            return;
          }
          this.elements = this.stripe.elements({
            clientSecret: res.clientSecret,
            appearance: { theme: 'stripe', variables: { colorPrimary: '#f57722' } }
          });
          const paymentElement = this.elements.create('payment' as any, stripePaymentElementOptions() as any);
          paymentElement.on('ready', () => {
            this.paymentElementReady = true;
            this.cdr.detectChanges();
          });
          await paymentElement.mount('#membership-payment-element');
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.creatingIntent = false;
          this.loadError = err?.error?.message ?? err?.error ?? 'Could not create payment.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  async payWithStripe(): Promise<void> {
    if (!this.stripe || !this.elements || !this.clientSecret || this.paying) return;
    this.paying = true;
    this.loadError = null;
    const outcome = await confirmStripePaymentWith3ds({
      stripe: this.stripe,
      elements: this.elements,
      clientSecret: this.clientSecret,
      returnUrl: stripePaymentReturnUrl(this.planCode, 'membership'),
      receiptEmail: this.authService.currentUser()?.email || undefined
    });
    this.paying = false;
    if (!outcome.success || !outcome.paymentIntentId) {
      this.loadError = outcome.errorMessage || 'Payment could not be completed.';
      this.cdr.detectChanges();
      return;
    }
    this.subscription.add(
      this.membershipApi.confirmStripePayment(outcome.paymentIntentId).subscribe({
        next: () => {
          this.router.navigate(['/app/student/profile'], { queryParams: { membership: 'activated' } });
        },
        error: (err) => {
          this.loadError = err?.error?.message ?? 'Payment verification failed.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  payWithRazorpay(): void {
    this.razorpayLoading = true;
    this.loadError = null;
    const user = this.authService.currentUser();
    const amountPaise = Math.round(this.amountRupees * 100);
    const body = this.getRegistrationBody();
    this.subscription.add(
      this.razorpayPaymentService.createMembershipOrder(amountPaise, this.planCode, this.billingCycle, {
        userId: user?.userId ?? user?.id
      }).subscribe({
        next: async (res) => {
          const ready = await this.razorpayPaymentService.loadCheckoutScript();
          if (!ready || !window.Razorpay) {
            this.razorpayLoading = false;
            this.loadError = 'Could not load Razorpay Checkout.';
            this.cdr.detectChanges();
            return;
          }
          this.openRazorpayCheckout(res, body);
        },
        error: (err) => {
          this.razorpayLoading = false;
          this.loadError = err?.error?.error ?? err?.error?.message ?? 'Failed to initialize Razorpay payment.';
          this.cdr.detectChanges();
        }
      })
    );
  }

  private openRazorpayCheckout(res: {
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    courseTitle?: string;
  }, details: { name: string; email: string; mobile: string }): void {
    const checkout = new window.Razorpay!({
      key: res.keyId,
      amount: res.amount,
      currency: res.currency,
      name: '',
      description: res.courseTitle || this.planName || 'Membership subscription',
      image: this.razorpayLogoUrl(),
      order_id: res.orderId,
      prefill: {
        name: details.name || '',
        email: details.email || '',
        contact: details.mobile || ''
      },
      theme: { color: '#f57722' },
      handler: (response: unknown) => {
        const r = response as { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
        this.razorpayLoading = true;
        this.cdr.detectChanges();
        this.subscription.add(
          this.razorpayPaymentService.verify({
            razorpayOrderId: r.razorpay_order_id,
            razorpayPaymentId: r.razorpay_payment_id,
            razorpaySignature: r.razorpay_signature
          }).subscribe({
            next: () => {
              this.razorpayLoading = false;
              this.router.navigate(['/app/student/profile'], { queryParams: { membership: 'activated' } });
            },
            error: () => {
              this.razorpayLoading = false;
              this.loadError = 'Payment verification failed.';
              this.cdr.detectChanges();
            }
          })
        );
      },
      modal: {
        ondismiss: () => {
          this.razorpayLoading = false;
          this.cdr.detectChanges();
        }
      }
    });
    checkout.open();
    this.razorpayLoading = false;
    this.cdr.detectChanges();
  }

  private razorpayLogoUrl(): string {
    const configured = (environment as { logoUrl?: string }).logoUrl;
    if (configured && /^https:\/\//i.test(configured)) return configured;
    return 'https://oilandgasclub.com/assets/img/oilandgas_club.svg';
  }

  onLogoError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) img.src = '/assets/img/oilandgas_club.svg';
  }
}
