import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  PayoutApiService,
  TrainerPayoutMethodDto,
  UpsertTrainerPayoutRequest,
  PAYOUT_METHOD,
  PAYOUT_STATUS,
} from '../../../services/payout-api.service';
import { SharedService } from '../../../shared/service/shared-service.service';
import { ToasterService } from '../../../shared/component/toaster/toaster.service';

const METHOD_OPTIONS = [
  { type: PAYOUT_METHOD.BankTransfer, label: 'Bank Transfer (NEFT/IMPS/RTGS)', description: 'Direct bank transfer to your Indian bank account', icon: 'fa-university' },
  { type: PAYOUT_METHOD.UPI, label: 'UPI ID', description: 'Instant transfer via UPI', icon: 'fa-mobile-alt' },
  { type: PAYOUT_METHOD.PayPal, label: 'PayPal', description: 'PayPal account', icon: 'fa-cc-paypal' },
  { type: PAYOUT_METHOD.Payoneer, label: 'Payoneer', description: 'Prepaid MasterCard, Local Bank Transfer', icon: 'fa-credit-card' },
];

@Component({
  selector: 'app-trainer-payout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainer-payout.component.html',
  styleUrls: ['./trainer-payout.component.scss'],
})
export class TrainerPayoutComponent implements OnInit {
  methods: TrainerPayoutMethodDto[] = [];
  methodOptions = METHOD_OPTIONS;
  loading = false;
  error = '';
  showModal = false;
  saving = false;
  selectedMethodType: number | null = null;
  form: UpsertTrainerPayoutRequest = this.emptyForm();
  formError = '';
  private readonly emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  constructor(
    private payoutApi: PayoutApiService,
    private sharedService: SharedService,
    private toaster: ToasterService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.sharedService.certificateName.next('Payout & Tax');
    this.load();
  }

  ngOnDestroy(): void {
    this.sharedService.certificateName.next('');
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.payoutApi.getTrainerPayouts().subscribe({
      next: (list) => {
        this.methods = list || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || err?.message || 'Failed to load payout methods.';
        this.methods = [];
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getMethodByType(type: number): TrainerPayoutMethodDto | undefined {
    return this.methods.find((m) => m.methodType === type);
  }

  /** Only options that are not yet connected — so they appear once (here as "Connect" or in the table as connected). */
  get methodOptionsToConnect(): typeof METHOD_OPTIONS {
    return this.methodOptions.filter((opt) => !this.getMethodByType(opt.type));
  }

  getStatusLabel(status: number): string {
    switch (status) {
      case PAYOUT_STATUS.Pending: return 'Pending';
      case PAYOUT_STATUS.Approved: return 'Approved';
      case PAYOUT_STATUS.Rejected: return 'Rejected';
      default: return 'Not Connected';
    }
  }

  getStatusClass(status: number): string {
    switch (status) {
      case PAYOUT_STATUS.Approved: return 'payout-card__status--approved';
      case PAYOUT_STATUS.Pending: return 'payout-card__status--pending';
      case PAYOUT_STATUS.Rejected: return 'payout-card__status--rejected';
      default: return '';
    }
  }

  openConnect(methodType: number): void {
    this.selectedMethodType = methodType;
    this.formError = '';
    const existing = this.getMethodByType(methodType);
    this.form = {
      methodType,
      accountName: existing?.accountName ?? '',
      accountNumber: '', // never prefill for security
      ifsc: existing?.ifsc ?? '',
      bankName: existing?.bankName ?? '',
      pan: '', // never prefill
      gst: existing?.gst ?? '',
      upiId: '', // never prefill
      email: existing?.email ?? '',
    };
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedMethodType = null;
    this.form = this.emptyForm();
    this.formError = '';
    this.cdr.detectChanges();
  }

  disconnect(m: TrainerPayoutMethodDto): void {
    if (!confirm(`Remove "${m.methodTypeName}" from your payout methods? You can add it again later.`)) return;
    this.payoutApi.deleteTrainerPayout(m.id).subscribe({
      next: () => {
        this.toaster.showSuccess('Payout method removed.');
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        const msg = err?.error?.message || err?.message || 'Failed to remove.';
        this.toaster.showError(typeof msg === 'string' ? msg : 'Failed to remove.');
        this.cdr.detectChanges();
      },
    });
  }

  submit(): void {
    this.formError = '';
    const req = this.form;

    if (req.methodType === PAYOUT_METHOD.BankTransfer) {
      if (!req.accountName?.trim()) {
        this.formError = 'Account holder name is required.';
        this.cdr.detectChanges();
        return;
      }
      if (!req.bankName?.trim()) {
        this.formError = 'Bank name is required.';
        this.cdr.detectChanges();
        return;
      }
      if (!req.accountNumber?.trim()) {
        this.formError = 'Account number is required.';
        this.cdr.detectChanges();
        return;
      }
      if (req.accountNumber.trim().length < 4) {
        this.formError = 'Account number must be at least 4 characters for masking.';
        this.cdr.detectChanges();
        return;
      }
      if (!req.ifsc?.trim()) {
        this.formError = 'IFSC code is required.';
        this.cdr.detectChanges();
        return;
      }
      if (!req.pan?.trim()) {
        this.formError = 'PAN number is required.';
        this.cdr.detectChanges();
        return;
      }
      if (req.pan && req.pan.trim().length !== 10) {
        this.formError = 'PAN must be 10 characters.';
        this.cdr.detectChanges();
        return;
      }
    } else if (req.methodType === PAYOUT_METHOD.UPI) {
      if (!req.upiId?.trim()) {
        this.formError = 'UPI ID is required.';
        this.cdr.detectChanges();
        return;
      }
      if (!req.upiId.trim().includes('@')) {
        this.formError = 'Enter a valid UPI ID (e.g. name@bank).';
        this.cdr.detectChanges();
        return;
      }
    } else if (req.methodType === PAYOUT_METHOD.PayPal || req.methodType === PAYOUT_METHOD.Payoneer) {
      if (!req.email?.trim()) {
        this.formError = 'Email is required for this payout method.';
        this.cdr.detectChanges();
        return;
      }
      if (!this.emailPattern.test(req.email.trim())) {
        this.formError = 'Please enter a valid email address.';
        this.cdr.detectChanges();
        return;
      }
    }

    this.saving = true;
    const obs = this.getMethodByType(req.methodType) ? this.payoutApi.putTrainerPayout(req) : this.payoutApi.postTrainerPayout(req);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.toaster.showSuccess('Payout details saved. Status: Pending approval.');
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.message || err?.message || 'Failed to save.';
        this.formError = typeof msg === 'string' ? msg : 'Failed to save.';
        this.toaster.showError(this.formError);
        this.cdr.detectChanges();
      },
    });
  }

  private emptyForm(): UpsertTrainerPayoutRequest {
    return {
      methodType: 1,
      accountName: '',
      accountNumber: '',
      ifsc: '',
      bankName: '',
      pan: '',
      gst: '',
      upiId: '',
      email: '',
    };
  }
}
