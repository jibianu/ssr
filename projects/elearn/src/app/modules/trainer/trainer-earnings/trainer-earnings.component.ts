import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RevenueApiService,
  InstructorEarningsSummary,
  InstructorCouponDto,
  CreateInstructorCouponRequest,
} from '../../../services/revenue-api.service';
import { AdminAppService } from '../../adminapp/adminapp.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';

@Component({
  selector: 'app-trainer-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-earnings.component.html',
  styleUrls: ['./trainer-earnings.component.scss'],
})
export class TrainerEarningsComponent implements OnInit {
  fromDate = '';
  toDate = '';
  summary: InstructorEarningsSummary | null = null;
  coupons: InstructorCouponDto[] = [];
  loadingSummary = false;
  loadingCoupons = false;
  errorSummary = '';
  errorCoupons = '';
  showCreateForm = false;
  creating = false;
  /** Trainer's courses for coupon course dropdown and name resolution */
  trainerCourses: { id: string; title: string }[] = [];
  loadingCourses = false;
  createForm: CreateInstructorCouponRequest = {
    code: '',
    discountType: 'Percent',
    discountValue: 0,
    courseId: '',
    validFrom: '',
    validTo: '',
  };

  constructor(
    private revenueApi: RevenueApiService,
    private appService: AdminAppService,
    private sharedService: SharedService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Earnings');
    const to = new Date();
    const from = new Date(to);
    from.setDate(from.getDate() - 29);
    this.fromDate = this.formatDate(from);
    this.toDate = this.formatDate(to);
    this.loadSummary();
    this.loadCoupons();
    this.loadTrainerCourses();
  }

  /** Load trainer's courses for coupon course dropdown and table course names */
  loadTrainerCourses(): void {
    this.loadingCourses = true;
    this.appService.getCourses({ pageNumber: 1, pageSize: 200 }).subscribe({
      next: (res) => {
        const list = res?.results ?? [];
        this.trainerCourses = list.map((c: any) => ({ id: c?.id ?? '', title: c?.title ?? c?.name ?? 'Course' }));
        this.loadingCourses = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.trainerCourses = [];
        this.loadingCourses = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Resolve course label for display (table and dropdown) */
  courseLabel(courseId: string | undefined): string {
    if (!courseId?.trim()) return 'All courses';
    const c = this.trainerCourses.find((x) => x.id === courseId);
    return c?.title ?? courseId;
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }

  applyRange(): void {
    this.loadSummary();
  }

  loadSummary(): void {
    this.loadingSummary = true;
    this.errorSummary = '';
    this.revenueApi.getInstructorEarningsSummary(this.fromDate, this.toDate).subscribe({
      next: (data) => {
        this.summary = data;
        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorSummary = err?.error?.message || err?.message || 'Failed to load earnings.';
        this.summary = null;
        this.loadingSummary = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCoupons(): void {
    this.loadingCoupons = true;
    this.errorCoupons = '';
    this.revenueApi.getInstructorCoupons().subscribe({
      next: (list) => {
        this.coupons = list || [];
        this.loadingCoupons = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorCoupons = err?.error?.message || err?.message || 'Failed to load coupons.';
        this.coupons = [];
        this.loadingCoupons = false;
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    const today = this.formatDate(new Date());
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    this.createForm = {
      code: '',
      discountType: 'Percent',
      discountValue: 10,
      courseId: '',
      validFrom: today,
      validTo: this.formatDate(nextMonth),
    };
    this.showCreateForm = true;
    this.cdr.detectChanges();
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.cdr.detectChanges();
  }

  submitCreate(): void {
    if (!this.createForm.code?.trim()) {
      this.toaster.showError('Code is required.');
      return;
    }
    this.creating = true;
    const body: CreateInstructorCouponRequest = {
      code: this.createForm.code.trim(),
      discountType: this.createForm.discountType || 'Percent',
      discountValue: this.createForm.discountValue ?? 0,
      courseId: this.createForm.courseId?.trim() || undefined,
      validFrom: this.createForm.validFrom,
      validTo: this.createForm.validTo,
    };
    this.revenueApi.createInstructorCoupon(body).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateForm = false;
        this.toaster.showSuccess('Coupon created.');
        this.loadCoupons();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.creating = false;
        this.toaster.showError(err?.error?.message || err?.message || 'Failed to create coupon.');
        this.cdr.detectChanges();
      },
    });
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  trackByCouponId(_index: number, c: InstructorCouponDto): string {
    return c?.id ?? '';
  }
}
