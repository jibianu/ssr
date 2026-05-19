import { Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { first } from 'rxjs/operators';
import { AuthenticationService } from '../../auth/auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { jsonProp } from 'src/app/core/api-json.util';
import { Role } from 'src/app/shared/models/role';

@Component({
  selector: 'app-user-form-dialog',
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.scss'],
  standalone: false
})
export class UserFormDialogComponent implements OnInit {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() userId: string | null = null;

  private readonly fb = inject(FormBuilder);

  loading = false;
  saving = false;
  /** Company portal SSO with “disable OTP” uses DB-only invite (no password). */
  ssoInviteMode = false;
  readonly studentRoleId = Role.Student;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    email: [{ value: '', disabled: false }, [Validators.required, Validators.email]],
    phone: [''],
    department: [''],
    designation: [''],
    employeeCode: [''],
    roleId: [this.studentRoleId, [Validators.required]],
    password: [''],
    isActive: [true]
  });

  constructor(
    public activeModal: NgbActiveModal,
    private readonly auth: AuthenticationService,
    private readonly toaster: ToasterService
  ) {}

  ngOnInit(): void {
    if (this.mode === 'edit' && this.userId) {
      this.loading = true;
      this.form.get('email')?.disable();
      this.form.get('password')?.clearValidators();
      this.form.get('password')?.updateValueAndValidity();
      this.auth
        .getCompanyUser(this.userId)
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
              employeeCode: jsonProp<string>(r, 'EmployeeCode', 'employeeCode') ?? '',
              roleId: Number(jsonProp(r, 'RoleId', 'roleId') ?? this.studentRoleId),
              isActive: jsonProp<boolean>(r, 'IsActive', 'isActive') !== false
            });
            this.loading = false;
          },
          error: () => {
            this.loading = false;
            this.toaster.showError('Could not load user.');
            this.activeModal.dismiss();
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
        employeeCode: v.employeeCode || null,
        roleId: this.studentRoleId,
        password: this.ssoInviteMode ? null : v.password,
        isActive: v.isActive
      };
      const req = this.ssoInviteMode
        ? this.auth.inviteCompanyUser(body)
        : this.auth.createCompanyUser(body);
      req.pipe(first()).subscribe({
          next: (res) => {
            this.saving = false;
            if (this.ssoInviteMode) {
              const rec = res as Record<string, unknown>;
              const portal = String(jsonProp(rec, 'PortalUrl', 'portalUrl') ?? '');
              const msg = String(jsonProp(rec, 'Message', 'message') ?? '');
              this.toaster.showSuccess(portal ? `Invited. Portal: ${portal}` : (msg || 'User invited.'));
            } else {
              this.toaster.showSuccess('User created.');
            }
            this.activeModal.close('saved');
          },
          error: (err) => {
            this.saving = false;
            const m = err?.error?.messages?.[0] ?? err?.error?.Messages?.[0] ?? err?.message ?? 'Save failed.';
            this.toaster.showError(m);
          }
        });
    } else if (this.userId) {
      const body: Record<string, unknown> = {
        firstName: v.firstName,
        lastName: v.lastName,
        phone: v.phone || null,
        department: v.department || null,
        designation: v.designation || null,
        employeeCode: v.employeeCode || null,
        roleId: this.studentRoleId,
        isActive: v.isActive
      };
      if (v.password && String(v.password).length >= 6) {
        body['newPassword'] = v.password;
      }
      this.auth
        .updateCompanyUser(this.userId, body)
        .pipe(first())
        .subscribe({
          next: () => {
            this.saving = false;
            this.toaster.showSuccess('User updated.');
            this.activeModal.close('saved');
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
