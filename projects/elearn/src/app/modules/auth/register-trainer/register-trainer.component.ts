import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { getDefaultLogoUrl } from 'src/app/core/logo-url.util';
import { AuthenticationService } from '../auth.service';
import { ToasterService } from 'src/app/shared/component/toaster/toaster.service';
import { parseRegistrationError } from '../auth-error.util';

@Component({
  selector: 'app-register-trainer',
  templateUrl: './register-trainer.component.html',
  styleUrls: ['./register-trainer.component.scss'],
  standalone: false
})
export class RegisterTrainerComponent implements OnInit {
  email = '';
  password = '';
  givenName = '';
  name = '';

  /** Logo URL from environment; same as Login/Register. */
  logoUrl = environment.logoUrl || getDefaultLogoUrl();

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {}

  register(): void {
    try {
      this.registerTrainer();
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  private usernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') return email || '';
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at).trim() : email.trim();
  }

  registerTrainer(): void {
    const email = (this.email || '').trim();
    if (!email || !this.password) {
      this.toaster.showError('Please enter your email and password.');
      return;
    }
    try {
      const defaultUserName = this.usernameFromEmail(email) || email;
      const request = {
        LastName: email,
        FirstName: email,
        UserName: defaultUserName,
        Email: email,
        Password: this.password
      };
      this.authenticationService.registerTrainer(request).pipe(first()).subscribe({
        next: () => {
          this.router.navigate(['/verification'], { queryParams: { code: btoa(email) } });
        },
        error: (err) => {
          const { message, isAlreadyExists } = parseRegistrationError(err);
          if (isAlreadyExists) {
            this.toaster.showError(message || 'An account with this email already exists. Please log in.');
            this.router.navigate(['/login']);
            return;
          }
          // Surface the real reason (weak password, invalid details, server error) instead of failing silently.
          console.error('Trainer registration failed:', err?.status, err?.error ?? err);
          this.toaster.showError(message || 'Registration failed. Please check your details and try again.');
        }
      });
    } catch (error) {
      console.error('error signing up:', error);
      this.toaster.showError('Registration failed. Please try again.');
    }
  }
}
