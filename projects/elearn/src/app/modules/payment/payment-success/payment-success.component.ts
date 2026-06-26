import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe } from '@stripe/stripe-js';
import { firstValueFrom, Subscription } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { AuthenticationService } from '../../auth/auth.service';
import { StripePaymentService } from '../../../services/stripe-payment.service';
import { StudentDashboardApiService } from '../../student/student-dashboard-api.service';
import { Role } from 'src/app/shared/models/role';

@Component({
    selector: 'app-payment-success',
    templateUrl: './payment-success.component.html',
    styleUrls: ['./payment-success.component.scss'],
    standalone: false
})
export class PaymentSuccessComponent implements OnInit, OnDestroy {

  sessionId = '';
  entityId = '';
  entityType = '';
  loading = true;
  errorMessage: string | null = null;
  subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private appService: AdminAppService,
    private stripePaymentService: StripePaymentService,
    private studentApi: StudentDashboardApiService,
    private authService: AuthenticationService,
    private router: Router
  ) {
    const q = route.snapshot.queryParams || {};
    this.sessionId = q['session_id'] || '';
    this.entityId = q['entityId'] || '';
    this.entityType = q['entityType'] || '';
  }

  ngOnInit(): void {
    void this.handleReturn();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private async handleReturn(): Promise<void> {
    const q = this.route.snapshot.queryParams || {};
    const redirectStatus = (q['redirect_status'] as string || '').trim();
    const stripePaymentIntentId = (q['payment_intent'] as string || '').trim();
    const clientSecret = (q['payment_intent_client_secret'] as string || '').trim();

    // Stripe 3DS / bank redirect failed — send user back to checkout.
    if (redirectStatus === 'failed' && this.entityId) {
      const checkoutPath = this.entityType === 'event'
        ? `/checkout/event/${this.entityId}`
        : `/checkout/${this.entityId}`;
      this.router.navigate([checkoutPath], {
        queryParams: { payment_failed: '1' },
        replaceUrl: true
      });
      return;
    }

    // Free course: backend enrolled before redirect.
    if (this.sessionId === 'free' && this.entityId) {
      const roleId = await this.ensureSessionRole();
      if (this.canAccessStudentArea(roleId)) {
        this.router.navigate(['/app/student/details/curriculum-list', this.entityId]);
      } else {
        this.loading = false;
      }
      return;
    }

    // After 3DS redirect Stripe appends payment_intent* query params — verify before enrolling.
    let paymentIntentId = stripePaymentIntentId || this.readStoredPaymentIntentId();
    if (clientSecret && environment.stripeKey) {
      try {
        const stripe = await loadStripe(environment.stripeKey);
        if (stripe) {
          const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);
          if (error) {
            this.failAndReturnToCheckout('Could not verify payment. Please try again.');
            return;
          }
          if (paymentIntent?.status === 'requires_action') {
            this.failAndReturnToCheckout('Bank authentication was not completed. Please try again.');
            return;
          }
          if (paymentIntent?.status === 'requires_payment_method') {
            this.failAndReturnToCheckout('Payment was declined or authentication failed. Use another card.');
            return;
          }
          if (paymentIntent?.id) {
            paymentIntentId = paymentIntent.id;
          }
        }
      } catch {
        /* fall back to query param / sessionStorage id */
      }
    }

    if (this.entityType === 'event' && this.entityId) {
      this.completeEventReturn(paymentIntentId);
      return;
    }

    if (this.entityId && (paymentIntentId || !this.sessionId)) {
      this.completeCourseReturn(paymentIntentId);
      return;
    }

    if (!this.sessionId || !this.entityId) {
      this.router.navigate(['/app/student/courses']);
      return;
    }

    this.verifyLegacyCheckoutSession();
  }

  private readStoredPaymentIntentId(): string {
    if (!this.entityId) return '';
    return sessionStorage.getItem('paymentIntentId_' + this.entityId) || '';
  }

  private clearStoredPaymentIntentId(): void {
    if (!this.entityId) return;
    sessionStorage.removeItem('paymentIntentId_' + this.entityId);
  }

  private failAndReturnToCheckout(message: string): void {
    this.loading = false;
    this.errorMessage = message;
    const checkoutPath = this.entityType === 'event'
      ? `/checkout/event/${this.entityId}`
      : `/checkout/${this.entityId}`;
    setTimeout(() => {
      this.router.navigate([checkoutPath], {
        queryParams: { payment_failed: '1' },
        replaceUrl: true
      });
    }, 2500);
  }

  private completeEventReturn(paymentIntentId: string): void {
    const finish = () => {
      void this.ensureSessionRole().then((roleId) => {
        if (this.canAccessStudentArea(roleId)) {
          this.router.navigate(['/app/student/events/event', this.entityId], { queryParams: { registered: 'true' } });
        } else {
          this.loading = false;
        }
      });
    };
    if (!paymentIntentId) {
      finish();
      return;
    }
    this.clearStoredPaymentIntentId();
    this.subscription.add(
      this.studentApi.confirmEventPaymentIntent(paymentIntentId).subscribe({
        next: finish,
        error: finish
      })
    );
  }

  private completeCourseReturn(paymentIntentId: string): void {
    const finish = () => {
      void this.ensureSessionRole().then((roleId) => {
        if (this.canAccessStudentArea(roleId)) {
          this.goToCourseCurriculum();
        } else {
          this.loading = false;
        }
      });
    };

    if (!paymentIntentId) {
      finish();
      return;
    }

    this.clearStoredPaymentIntentId();
    this.subscription.add(
      this.stripePaymentService.confirmPayment(this.entityId, paymentIntentId).subscribe({
        next: finish,
        error: finish
      })
    );
  }

  /** Restore roleId after Stripe 3DS full-page redirect (RoleGuard needs this before student routes). */
  private async ensureSessionRole(): Promise<number | null> {
    let roleId = this.authService.getRoleId();
    if (roleId != null) {
      return roleId;
    }
    try {
      await firstValueFrom(this.authService.getUserInfo());
    } catch {
      /* token may still work for confirm API */
    }
    roleId = this.authService.getRoleId();
    if (roleId != null) {
      return roleId;
    }
    try {
      const res = await firstValueFrom(this.authService.postLogin());
      if (res.isValidUser && res.roleId) {
        return res.roleId;
      }
    } catch {
      /* ignore */
    }
    return this.authService.getRoleId();
  }

  private canAccessStudentArea(roleId: number | null): boolean {
    return roleId === Role.Student || roleId === Role.Affiliate;
  }

  private goToCourseCurriculum(): void {
    this.appService.getCourseByCourseID(this.entityId, true).subscribe({
      next: (course: any) => {
        if (course) {
          localStorage.setItem('course', JSON.stringify(course));
        }
        this.router.navigate(['/app/student/details/curriculum-list', this.entityId]);
      },
      error: () => this.router.navigate(['/app/student/details/curriculum-list', this.entityId])
    });
  }

  private verifyLegacyCheckoutSession(): void {
    const data = { entityId: this.entityId, sessionId: this.sessionId };
    this.subscription.add(
      this.appService.verifyPayment(this.sessionId, data).subscribe({
        next: () => {
          this.appService.getCourseByCourseID(this.entityId, true).subscribe({
            next: (course: any) => {
              if (course) localStorage.setItem('course', JSON.stringify(course));
              this.router.navigate(['/app/student/details/curriculum-list', this.entityId]);
            },
            error: () => this.router.navigate(['/app/student/details/curriculum-list', this.entityId])
          });
        },
        error: () => this.router.navigate(['/app/student/courses'])
      })
    );
  }
}
