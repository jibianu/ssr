import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { AuthenticationService } from '../../modules/auth/auth.service';

/**
 * Guard for /checkout/:courseId.
 * If user is not logged in, redirects to /login?returnUrl=/checkout/{courseId}.
 * After login, user is sent back to checkout.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutGuard {
  constructor(
    private router: Router,
    private auth: AuthenticationService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    this.auth.ensureTokensLoaded();
    if (this.auth.hasValidAccessToken() || this.auth.getIdToken())
      return true;
    const returnUrl = state.url || `/checkout/${route.paramMap.get('courseId') || ''}`;
    return this.router.createUrlTree(['/login'], { queryParams: { returnUrl } });
  }
}
