// import { Component } from "@angular/core";

// @Component({
//     selector: 'app-payment-error',
//     template:''
//   })
// export class PaymentErrorComponent{

// }

import { Component } from "@angular/core";

@Component({
    selector: 'app-payment-error',
    template: `
      <section class="payment-error" ngSkipHydration>
        <div class="payment-error__card">
          <h1>Payment Failed</h1>
          <p>Oops! Something went wrong with your payment. Please try again.</p>
          <div class="payment-error__actions">
            <button type="button" (click)="retryPayment()">Retry Payment</button>
            <a routerLink="/contact-us">Contact Support</a>
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
      margin: 0;
      color: #475569;
      line-height: 1.5;
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
export class PaymentErrorComponent {
  retryPayment() {
    // Logic to retry payment can be implemented here
    console.log("Retrying payment...");
  }
}
