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
    <div class="container">
      <div class="card">
        <h1>{{message}}!</h1>
        <p>Thank you for your purchase. Your transaction was completed successfully.</p>
        <div class="buttons">
          <a routerLink="/" class="btn">Go to Homepage</a>
          <a routerLink="/contact" class="btn">Contact Support</a>
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
        height: 100vh;
        background-color: #f8f9fa;
      }
      .card {
        background: white;
        padding: 20px;
        text-align: center;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      h1 {
        color: #28a745;
      }
      .buttons {
        margin-top: 20px;
      }
      .btn {
        text-decoration: none;
        padding: 10px 15px;
        margin: 5px;
        background: #007bff;
        color: white;
        border-radius: 5px;
        transition: background 0.3s;
      }
      .btn:hover {
        background: #0056b3;
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