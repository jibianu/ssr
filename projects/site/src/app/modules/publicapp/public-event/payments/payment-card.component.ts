import { Component, OnInit, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Router } from '@angular/router';
import { PublicAppService } from '../../publicapp.service';

@Component({
  selector: 'app-payment-card',
  templateUrl: './payment-card.component.html',
  styleUrls: ['./payment-card.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentCardComponent implements OnInit {
  @Input() paymentUrl: string = '';
  @Input() amount: number = 0;
  @Input() entityId: string = '';
  @Input() eventTitle: string = '';

  paymentForm: FormGroup;
  selectedPaymentMethod: string = 'creditCard';
  isProcessing: boolean = false;
  paymentMethods = {
    payNow: [
      { id: 'creditCard', label: 'Credit Card', icon: 'fa-credit-card', selected: true },
      { id: 'debitCard', label: 'Debit Card', icon: 'fa-credit-card' },
      { id: 'netBanking', label: 'Net Banking', icon: 'fa-university' },
      { id: 'upi', label: 'UPI', icon: 'fa-mobile' }
    ],
    payInstallments: [
      { id: 'emi', label: 'EMI', icon: 'fa-calendar' }
    ],
    otherOptions: [
      { id: 'ccAvenue', label: 'CC-Avenue®', icon: '', isExternal: true }
    ]
  };

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private router: Router,
    private publicAppService: PublicAppService,
    private cdr: ChangeDetectorRef
  ) {
    this.paymentForm = this.fb.group({
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
      cardName: ['', [Validators.required]],
      expiryMonth: ['', [Validators.required]],
      expiryYear: ['', [Validators.required]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  ngOnInit(): void {
    // Set current year and next 10 years for expiry
    this.generateYearOptions();
  }

  yearOptions: number[] = [];
  monthOptions = [
    { value: '01', label: '01' },
    { value: '02', label: '02' },
    { value: '03', label: '03' },
    { value: '04', label: '04' },
    { value: '05', label: '05' },
    { value: '06', label: '06' },
    { value: '07', label: '07' },
    { value: '08', label: '08' },
    { value: '09', label: '09' },
    { value: '10', label: '10' },
    { value: '11', label: '11' },
    { value: '12', label: '12' }
  ];

  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.yearOptions.push(currentYear + i);
    }
  }

  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;
    this.cdr.markForCheck();
  }

  formatCardNumber(event: any): void {
    let value = event.target.value.replace(/\s/g, '');
    if (value.length > 0) {
      value = value.match(/.{1,4}/g)?.join(' ') || value;
    }
    this.paymentForm.patchValue({ cardNumber: value }, { emitEvent: false });
  }

  formatCVV(event: any): void {
    let value = event.target.value.replace(/\D/g, '');
    this.paymentForm.patchValue({ cvv: value }, { emitEvent: false });
  }

  makePayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    if (!this.paymentUrl) {
      console.error('Payment URL not available');
      this.activeModal.close();
      this.router.navigate(['/events/payment/error']);
      return;
    }

    this.isProcessing = true;
    this.cdr.markForCheck();

    // Close modal first, then redirect to PhonePe payment gateway
    // The payment gateway will handle the payment and redirect back to success/error pages
    this.activeModal.close();
    
    // Small delay to ensure modal closes before redirect
    setTimeout(() => {
      if (this.isBrowser()) {
        window.location.href = this.paymentUrl;
      } else {
        // Fallback for SSR
        this.router.navigate(['/events/payment/error']);
      }
    }, 100);
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.location !== 'undefined';
  }

  closeModal(): void {
    this.activeModal.close();
  }
}

