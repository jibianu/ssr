import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';

@Component({
  selector: 'app-forget-password',
  templateUrl: './forget-password.component.html',
  styleUrls: ['./forget-password.component.scss'],
  standalone: false
})
export class ForgetPasswordComponent implements OnInit {
  email = '';
  errorMessage = '';
  /** True while the forgot-password API call is in progress; disables submit to prevent rate limiting. */
  submitting = false;

  /** Logo URL from environment; same as Login/Register. */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {}

  forget(): void {
    this.errorMessage = '';
    if (!this.email?.trim()) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }
    this.submitting = true;
    this.authenticationService.forgot({ email: this.email }).subscribe({
      next: (res: any) => {
        this.submitting = false;
        if (res?.success === true) {
          this.router.navigate(['auth', 'fg-code'], { queryParams: { code: btoa(this.email) } });
        } else {
          this.errorMessage = res?.message ?? 'Could not send reset code.';
        }
      },
      error: (err) => {
        this.submitting = false;
        const body = err?.error;
        const msg = body?.message ?? err?.message ?? 'Could not send reset code. Please try again.';
        const isFederated = body?.isFederatedUser === true || /google|sign in with google/i.test(msg);
        if (isFederated) {
          this.toaster.showError('You signed up using Google. Please log in with Google.');
        }
        this.errorMessage = msg;
      }
    });
  }
}
