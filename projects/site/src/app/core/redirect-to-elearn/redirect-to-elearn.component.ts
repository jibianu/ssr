import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { buildElearnAuthUrl } from '../helpers/elearn-auth-url.helper';

/**
 * Redirects to the merged Elearn app (login/auth) so all auth flows use the e-learning app.
 */
@Component({
  selector: 'app-redirect-to-elearn',
  standalone: true,
  template: `<div class="p-4 text-center">Redirecting to login…</div>`,
  styles: [`:host { display: block; }`]
})
export class RedirectToElearnComponent implements OnInit {
  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Canonical URLs: /login, /register (Elearn SPA routes at site root on merged server).
    // Full elearnAppUrl (e.g. http://localhost:4201) → that origin + /login, etc.
    const query = this.route.snapshot.queryParams;
    const returnUrl = query['returnUrl'];
    const queryStr = returnUrl ? `returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const currentPath = (this.route.snapshot.routeConfig?.path || this.route.snapshot.url?.[0]?.path || 'login').toLowerCase();
    // Allow all Elearn auth routes from auth-routing.module.ts
    const allowedAuthRoutes = new Set([
      'login',
      'sso-callback',
      'callback',
      'google-callback',
      'verification',
      'forget-password',
      'change-password',
      'fg-code',
      'register',
      'register-company',
      'register-trainer',
      'register-affiliate',
      'register-management',
      'user-unavailable'
    ]);
    const authPath = allowedAuthRoutes.has(currentPath) ? currentPath : (currentPath.includes('register') ? 'register' : 'login');
    const target = buildElearnAuthUrl(authPath, queryStr);
    window.location.href = target;
  }
}
