import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';

@Component({
  selector: 'app-register-management',
  templateUrl: './register-management.component.html',
  styleUrls: ['./register-management.component.scss'],
  standalone: false
})
export class RegisterManagementComponent implements OnInit {
  email = '';
  password = '';
  givenName = '';
  name = '';

  /** Logo URL from environment; same as Login/Register. */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  /** Popup when user already exists */
  showAlert = false;
  alertMessage = '';

  constructor(
    private router: Router,
    private authenticationService: AuthenticationService
  ) {}

  ngOnInit(): void {}

  register(): void {
    try {
      this.registerManagement();
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  private usernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') return email || '';
    const at = email.indexOf('@');
    return at > 0 ? email.slice(0, at).trim() : email.trim();
  }

  registerManagement(): void {
    try {
      const defaultUserName = this.usernameFromEmail(this.email) || this.email;
      const request = {
        LastName: this.email,
        FirstName: this.email,
        UserName: defaultUserName,
        Email: this.email,
        Password: this.password
      };
      this.authenticationService.registerManagement(request).pipe(first()).subscribe({
        next: (data) => {
          if (data) {
            this.router.navigate(['auth', 'verification'], { queryParams: { code: btoa(this.email) } });
          }
        },
        error: (err) => {
          const msg = err?.error?.message ?? err?.error?.Message ?? err?.error?.Messages?.[0] ?? err?.message ?? '';
          const isUserExists = typeof msg === 'string' && msg.toLowerCase().includes('user already exists');
          if (isUserExists) {
            this.alertMessage = 'User already exists. You can log in. If you forgot your password, use the Forgot password link.';
            this.showAlert = true;
          } else {
            console.log('error signing up:', err);
          }
        }
      });
    } catch (error) {
      console.log('error signing up:', error);
    }
  }

  closeAlert(): void {
    this.showAlert = false;
    this.alertMessage = '';
  }

  closeAlertAndGoToLogin(): void {
    this.closeAlert();
    this.router.navigate(['/auth/login']);
  }
}
