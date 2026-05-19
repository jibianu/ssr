import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminApplyDiscountBody, AdminBillingApiService, AdminTenantRow, AdminUpdateBillingBody } from './admin-billing-api.service';
import { BILLING_PAYMENT_STATUS_OPTIONS } from './billing-payment-status';

@Component({
  selector: 'app-company-pricing-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './company-pricing-modal.component.html',
  styleUrls: ['./company-pricing-modal.component.scss']
})
export class CompanyPricingModalComponent implements OnChanges {
  @Input() tenant: AdminTenantRow | null = null;
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<AdminTenantRow>();

  form!: FormGroup;
  saving = false;
  error = '';
  previewSubtotal = 0;
  previewDiscount = 0;
  previewTax = 0;
  previewTotal = 0;

  readonly planOptions = [
    { id: 0, label: 'Starter Team' },
    { id: 1, label: 'Business' },
    { id: 2, label: 'Enterprise' },
    { id: 3, label: 'Enterprise Plus' }
  ];

  readonly discountTypes = [
    { id: 0, label: 'None' },
    { id: 1, label: 'Percentage (%)' },
    { id: 2, label: 'Flat amount (₹)' },
    { id: 3, label: 'Enterprise custom annual' }
  ];

  readonly paymentStatusOptions = BILLING_PAYMENT_STATUS_OPTIONS;

  constructor(private fb: FormBuilder, private api: AdminBillingApiService) {
    this.form = this.fb.group({
      subscriptionPlan: [1, Validators.required],
      employeeSeatsPurchased: [0, [Validators.required, Validators.min(0)]],
      trainerSeatsPurchased: [0, [Validators.required, Validators.min(0)]],
      pricePerEmployeeSeat: [18000, [Validators.required, Validators.min(0)]],
      pricePerTrainerSeat: [30000, [Validators.required, Validators.min(0)]],
      blogsIncluded: [0, [Validators.min(0)]],
      pricePerBlog: [0, [Validators.min(0)]],
      gstPercentage: [18, [Validators.required, Validators.min(0)]],
      renewalDate: [''],
      discountType: [0],
      discountValue: [0, Validators.min(0)],
      customAnnualOverride: [null as number | null],
      allowOverage: [false],
      overagePricePerSeat: [20000],
      paymentStatus: [1]
    });
    this.form.valueChanges.subscribe(() => this.recalcPreview());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tenant'] && this.tenant) {
      const t = this.tenant;
      const renewal = t.renewalDate ? t.renewalDate.toString().substring(0, 10) : '';
      this.form.patchValue({
        subscriptionPlan: t.subscriptionPlanId ?? 1,
        employeeSeatsPurchased: t.employeeSeats ?? 0,
        trainerSeatsPurchased: t.trainerSeats ?? 0,
        pricePerEmployeeSeat: t.pricePerEmployeeSeat ?? 18000,
        pricePerTrainerSeat: t.pricePerTrainerSeat ?? 30000,
        blogsIncluded: t.blogsIncluded ?? 0,
        pricePerBlog: t.pricePerBlog ?? 0,
        gstPercentage: t.gstPercentage ?? 18,
        renewalDate: renewal,
        discountType: t.discountType ?? 0,
        discountValue: t.discountValue ?? 0,
        customAnnualOverride: t.customAnnualOverride ?? null,
        allowOverage: t.allowOverage ?? false,
        overagePricePerSeat: t.overagePricePerSeat ?? 20000,
        paymentStatus: t.paymentStatusId ?? 1
      }, { emitEvent: false });
      this.recalcPreview();
    }
  }

  recalcPreview(): void {
    const v = this.form.getRawValue();
    const emp = (v.employeeSeatsPurchased || 0) * (v.pricePerEmployeeSeat || 0);
    const tr = (v.trainerSeatsPurchased || 0) * (v.pricePerTrainerSeat || 0);
    const blogsIncluded = v.blogsIncluded ?? 0;
    const blogsUsed = this.tenant?.blogsUsed ?? 0;
    const pricePerBlog = v.pricePerBlog || 0;
    const blogsPurchased = blogsIncluded * pricePerBlog;
    const billableBlogs = Math.max(0, blogsUsed - blogsIncluded);
    const blogsOver = billableBlogs * pricePerBlog;
    const blogs = blogsPurchased + blogsOver;
    let subtotal = emp + tr + blogs;
    let discount = 0;
    const dtype = Number(v.discountType);
    if (dtype === 3 && v.customAnnualOverride > 0) {
      discount = Math.max(0, subtotal - Number(v.customAnnualOverride));
      subtotal = Number(v.customAnnualOverride);
    } else if (dtype === 1 && v.discountValue > 0) {
      discount = subtotal * Number(v.discountValue) / 100;
    } else if (dtype === 2 && v.discountValue > 0) {
      discount = Math.min(subtotal, Number(v.discountValue));
    }
    const after = subtotal - discount;
    const tax = after * (Number(v.gstPercentage) || 0) / 100;
    this.previewSubtotal = emp + tr + blogs;
    this.previewDiscount = discount;
    this.previewTax = tax;
    this.previewTotal = after + tax;
  }

  close(): void {
    this.closed.emit();
  }

  save(): void {
    if (!this.tenant || this.form.invalid) return;
    this.saving = true;
    this.error = '';
    const v = this.form.getRawValue();
    const body: AdminUpdateBillingBody = {
      subscriptionPlan: v.subscriptionPlan,
      employeeSeatsPurchased: v.employeeSeatsPurchased,
      trainerSeatsPurchased: v.trainerSeatsPurchased,
      pricePerEmployeeSeat: v.pricePerEmployeeSeat,
      pricePerTrainerSeat: v.pricePerTrainerSeat,
      blogsIncluded: v.blogsIncluded,
      pricePerBlog: v.pricePerBlog,
      gstPercentage: v.gstPercentage,
      renewalDate: v.renewalDate || undefined,
      discountType: v.discountType,
      discountValue: v.discountValue,
      customAnnualOverride: v.customAnnualOverride ?? undefined,
      allowOverage: v.allowOverage,
      overagePricePerSeat: v.overagePricePerSeat,
      paymentStatus: v.paymentStatus
    };
    this.api.updateCompany(this.tenant.companyAdminUserId, body).subscribe({
      next: (row) => {
        this.saving = false;
        this.saved.emit(row);
        this.close();
      },
      error: (err) => {
        this.saving = false;
        this.error = err?.error?.message || 'Could not save pricing.';
      }
    });
  }

  formatInr(v: number): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v ?? 0);
  }
}
