import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthenticationService, getLandingRoute } from '../auth.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { environment } from 'src/environments/environment';

/** Normalize redirect_uri to match the value used in the auth URL (no trailing slash). */
function normalizedRedirectUri(): string {
  const raw = (environment.googleRedirectUri || `${window.location.origin}/auth/google-callback`).trim();
  return raw.replace(/\/+$/, '');
}

/**
 * Handles redirect from Google OAuth (response_type=code).
 * Sends code + redirectUri to backend; backend exchanges for id_token, verifies, ensures Cognito user, issues app JWT.
 */
@Component({
  selector: 'app-google-callback',
  templateUrl: './google-callback.component.html',
  styleUrls: ['./google-callback.component.scss'],
  standalone: false
})
export class GoogleCallbackComponent implements OnInit {
  error: string | null = null;
  loading = true;
  private exchangeStarted = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthenticationService,
    private adminAppService: AdminAppService
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
      this.error = 'No authorization code received from Google.';
      this.loading = false;
      return;
    }

    if (this.exchangeStarted) {
      return;
    }
    this.exchangeStarted = true;

    const redirectUri = normalizedRedirectUri();
    const codeToUse = code;

    this.replaceUrlWithoutCode(codeToUse);

    this.authService.googleLogin({ code: codeToUse, redirectUri }).subscribe({
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
                  const stateRedirect = (this.route.snapshot.queryParamMap.get('state') ?? '').trim();
                  if (stateRedirect && (stateRedirect.startsWith('/') || stateRedirect.startsWith('http'))) {
                    const courseMatch = stateRedirect.match(/^\/app\/student\/course\/([^/?#]+)/);
                    if (courseMatch) {
                      const courseId = courseMatch[1];
                      this.adminAppService.startPurchase(courseId).pipe(first()).subscribe({
                        next: (res: any) => {
                          const redirectUrl = (res?.redirectUrl ?? '').toString().trim();
                          if (redirectUrl) {
                            if (redirectUrl.startsWith('http')) {
                              window.location.href = redirectUrl;
                            } else {
                              this.router.navigateByUrl(redirectUrl);
                            }
                          } else {
                            this.router.navigate(['/checkout', courseId]);
                          }
                        },
                        error: () => this.router.navigate(['/checkout', courseId])
                      });
                    } else {
                      this.authService.getUserInfo().subscribe({
                        next: () => this.router.navigateByUrl(stateRedirect),
                        error: () => this.router.navigateByUrl(stateRedirect)
                      });
                    }
                    return;
                  }
                  const route = getLandingRoute(res);
                  if (route) {
                    this.authService.getUserInfo().subscribe({
                      next: () => this.router.navigate([route]),
                      error: () => this.router.navigate([route])
                    });
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
          this.error = res?.message ?? res?.Message ?? 'Google sign-in failed.';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = err?.error?.messages?.[0] ?? err?.error?.message ?? err?.message ?? 'Google sign-in failed.';
        this.loading = false;
      }
    });
  }

  /** Replace URL without code/state so refresh does not resend the same code (avoids invalid_grant). */
  private replaceUrlWithoutCode(_codeUsed: string): void {
    const state = this.route.snapshot.queryParamMap.get('state');
    const params: Record<string, string> = {};
    if (state) params['state'] = state;
    this.router.navigate(['/auth', 'google-callback'], { queryParams: params, replaceUrl: true });
  }
}
