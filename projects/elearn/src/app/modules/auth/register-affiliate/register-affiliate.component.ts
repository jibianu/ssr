import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { AuthenticationService } from '../auth.service';

@Component({
  selector: 'app-register-affiliate',
  templateUrl: './register-affiliate.component.html',
  styleUrls: ['./register-affiliate.component.scss'],
  standalone: false
})
export class RegisterAffiliateComponent {
  email = '';
  password = '';
  submitting = false;
  errorMessage = '';

  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private toaster: ToasterService
  ) {}

  private usernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') return email || '';
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at).trim() : email.trim();
  }

  register(): void {
    this.errorMessage = '';
    if (!this.email?.trim() || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }
    this.submitting = true;
    const defaultName = this.usernameFromEmail(this.email) || this.email;
    const request = {
      // Backend requires UserName to be an email for affiliate signup.
      FirstName: defaultName,
      LastName: defaultName,
      UserName: this.email,
      Email: this.email,
      Password: this.password
    };
    this.authenticationService.registerAffiliate(request).pipe(first()).subscribe({
      next: () => {
        this.submitting = false;
        this.router.navigate(['/verification'], { queryParams: { code: btoa(this.email) } });
      },
      error: (err) => {
        this.submitting = false;
        const msg = err?.error?.message ?? err?.message ?? '';
        const isAlreadyExists =
          err?.status === 409 ||
          /already exists|user already exist|(user|username|email).*exists/i.test(msg);
        const displayMsg = isAlreadyExists
          ? 'User already exists. Please log in.'
          : (msg || 'Registration failed. Please try again.');
        this.errorMessage = displayMsg;
        if (isAlreadyExists) {
          this.toaster.showError(displayMsg);
          this.router.navigate(['/login']);
        }
      }
    });
  }
}
