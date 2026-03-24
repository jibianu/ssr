import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthenticationService } from '../auth.service';

@Component({
  selector: 'app-forget-password-verification',
  templateUrl: './forget-password-verification.component.html',
  styleUrls: ['./forget-password-verification.component.scss'],
  standalone: false
})
export class ForgetPasswordVerificationComponent implements OnInit {
  email = '';
  confirmationCode = '';
  password = '';
  confirmPassword = '';
  enable = true;

  /** Logo URL from environment; same as Login/Register. */
  logoUrl = environment.logoUrl || '/assets/img/oilandgas_club.svg';

  constructor(
    private route: ActivatedRoute,
    private authenticationService: AuthenticationService,
    private router: Router
  ) {
    this.route.queryParams.subscribe(res => {
      if (res && res['code']) {
        this.email = atob(res['code']);
      }
    });
  }

  ngOnInit(): void {}

  checklength(): void {
    if (this.confirmationCode && this.confirmationCode.length === 6) {
      this.enable = false;
    }
  }

  forgetConfirm(): void {
    if (this.password === this.confirmPassword) {
      const obj = {
        username: this.email,
        confirmationCode: this.confirmationCode,
        newPassword: this.password
      };
      this.authenticationService.confirmforgot(obj).subscribe({
        next: () => {
          this.router.navigate(['/login']);
        }
      });
    }
  }
}
