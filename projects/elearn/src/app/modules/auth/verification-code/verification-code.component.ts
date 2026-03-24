import { ActivatedRoute, Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';

@Component({
    selector: 'app-verification-code',
    templateUrl: './verification-code.component.html',
    styleUrls: ['./verification-code.component.scss'],
    standalone: false
})
export class VerificationCodeComponent implements OnInit {
  code = '';
  email = '';
  user: any;
  data: any;
  verifying = false;
  /** Logo URL from environment; otherwise local asset (match login page). */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private authenticationService: AuthenticationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe(res => {
      if (res['code']) {
        try {
          this.email = atob(res['code']);
        } catch (_) {
          this.email = '';
        }
      }
    });
  }

  ngOnInit(): void {}

  verifyAccount() {
    if (!this.code?.trim() || !this.email) return;
    this.verifying = true;
    const obj = { email: this.email, ConfirmationCode: this.code.trim() };
    this.authenticationService.confirmation(obj).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => { this.verifying = false; }
    });
  }

  resend() {
    if (!this.email) return;
    this.authenticationService.ResendConformationCode({ email: this.email }).subscribe({
      next: () => {},
      error: () => {}
    });
  }
}
