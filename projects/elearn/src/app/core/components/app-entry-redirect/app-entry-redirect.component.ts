import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import {
  AuthenticationService,
  getLandingRoute,
  ROLE_LANDING_ROUTES
} from '../../../modules/auth/auth.service';

/**
 * Resolves bare /app (no role segment) to the correct role home.
 * The /app parent has no layout; only child routes render UI.
 */
@Component({
  selector: 'app-app-entry-redirect',
  template: '',
  standalone: false
})
export class AppEntryRedirectComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly auth: AuthenticationService
  ) {}

  ngOnInit(): void {
    const roleId = this.auth.getRoleId();
    const fromRole = roleId != null ? ROLE_LANDING_ROUTES[roleId] : undefined;
    if (fromRole) {
      this.router.navigateByUrl(fromRole, { replaceUrl: true });
      return;
    }
    this.auth.postLogin().pipe(first()).subscribe((res) => {
      if (!res.isValidUser) {
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }
      const route = getLandingRoute(res);
      if (route) {
        this.router.navigateByUrl(route, { replaceUrl: true });
      } else {
        this.router.navigate(['/'], { replaceUrl: true });
      }
    });
  }
}
