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
    <div class="payment-error-container">
      <h1>Payment Failed</h1>
      <p>Oops! Something went wrong with your payment. Please try again.</p>
      <button (click)="retryPayment()">Retry Payment</button>
      <a routerLink="/contact">Contact Support</a>
    </div>
  `,
  styles: [
    `
    .payment-error-container {
      text-align: center;
      margin-top: 50px;
    }
    h1 {
      color: red;
    }
    button {
      background-color: #d9534f;
      color: white;
      border: none;
      padding: 10px 20px;
      cursor: pointer;
      margin-right: 10px;
    }
    button:hover {
      background-color: #c9302c;
    }
    a {
      color: #0275d8;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    `
  ]
})
export class PaymentErrorComponent {
  retryPayment() {
    // Logic to retry payment can be implemented here
    console.log("Retrying payment...");
  }
}
