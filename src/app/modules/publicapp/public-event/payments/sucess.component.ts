// import { Component } from "@angular/core";

// @Component({
//     selector: 'app-payment-success',
//     template:`<h1>Payment Success</h1>`,
//   })
// export class PaymentSuccessComponent{

// }

import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-payment-success",
    template: `
      <section class="payment-status" ngSkipHydration>
        <div class="payment-status__card">
          <h1>{{ message }}!</h1>
          <p>Thank you for your purchase. Your transaction was completed successfully.</p>
          <div class="payment-status__actions">
            <a routerLink="/" class="payment-status__btn">Go to Homepage</a>
            <a routerLink="/contact-us" class="payment-status__btn">Contact Support</a>
          </div>
        </div>
      </section>
  `,
    styles: [
        `
      .payment-status {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        padding: 2rem 0;
      }
      .payment-status__card {
        background: #fff;
        padding: clamp(1.5rem, 4vw, 2.5rem);
        text-align: center;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(15, 23, 42, 0.08);
        max-width: 420px;
        width: 100%;
      }
      .payment-status__card h1 {
        color: #16a34a;
        margin-bottom: 0.75rem;
      }
      .payment-status__card p {
        margin: 0;
        color: #475569;
        line-height: 1.5;
      }
      .payment-status__actions {
        margin-top: 1.5rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: center;
      }
      .payment-status__btn {
        text-decoration: none;
        padding: 0.65rem 1.5rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        color: #fff;
        font-weight: 600;
        transition: transform 150ms ease, box-shadow 150ms ease;
      }
      .payment-status__btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 30px rgba(99, 102, 241, 0.35);
      }
    `,
    ],
    standalone: false
})
export class PaymentSuccessComponent implements OnInit {
  ngOnInit(): void {
    if(this.isLoaing){
      this.message="processing"
    }else{
      if(this.isSuccess){
        this.message="Payment Successful"
      }else{
        this.message="failed"
      }
    }
  }

  isSuccess:boolean=true;
  isLoaing:boolean=false;
  message:string='';
 

}