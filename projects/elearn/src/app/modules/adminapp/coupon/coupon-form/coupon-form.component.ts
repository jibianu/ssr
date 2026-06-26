import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CouponApiService, CreateCouponRequest } from 'src/app/services/coupon-api.service';
import { AdminAppService } from '../../adminapp.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-coupon-form',
  templateUrl: './coupon-form.component.html',
  styleUrls: ['./coupon-form.component.scss'],
  standalone: false
})
export class CouponFormComponent implements OnInit {
  form: UntypedFormGroup;
  couponId: string | null = null;
  loading = false;
  saving = false;
  submitted = false;
  events: { id: string; title: string }[] = [];
  courses: { id: string; title: string }[] = [];

  constructor(
    private fb: UntypedFormBuilder,
    private couponApi: CouponApiService,
    private appService: AdminAppService,
    private route: ActivatedRoute,
    private router: Router,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.couponId = this.route.snapshot.paramMap.get('id');
    this.buildForm();
    if (this.couponId) {
      this.loadCoupon(this.couponId);
    } else {
      this.loadLookups();
      this.setCreateDefaults();
    }
  }

  private buildForm(): void {
    this.form = this.fb.group({
      couponName: ['', Validators.required],
      couponCode: ['', [Validators.required, Validators.maxLength(50)]],
      couponType: ['Percentage', Validators.required],
      discountValue: [10, [Validators.required, Validators.min(0.01)]],
      minimumPurchaseAmount: [0, [Validators.min(0)]],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      usageLimit: [0, [Validators.min(0)]],
      applicableType: ['Course', Validators.required],
      status: [true],
      eventIds: [[] as string[]],
      courseIds: [[] as string[]]
    });

    this.form.get('applicableType')?.valueChanges.subscribe((type) => {
      if (type === 'Course') {
        this.form.patchValue({ eventIds: [] }, { emitEvent: false });
      } else if (type === 'Event') {
        this.form.patchValue({ courseIds: [] }, { emitEvent: false });
      }
    });
  }

  private setCreateDefaults(): void {
    const today = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30);
    this.form.patchValue({
      startDate: this.formatDateInput(today),
      endDate: this.formatDateInput(end)
    });
  }

  private formatDateInput(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  get isPercentage(): boolean {
    return this.form?.get('couponType')?.value === 'Percentage';
  }

  get discountPreview(): string | null {
    if (!this.isPercentage) return null;
    const pct = Number(this.form?.get('discountValue')?.value);
    if (!pct || pct <= 0) return null;
    const samplePrice = 12000;
    const discount = Math.round(samplePrice * pct) / 100;
    const finalPrice = Math.max(0, samplePrice - discount);
    return `Example: ${pct}% off ₹${samplePrice.toLocaleString('en-IN')} → customer pays ₹${finalPrice.toLocaleString('en-IN')}`;
  }

  get f() { return this.form.controls; }

  compareIds = (a: string, b: string): boolean => String(a) === String(b);

  private isPublishedEvent(e: any): boolean {
    return !!(e?.isPublished ?? e?.IsPublished);
  }

  private isPublishedCourse(c: any): boolean {
    if (c?.isPublished === true || c?.IsPublished === true) return true;
    const status = Number(c?.status ?? c?.Status ?? -1);
    return status === 2;
  }

  private loadLookups(selectedEventIds: string[] = [], selectedCourseIds: string[] = []): void {
    const keepEventIds = new Set(selectedEventIds.filter(Boolean));
    const keepCourseIds = new Set(selectedCourseIds.filter(Boolean));

    this.appService.getEventsAll().subscribe({
      next: (list) => {
        this.events = (list || [])
          .filter((e: any) => {
            const id = String(e.id ?? e.Id ?? '');
            return id && (this.isPublishedEvent(e) || keepEventIds.has(id));
          })
          .map((e: any) => ({
            id: String(e.id ?? e.Id ?? ''),
            title: e.title ?? e.Title ?? 'Untitled event'
          }))
          .sort((a, b) => a.title.localeCompare(b.title));
      }
    });

    this.loadPublishedCourses(keepCourseIds);
  }

  private loadPublishedCourses(keepCourseIds: Set<string>): void {
    const pageSize = 100;
    let pageNumber = 1;
    const all: any[] = [];

    const fetchPage = (): void => {
      this.appService.getCourses({ pageNumber, pageSize }, true).subscribe({
        next: (res: any) => {
          const list = res?.results ?? [];
          if (Array.isArray(list)) {
            all.push(...list);
          }
          const total = Number(res?.totalNumberOfRecords ?? all.length);
          if (pageNumber * pageSize < total) {
            pageNumber += 1;
            fetchPage();
            return;
          }
          this.courses = all
            .filter((c: any) => {
              const id = String(c.id ?? c.Id ?? '');
              return id && (this.isPublishedCourse(c) || keepCourseIds.has(id));
            })
            .map((c: any) => ({
              id: String(c.id ?? c.Id ?? ''),
              title: c.title ?? c.Title ?? 'Untitled course'
            }))
            .sort((a, b) => a.title.localeCompare(b.title));
        },
        error: () => {
          this.toaster.showError('Failed to load courses.');
        }
      });
    };

    fetchPage();
  }

  private loadCoupon(id: string): void {
    this.loading = true;
    this.couponApi.getCouponById(id).subscribe({
      next: (c: any) => {
        const start = c.startDate ?? c.StartDate;
        const end = c.endDate ?? c.EndDate;
        const eventIds = (c.eventIds ?? c.EventIds ?? []).map((x: any) => String(x));
        const courseIds = (c.courseIds ?? c.CourseIds ?? []).map((x: any) => String(x));

        this.form.patchValue({
          couponName: c.couponName ?? c.CouponName,
          couponCode: c.couponCode ?? c.CouponCode,
          couponType: c.couponType ?? c.CouponType ?? 'Percentage',
          discountValue: c.discountValue ?? c.DiscountValue,
          minimumPurchaseAmount: c.minimumPurchaseAmount ?? c.MinimumPurchaseAmount ?? 0,
          startDate: start ? String(start).slice(0, 10) : '',
          endDate: end ? String(end).slice(0, 10) : '',
          usageLimit: c.usageLimit ?? c.UsageLimit ?? 0,
          applicableType: c.applicableType ?? c.ApplicableType ?? 'Both',
          status: !!(c.status ?? c.Status),
          eventIds,
          courseIds
        });

        this.loadLookups(eventIds, courseIds);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toaster.showError('Failed to load coupon.');
        this.router.navigate(['/app/admin/coupons']);
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.toaster.showError(this.getFormValidationMessage());
      return;
    }

    const v = this.form.value;
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      this.toaster.showError('Expiry date must be on or after start date.');
      return;
    }
    if (v.couponType === 'Percentage' && Number(v.discountValue) > 100) {
      this.toaster.showError('Percentage discount cannot exceed 100%.');
      return;
    }
    if ((v.applicableType === 'Event' || v.applicableType === 'Both') && !(v.eventIds?.length)) {
      this.toaster.showError('Select at least one event.');
      return;
    }
    if ((v.applicableType === 'Course' || v.applicableType === 'Both') && !(v.courseIds?.length)) {
      this.toaster.showError('Select at least one course.');
      return;
    }

    const body: CreateCouponRequest = {
      couponName: String(v.couponName).trim(),
      couponCode: String(v.couponCode).trim().toUpperCase(),
      couponType: v.couponType,
      discountValue: Number(v.discountValue),
      minimumPurchaseAmount: Number(v.minimumPurchaseAmount) || 0,
      startDate: this.toUtcStartOfDay(v.startDate),
      endDate: this.toUtcEndOfDay(v.endDate),
      usageLimit: Number(v.usageLimit) || 0,
      applicableType: v.applicableType,
      status: !!v.status,
      eventIds: v.eventIds || [],
      courseIds: v.courseIds || []
    };

    this.saving = true;
    const req = this.couponId
      ? this.couponApi.updateCoupon(this.couponId, body)
      : this.couponApi.createCoupon(body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.toaster.showSuccess(this.couponId ? 'Coupon updated.' : 'Coupon created.');
        this.router.navigate(['/app/admin/coupons']);
      },
      error: (err) => {
        this.saving = false;
        this.toaster.showError(this.extractErrorMessage(err, 'Failed to save coupon.'));
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/app/admin/coupons']);
  }

  private toUtcStartOfDay(dateStr: string): string {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0)).toISOString();
  }

  private toUtcEndOfDay(dateStr: string): string {
    const [y, m, d] = String(dateStr).split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999)).toISOString();
  }

  private getFormValidationMessage(): string {
    const f = this.form.controls;
    if (f.couponName?.errors?.required) return 'Coupon name is required.';
    if (f.couponCode?.errors?.required) return 'Coupon code is required.';
    if (f.discountValue?.errors?.min || f.discountValue?.errors?.required) {
      return 'Discount value must be greater than 0.';
    }
    if (f.startDate?.errors?.required) return 'Start date is required.';
    if (f.endDate?.errors?.required) return 'End date is required.';
    return 'Please fill in all required fields.';
  }

  private extractErrorMessage(err: any, fallback: string): string {
    const body = err?.error;
    if (typeof body === 'string' && body.trim()) return body;
    if (body?.message) return String(body.message);
    if (body?.title) return String(body.title);
    return fallback;
  }
}
