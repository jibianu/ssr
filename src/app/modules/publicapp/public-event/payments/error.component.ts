// import { Component } from "@angular/core";

// @Component({
//     selector: 'app-payment-error',
//     template:''
//   })
// export class PaymentErrorComponent{

// }

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: 'app-payment-error',
    template: `
      <section class="payment-error" ngSkipHydration>
        <div class="payment-error__card">
          <h1>Payment Failed</h1>
          <p *ngIf="errorMessage">{{errorMessage}}</p>
          <p *ngIf="!errorMessage">Oops! Something went wrong with your payment. Please try again.</p>
          <div *ngIf="entityId" class="payment-error__details">
            <p><strong>Registration ID:</strong> {{entityId}}</p>
          </div>
          <div class="payment-error__actions">
            <button type="button" (click)="retryPayment()">Retry Payment</button>
            <a routerLink="/contact-us">Contact Support</a>
            <a routerLink="/events">Back to Events</a>
          </div>
        </div>
      </section>
  `,
    styles: [
        `
    .payment-error {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      padding: 2rem 0;
    }
    .payment-error__card {
      text-align: center;
      padding: clamp(1.5rem, 4vw, 2.5rem);
      border-radius: 16px;
      background: #fff;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.08);
      max-width: 420px;
      width: 100%;
    }
    .payment-error__card h1 {
      color: #dc2626;
      margin-bottom: 0.75rem;
    }
    .payment-error__card p {
      margin: 0.5rem 0;
      color: #475569;
      line-height: 1.5;
    }
    .payment-error__details {
      margin: 1rem 0;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 4px;
      text-align: left;
    }
    .payment-error__details p {
      margin: 0.25rem 0;
      font-size: 0.875rem;
      color: #64748b;
    }
    .payment-error__actions {
      margin-top: 1.5rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    .payment-error__actions button,
    .payment-error__actions a {
      background-color: #f04a00;
      color: #fff;
      border: none;
      padding: 0.65rem 1.6rem;
      cursor: pointer;
      border-radius: 999px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 150ms ease, box-shadow 150ms ease;
      display: inline-block;
    }
    .payment-error__actions button:hover,
    .payment-error__actions a:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 30px rgba(240, 74, 0, 0.35);
    }
    `
    ],
    standalone: false
})
export class PaymentErrorComponent implements OnInit {
  entityId: string = '';
  errorMessage: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Get query parameters
    this.route.queryParams.subscribe(params => {
      this.entityId = params['entityId'] || '';
      const errorCode = params['errorCode'] || '';
      const errorMsg = params['errorMsg'] || '';
      
      if (errorMsg) {
        this.errorMessage = decodeURIComponent(errorMsg);
      } else if (errorCode) {
        this.errorMessage = `Payment failed with error code: ${errorCode}`;
      }
      
      this.cdr.markForCheck();
    });
  }

  retryPayment() {
    // Navigate back to events page to retry registration
    console.log("Retrying payment...");
    this.router.navigate(['/events']);
  }
}
