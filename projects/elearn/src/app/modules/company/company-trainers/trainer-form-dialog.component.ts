import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';
import { AuthenticationService } from '../../auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { jsonProp } from 'src/app/core/api-json.util';

@Component({
  selector: 'app-trainer-form-dialog',
  templateUrl: './trainer-form-dialog.component.html',
  styleUrls: ['./trainer-form-dialog.component.scss'],
  standalone: false
})
export class TrainerFormDialogComponent implements OnInit {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() trainerId: string | null = null;
  @Output() readonly dismissed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  loading = false;
  saving = false;
  ssoInviteMode = false;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
    phone: [''],
    department: [''],
    designation: [''],
    expertise: [''],
    bio: [''],
    profilePictureUrl: [''],
    password: [''],
    isActive: [true]
  });

  constructor(
    private readonly auth: AuthenticationService,
    private readonly toaster: ToasterService
  ) {}

  cancel(): void {
    this.dismissed.emit();
  }

  ngOnInit(): void {
    if (this.mode === 'edit' && this.trainerId) {
      this.loading = true;
      this.form.get('email')?.disable();
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.auth
        .getCompanyTrainer(this.trainerId)
        .pipe(first())
        .subscribe({
          next: (raw) => {
            const r = raw as Record<string, unknown>;
            this.form.patchValue({
              firstName: jsonProp<string>(r, 'FirstName', 'firstName') ?? '',
              lastName: jsonProp<string>(r, 'LastName', 'lastName') ?? '',
              email: jsonProp<string>(r, 'Email', 'email') ?? '',
              phone: jsonProp<string>(r, 'Phone', 'phone') ?? '',
              department: jsonProp<string>(r, 'Department', 'department') ?? '',
              designation: jsonProp<string>(r, 'Designation', 'designation') ?? '',
              expertise: jsonProp<string>(r, 'Expertise', 'expertise') ?? '',
              bio: jsonProp<string>(r, 'Bio', 'bio') ?? '',
              profilePictureUrl: jsonProp<string>(r, 'ProfilePictureUrl', 'profilePictureUrl') ?? '',
              isActive: jsonProp<boolean>(r, 'IsActive', 'isActive') !== false
            });
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.toaster.showError('Could not load trainer.');
            this.dismissed.emit();
          }
        });
    } else {
      this.loading = true;
      this.auth
        .getCompanySsoSettings()
        .pipe(first())
        .subscribe({
          next: (raw) => {
            const r = raw as Record<string, unknown>;
            const enabled = !!jsonProp<boolean>(r, 'Enabled', 'enabled');
            const disOtp = !!jsonProp<boolean>(r, 'DisableOtpVerification', 'disableOtpVerification');
            this.ssoInviteMode = enabled && disOtp;
            if (this.ssoInviteMode) {
              this.form.get('password')?.clearValidators();
              this.form.get('password')?.updateValueAndValidity();
              this.form.patchValue({ isActive: false });
              this.form.get('isActive')?.disable();
            } else {
              this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
              this.form.get('password')?.updateValueAndValidity();
            }
            this.loading = false;
          },
          error: () => {
            this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
            this.form.get('password')?.updateValueAndValidity();
            this.loading = false;
          }
        });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const v = this.form.getRawValue();
    if (this.mode === 'create') {
      const body = {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        phone: v.phone || null,
        department: v.department || null,
        designation: v.designation || null,
        expertise: v.expertise || null,
        bio: v.bio || null,
        profilePictureUrl: v.profilePictureUrl || null,
        password: this.ssoInviteMode ? null : v.password,
        isActive: v.isActive
      };
      const req = this.ssoInviteMode ? this.auth.inviteCompanyTrainer(body) : this.auth.createCompanyTrainer(body);
      req.pipe(first()).subscribe({
        next: (res) => {
          this.saving = false;
          if (this.ssoInviteMode) {
            const rec = res as Record<string, unknown>;
            const portal = String(jsonProp(rec, 'PortalUrl', 'portalUrl') ?? '');
            const msg = String(jsonProp(rec, 'Message', 'message') ?? '');
            this.toaster.showSuccess(portal ? `Invited. Portal: ${portal}` : (msg || 'Trainer invited.'));
          } else {
            this.toaster.showSuccess('Trainer created.');
          }
          this.saved.emit();
        },
        error: (err) => {
          this.saving = false;
          const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? err?.message ?? 'Save failed.';
          this.toaster.showError(m);
        }
      });
    } else if (this.trainerId) {
      const body = {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone || null,
        department: v.department || null,
        designation: v.designation || null,
        expertise: v.expertise || null,
        bio: v.bio || null,
        profilePictureUrl: v.profilePictureUrl || null,
        isActive: v.isActive,
        newPassword: v.password?.trim() ? v.password : null
      };
      this.auth
        .updateCompanyTrainer(this.trainerId, body)
        .pipe(first())
        .subscribe({
          next: () => {
            this.saving = false;
            this.toaster.showSuccess('Trainer updated.');
            this.saved.emit();
          },
          error: (err) => {
            this.saving = false;
            const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? err?.message ?? 'Save failed.';
            this.toaster.showError(m);
          }
        });
    }
  }
}
