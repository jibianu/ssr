import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AffiliateService, AffiliateRegisterRequest } from '../affiliate.service';
import { first } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-affiliate-register',
  templateUrl: './affiliate-register.component.html',
  styleUrls: ['./affiliate-register.component.scss'],
  standalone: false
})
export class AffiliateRegisterComponent {
  model: AffiliateRegisterRequest = {
    fullName: '',
    email: '',
    password: '',
    phone: '',
    linkedInProfile: '',
    reason: ''
  };
  errorMessage = '';
  successMessage = '';
  submitting = false;
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private affiliateService: AffiliateService,
    private router: Router
  ) {}

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.model.fullName?.trim() || !this.model.email?.trim() || !this.model.password) {
      this.errorMessage = 'Full Name, Email and Password are required.';
      return;
    }
    if (this.model.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters.';
      return;
    }
    this.submitting = true;
    this.affiliateService
      .register(this.model)
      .pipe(first())
      .subscribe({
        next: (res) => {
          this.submitting = false;
          if (res.success) {
            this.successMessage = res.message || 'Application submitted successfully. You will receive your referral link after approval.';
          } else {
            this.errorMessage = res.message || 'Registration failed.';
          }
        },
        error: (err) => {
          this.submitting = false;
          this.errorMessage = err?.error?.message || err?.message || 'Something went wrong. Please try again.';
        }
      });
  }
}
