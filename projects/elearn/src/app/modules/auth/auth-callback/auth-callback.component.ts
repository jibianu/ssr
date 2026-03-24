import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticationService, getLandingRoute } from '../auth.service';
import { environment } from 'src/environments/environment';

/**
 * Handles redirect from Cognito Hosted UI (Google or other IdP).
 * Exchanges authorization code for app JWT via backend, then redirects to app.
 */
@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.component.html',
  styleUrls: ['./auth-callback.component.scss'],
  standalone: false
})
export class AuthCallbackComponent implements OnInit {
  error: string | null = null;
  loading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const errorParam = this.route.snapshot.queryParamMap.get('error');

    if (errorParam) {
      this.error = this.route.snapshot.queryParamMap.get('error_description') || errorParam;
      this.loading = false;
      return;
    }

    if (!code) {
      this.error = 'No authorization code received from Cognito.';
      this.loading = false;
      return;
    }

    const redirectUri = environment.cognitoRedirectUri || `${window.location.origin}/callback`;

    this.authService.cognitoAuth(code, redirectUri).subscribe({
      next: (res) => {
        const isSuccess = res?.isSuccess ?? res?.IsSuccess;
        const tokenValue = res?.token ?? res?.Token;
        if (isSuccess && tokenValue) {
          this.authService.getUserInfo().subscribe({
            next: () => {
              this.authService.postLogin().subscribe({
                next: (res) => {
                  if (!res.isValidUser) {
                    this.error = 'User role is not configured. Please contact administrator.';
                    this.loading = false;
                    return;
                  }
                  const route = getLandingRoute(res);
                  if (route) {
                    this.router.navigate([route]);
                  } else {
                    this.error = 'User role is not configured. Please contact administrator.';
                    this.loading = false;
                  }
                },
                error: () => {
                  this.error = 'User role is not configured. Please contact administrator.';
                  this.loading = false;
                }
              });
            },
            error: () => {
              this.error = 'Could not load user. Please try again.';
              this.loading = false;
            }
          });
        } else {
          this.error = res?.message ?? res?.Message ?? 'Authentication failed.';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = err?.error?.messages?.[0] ?? err?.error?.message ?? err?.message ?? 'Authentication failed.';
        this.loading = false;
      }
    });
  }
}
