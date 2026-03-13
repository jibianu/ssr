// import { Component } from "@angular/core";

// @Component({
//     selector: 'app-payment-success',
//     template:`<h1>Payment Success</h1>`,
//   })
// export class PaymentSuccessComponent{

// }

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { PublicAppService } from "../../publicapp.service";
import { first } from "rxjs/operators";

@Component({
  selector: "app-payment-success",
  template: `
    <div class="container">
      <div class="card">
        <div *ngIf="isVerifying" class="verifying">
          <i class="fa fa-spinner fa-spin"></i>
          <p>Verifying payment status...</p>
        </div>
        <div *ngIf="!isVerifying">
          <h1>{{message}}!</h1>
          <p *ngIf="isPaymentVerified">{{successMessage}}</p>
          <p *ngIf="!isPaymentVerified && !verificationError" class="warning">
            Payment verification is pending. Please contact support if you have completed the payment.
          </p>
          <p *ngIf="verificationError" class="error">{{verificationError}}</p>
          <div *ngIf="paymentDetails" class="payment-details">
            <p><strong>Transaction ID:</strong> {{paymentDetails.paymentRefNo || 'N/A'}}</p>
            <p><strong>Registration ID:</strong> {{paymentDetails.id}}</p>
          </div>
          <div class="buttons">
            <a routerLink="/" class="btn">Go to Homepage</a>
            <a routerLink="/contact-us" class="btn">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        padding: 2rem;
        background-color: #f8f9fa;
      }
      .card {
        background: white;
        padding: 2rem;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        max-width: 500px;
        width: 100%;
      }
      .verifying {
        padding: 2rem;
      }
      .verifying i {
        font-size: 2rem;
        color: #007bff;
        margin-bottom: 1rem;
      }
      h1 {
        color: #28a745;
        margin-bottom: 1rem;
      }
      .warning {
        color: #856404;
        background-color: #fff3cd;
        padding: 0.75rem;
        border-radius: 4px;
        margin: 1rem 0;
      }
      .error {
        color: #721c24;
        background-color: #f8d7da;
        padding: 0.75rem;
        border-radius: 4px;
        margin: 1rem 0;
      }
      .payment-details {
        text-align: left;
        background: #f8f9fa;
        padding: 1rem;
        border-radius: 4px;
        margin: 1rem 0;
      }
      .payment-details p {
        margin: 0.5rem 0;
      }
      .buttons {
        margin-top: 1.5rem;
        display: flex;
        gap: 1rem;
        justify-content: center;
        flex-wrap: wrap;
      }
      .btn {
        text-decoration: none;
        padding: 0.75rem 1.5rem;
        background: #007bff;
        color: white;
        border-radius: 5px;
        transition: background 0.3s;
        display: inline-block;
      }
      .btn:hover {
        background: #0056b3;
      }
    `,
  ],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentSuccessComponent implements OnInit {
  message: string = 'Payment Successful';
  successMessage: string = 'Thank you for your purchase. Your transaction was completed successfully.';
  isVerifying: boolean = true;
  isPaymentVerified: boolean = false;
  verificationError: string = '';
  paymentDetails: any = null;
  entityId: string = '';
  eventId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(first()).subscribe(params => {
      const sessionId = params['session_id'] || '';
      const entityType = params['entityType'] || '';
      this.entityId = params['entityId'] || '';
      this.eventId = params['eventId'] || params['entityId'] || '';

      if (entityType === 'event' && sessionId) {
        this.message = 'Payment Successful';
        this.successMessage = 'Your event registration is complete.';
        this.publicAppService.confirmEventPayment(sessionId).pipe(first()).subscribe({
          next: () => {
            this.isVerifying = false;
            this.isPaymentVerified = true;
            this.paymentDetails = { id: this.entityId, paymentRefNo: sessionId };
            this.cdr.markForCheck();
          },
          error: (err) => {
            this.isVerifying = false;
            this.verificationError = err?.error?.message || 'Could not confirm event registration. Please contact support.';
            this.cdr.markForCheck();
          }
        });
        return;
      }
      if (this.entityId) {
        this.verifyPayment();
      } else {
        this.verificationError = 'Registration ID is missing. Please contact support.';
        this.isVerifying = false;
        this.cdr.markForCheck();
      }
    });
  }

  verifyPayment(): void {
    // Try to get eventId from sessionStorage if not in URL
    if (!this.eventId && this.entityId) {
      const storedEventId = sessionStorage.getItem('lastEventId');
      if (storedEventId) {
        this.eventId = storedEventId;
        console.log('✅ Retrieved eventId from sessionStorage:', this.eventId);
      }
    }
    
    if (!this.eventId) {
      // Cannot verify without eventId - show warning but assume success
      console.warn('⚠️ Event ID is missing. Payment verification may be incomplete.');
      this.verificationError = 'Event ID is missing. Payment verification may be incomplete.';
      this.isVerifying = false;
      this.isPaymentVerified = true; // Assume success if redirected here by PhonePe
      this.message = 'Payment Successful';
      this.cdr.markForCheck();
      return;
    }

    // Verify payment status with backend
    this.publicAppService.verifyPaymentStatus(this.eventId, this.entityId)
      .pipe(first())
      .subscribe({
        next: (paymentData) => {
          this.isVerifying = false;
          
          if (paymentData && paymentData.isPaymentCompleted) {
            this.isPaymentVerified = true;
            this.message = 'Payment Successful';
            this.paymentDetails = paymentData;
            console.log('✅ Payment verified successfully:', paymentData);
          } else if (paymentData) {
            // Registration exists but payment not completed yet
            this.isPaymentVerified = false;
            this.message = 'Payment Verification Pending';
            this.paymentDetails = paymentData;
            console.warn('⚠️ Payment verification pending:', paymentData);
          } else {
            // Registration not found
            this.verificationError = 'Registration not found. Please contact support with your registration details.';
            this.isPaymentVerified = false;
            console.error('❌ Registration not found for entityId:', this.entityId);
          }
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isVerifying = false;
          this.verificationError = 'Unable to verify payment status. Please contact support.';
          this.isPaymentVerified = false;
          console.error('❌ Error verifying payment:', error);
          this.cdr.markForCheck();
        }
      });
  }
}