import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  switchMap,
  tap
} from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AuthenticationService } from '../auth.service';

const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'mail', 'admin', 'cdn', 'static', 'login', 'register',
  'elearn', 'dev', 'test', 'staging', 'prod', 'ftp', 'smtp', 'pop', 'imap',
  'ns1', 'ns2', 'mx', 'support', 'help', 'status', 'blog', 'docs'
]);

function subdomainRulesValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim().toLowerCase();
    if (!raw) {
      return null;
    }
    if (raw.length < 3 || raw.length > 30) {
      return null;
    }
    if (!/^[a-z0-9-]+$/.test(raw)) {
      return { subdomainChars: true };
    }
    if (raw.startsWith('-') || raw.endsWith('-')) {
      return { subdomainHyphenEdges: true };
    }
    if (RESERVED_SUBDOMAINS.has(raw)) {
      return { subdomainReserved: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-register-company',
  templateUrl: './register-company.component.html',
  styleUrls: ['./register-company.component.scss'],
  standalone: false
})
export class RegisterCompanyComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  registerForm: FormGroup;
  loading = false;

  /** null = not checked / skipped; true = available; false = taken or API error */
  subdomainAvailable: boolean | null = null;
  subdomainChecking = false;
  subdomainCheckError = false;

  /** Set when POST /registercompany fails (e.g. 409 duplicate email/username/Cognito). */
  registerError: string | null = null;

  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  readonly portalSuffix = '.oilandgasclub.com';

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authenticationService: AuthenticationService,
    private readonly toaster: ToasterService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      subdomain: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(30),
          Validators.pattern(/^[a-z0-9-]*$/),
          subdomainRulesValidator()
        ]
      ],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    const subCtrl = this.registerForm.get('subdomain')!;

    subCtrl.valueChanges
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((v) => {
          const low = (v ?? '').toString().toLowerCase();
          if ((v ?? '').toString() !== low) {
            subCtrl.setValue(low, { emitEvent: false });
          }
        }),
        debounceTime(500),
        map(() => (subCtrl.value ?? '').toString().trim().toLowerCase()),
        distinctUntilChanged(),
        tap(() => {
          this.subdomainAvailable = null;
          this.subdomainCheckError = false;
        }),
        switchMap((sub): Observable<boolean | null> => {
          if (!sub || subCtrl.invalid) {
            return of(null);
          }
          this.subdomainChecking = true;
          return this.authenticationService.checkCompanySubdomainAvailable(sub).pipe(
            map((res) => res.available),
            catchError(() => {
              this.subdomainCheckError = true;
              return of(false);
            }),
            finalize(() => {
              this.subdomainChecking = false;
            })
          );
        })
      )
      .subscribe((available) => {
        if (available === null) {
          this.subdomainAvailable = null;
          return;
        }
        this.subdomainAvailable = available;
      });
  }

  get canSubmit(): boolean {
    const sub = this.registerForm.get('subdomain');
    return (
      this.registerForm.valid &&
      !this.loading &&
      !this.subdomainChecking &&
      this.subdomainAvailable === true &&
      !(sub?.invalid ?? true)
    );
  }

  register(): void {
    if (!this.canSubmit) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.registerError = null;
    this.loading = true;
    const emailRaw = (this.registerForm.value.email as string).trim();
    const emailNorm = emailRaw.toLowerCase();
    const password = this.registerForm.value.password as string;
    const subdomain = (this.registerForm.value.subdomain as string).trim().toLowerCase();
    /** Full email as Cognito/SQL username avoids collisions with the same local-part on another domain. */
    const request = {
      lastName: emailNorm,
      firstName: emailNorm,
      userName: emailNorm,
      email: emailNorm,
      password,
      subdomain
    };
    this.authenticationService.registerCompany(request).subscribe({
      next: (data) => {
        this.loading = false;
        if (data) {
          const host = environment.companyPortalHost?.trim();
          if (host) {
            const path = environment.companyPortalLoginPath || '/login';
            window.location.href = `https://${subdomain}.${host}${path.startsWith('/') ? path : '/' + path}`;
          } else {
            this.router.navigate(['/verification'], { queryParams: { code: btoa(emailNorm) } });
          }
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        const msg = this.extractRegisterApiMessage(err);
        this.registerError = msg;
        this.toaster.showError(msg);
      }
    });
  }

  /** Parses ErrorResponse from API (PascalCase or camelCase, Messages array or string body). */
  private extractRegisterApiMessage(err: HttpErrorResponse): string {
    const body = err?.error;
    if (body == null || body === '') {
      return err.status === 409
        ? 'This email or account is already registered. Try logging in, or use a different work email.'
        : 'Registration could not be completed. Please try again.';
    }
    if (typeof body === 'string') {
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        return this.joinErrorMessages(parsed) || body;
      } catch {
        return body;
      }
    }
    if (typeof body === 'object') {
      return (
        this.joinErrorMessages(body as Record<string, unknown>) ||
        (err.status === 409
          ? 'This email or account is already registered. Try logging in, or use a different work email.'
          : 'Registration could not be completed. Please try again.')
      );
    }
    return 'Registration could not be completed. Please try again.';
  }

  private joinErrorMessages(body: Record<string, unknown>): string {
    const messages = body['messages'] ?? body['Messages'];
    if (Array.isArray(messages) && messages.length > 0) {
      return messages.map((m) => String(m)).filter(Boolean).join(' ');
    }
    const single = body['message'] ?? body['Message'];
    if (typeof single === 'string' && single.trim()) {
      return single.trim();
    }
    return '';
  }
}
