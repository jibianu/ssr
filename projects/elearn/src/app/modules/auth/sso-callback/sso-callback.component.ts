import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { AuthenticationService, getLandingRoute } from '../auth.service';
import { AdminAppService } from 'src/app/modules/adminapp/adminapp.service';
import { tryRedirectToCompanyPortalAfterLogin } from 'src/app/core/helpers/company-portal-redirect.helper';

@Component({
  selector: 'app-sso-callback',
  templateUrl: './sso-callback.component.html',
  styleUrls: ['./sso-callback.component.scss'],
  standalone: false
})
export class SsoCallbackComponent implements OnInit {
  error: string | null = null;
  loading = true;
  private started = false;

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
    if (!code || this.started) {
      if (!code) {
        this.error = 'No authorization code received.';
        this.loading = false;
      }
      return;
    }
    this.started = true;

    let subdomain = '';
    try {
      subdomain = (sessionStorage.getItem('companySsoSubdomain') ?? '').trim();
    } catch (_) {}
    if (!subdomain) {
      this.error = 'Missing tenant session. Open the login page from your company portal and try again.';
      this.loading = false;
      return;
    }

    const redirectUri = `${window.location.origin}/sso-callback`.replace(/\/+$/, '');

    this.authService.completeCompanySsoCallback({ subdomain, code, redirectUri }).subscribe({
      next: (res) => {
        const isSuccess = res?.isSuccess ?? res?.IsSuccess;
        const tokenValue = res?.token ?? res?.Token;
        if (!isSuccess || !tokenValue) {
          const msg = res?.message ?? res?.Message ?? 'Company sign-in failed.';
          this.error = msg;
          this.loading = false;
          return;
        }
        this.authService.getUserInfo().subscribe({
          next: () => {
            this.authService.postLogin().subscribe({
              next: (pl) => {
                if (!pl.isValidUser) {
                  this.error = 'User role is not configured. Please contact administrator.';
                  this.loading = false;
                  return;
                }
                let stateRedirect = '';
                try {
                  stateRedirect = (sessionStorage.getItem('companySsoReturnState') ?? '').trim();
                  sessionStorage.removeItem('companySsoReturnState');
                  sessionStorage.removeItem('companySsoSubdomain');
                } catch (_) {}
                if (!stateRedirect) {
                  try {
                    stateRedirect = (localStorage.getItem('returnUrl') ?? '').trim();
                    if (stateRedirect) localStorage.removeItem('returnUrl');
                  } catch (_) {}
                }
                if (stateRedirect && (stateRedirect.startsWith('/') || stateRedirect.startsWith('http'))) {
                  const courseMatch = stateRedirect.match(/^\/app\/student\/course\/([^/?#]+)/);
                  if (courseMatch) {
                    const courseId = courseMatch[1];
                    this.adminAppService.startPurchase(courseId).pipe(first()).subscribe({
                      next: (r: any) => {
                        const redirectUrl = (r?.redirectUrl ?? '').toString().trim();
                        if (redirectUrl) {
                          if (redirectUrl.startsWith('http')) {
                            window.location.href = redirectUrl;
                          } else {
                            this.router.navigateByUrl(redirectUrl);
                          }
                        } else {
                          this.router.navigateByUrl(stateRedirect);
                        }
                      },
                      error: () => this.router.navigateByUrl(stateRedirect)
                    });
                    return;
                  }
                  if (stateRedirect.startsWith('http')) {
                    window.location.href = stateRedirect;
                  } else {
                    this.router.navigateByUrl(stateRedirect);
                  }
                  return;
                }
                if (tryRedirectToCompanyPortalAfterLogin(pl, this.authService.currentUser(), stateRedirect)) {
                  return;
                }
                const route = getLandingRoute(pl);
                if (route) {
                  this.router.navigate([route]);
                } else {
                  this.error = 'User role is not configured.';
                  this.loading = false;
                }
              },
              error: () => {
                this.error = 'Could not complete sign-in.';
                this.loading = false;
              }
            });
          },
          error: () => {
            this.error = 'Could not load user profile.';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        const msgs = err?.error?.messages;
        this.error = Array.isArray(msgs) ? msgs[0] : err?.error?.message ?? err?.message ?? 'Company sign-in failed.';
        this.loading = false;
      }
    });
  }
}
